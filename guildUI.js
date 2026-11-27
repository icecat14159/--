// guildUI.js - 使用者介面互動與控制

// 側邊欄開關
function toggleSidebar() {  
    const sidebar = document.getElementById("ui-sidebar");
    const toggleBtn = document.getElementById("menu-toggle");
    
    if (sidebar.classList.contains("sidebar-open")) {
        sidebar.classList.remove("sidebar-open");
        sidebar.classList.add("sidebar-closed");
        toggleBtn.innerText = "☰";
    } else {
        sidebar.classList.remove("sidebar-closed");
        sidebar.classList.add("sidebar-open");
        toggleBtn.innerText = "✕";
    }
}

// 側邊欄分頁切換
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(tabName === 'selector' ? '列表' : '統計')) {
            btn.classList.add('active');
        }
    });

    const toolPanel = document.getElementById("tool-panel");
    const selector = document.getElementById("guild-selector");
    const leaderboard = document.getElementById("leaderboard-panel");

    if (tabName === 'selector') {
        toolPanel.style.display = 'block';
        selector.style.display = 'flex';
        leaderboard.style.display = 'none';
    } else {
        toolPanel.style.display = 'none';
        selector.style.display = 'none';
        leaderboard.style.display = 'flex';
        updateSimTimeUI();
        updateLeaderboard(); // 切換時即時刷新統計與計分
    }
}

// --- 操作模式與共用選擇狀態 (觀察模式 vs 佔領模式) ---
let interactionMode = 'occupy'; // 'observe' | 'occupy'
let isQuickFillActive = false;  // 是否啟用快速佔領 (按住左鍵拖曳連續塗抹)
let currentBrushSize = 1;       // 筆刷大小 (1: 1格, 2: 7格, 3: 19格, 4: 37格)

function getInteractionMode() {
    return interactionMode;
}

function setInteractionMode(mode) {
    interactionMode = (mode === 'observe') ? 'observe' : 'occupy';

    const observeBtn = document.getElementById("mode-observe-btn");
    const occupyBtn = document.getElementById("mode-occupy-btn");
    if (observeBtn) observeBtn.classList.toggle("active", interactionMode === 'observe');
    if (occupyBtn) occupyBtn.classList.toggle("active", interactionMode === 'occupy');

    if (interactionMode === 'observe' && typeof clearBrushHover === 'function') {
        clearBrushHover();
    }

    updateMapCursor();
    updateActionStatusUI();
}

function updateMapCursor() {
    const map = document.getElementById("hexMap");
    if (!map) return;
    if (interactionMode === 'observe') {
        map.style.cursor = "grab";
    } else if (isQuickFillActive && !currentMarkerTool) {
        map.style.cursor = "crosshair";
    } else {
        map.style.cursor = "default";
    }
}

function updateActionStatusUI() {
    const statusEl = document.getElementById("unified-action-status");
    if (!statusEl) return;

    if (interactionMode === 'observe') {
        statusEl.innerText = "目前模式：觀察模式 (拖曳瀏覽)";
        statusEl.className = "status-observe";
        return;
    }

    if (currentMarkerTool) {
        const names = { attack: "進攻標記", defend: "防守標記", ban: "禁止標記", warn: "注意標記", clear: "清除標記" };
        statusEl.innerText = `目前操作：${names[currentMarkerTool]}`;
        statusEl.className = "status-marker";
    } else {
        const guildName = GUILD_CONFIG[currentGuildId] ? GUILD_CONFIG[currentGuildId].name : "公海";
        const modeText = isQuickFillActive ? "快速佔領" : "點擊佔領";
        statusEl.innerText = `目前操作：${guildName} (${modeText})`;
        statusEl.className = "status-occupy";
    }
}

function getQuickFillStatus() {
    return isQuickFillActive;
}

function getBrushSize() {
    return currentBrushSize;
}

// 切換快速佔領狀態 (拖曳連續塗抹)
function toggleQuickFill() {
    isQuickFillActive = !isQuickFillActive;
    const btn = document.getElementById("quick-fill-toggle");
    if (btn) {
        btn.innerText = `快速佔領：${isQuickFillActive ? "ON" : "OFF"}`;
        btn.classList.toggle("active", isQuickFillActive);
    }

    // 若在觀察模式下開啟快速佔領，自動切換回佔領模式
    if (isQuickFillActive && interactionMode === 'observe') {
        setInteractionMode('occupy');
        return;
    }

    if (!isQuickFillActive && typeof clearBrushHover === 'function') {
        clearBrushHover();
    }

    updateMapCursor();
    updateActionStatusUI();
}

// 設定筆刷大小
function setBrushSize(size) {
    currentBrushSize = Math.max(1, Math.min(4, size));
    
    const sizeLabels = {
        1: "1 格 (單格)",
        2: "7 格 (半徑1)",
        3: "19 格 (半徑2)",
        4: "37 格 (半徑3)"
    };
    
    const display = document.getElementById("brush-size-display");
    if (display) {
        display.innerText = sizeLabels[currentBrushSize] || `${currentBrushSize} 格`;
    }

    const slider = document.getElementById("brush-size-slider");
    if (slider) {
        slider.value = currentBrushSize;
    }

    document.querySelectorAll(".brush-size-btn").forEach(btn => {
        btn.classList.toggle("active", parseInt(btn.dataset.size) === currentBrushSize);
    });
}

// --- 項目 4：快速重置（一鍵清除某公會全部佔領海域） ---

/**
 * 清除指定公會的所有佔領海域（保留據點）
 * @param {number} guildId - 目標公會ID
 */
function clearGuildTerritory(guildId) {
    const guild = GUILD_CONFIG[guildId];
    if (!guild || guildId === 0) return;

    // 取得所有該公會佔領且非據點的格子
    const occupiedTiles = Array.from(document.querySelectorAll(`.hex[data-guild-id="${guildId}"]:not([data-type="${FEATURE_TYPES.BASE}"])`));
    
    if (occupiedTiles.length === 0) {
        alert(`【${guild.name}】目前沒有佔領任何海域。`);
        return;
    }

    const confirmed = confirm(`確定要清除【${guild.name}】佔領的所有海域嗎？\n(共 ${occupiedTiles.length} 格海域將被重置為公海，公會據點將保留)`);
    if (!confirmed) return;

    occupiedTiles.forEach(hex => {
        hex.dataset.guildId = "0";
        hex.style.fill = "";
    });

    refreshAllLogic();
}

/**
 * 一鍵清除目前選中公會的佔領海域
 */
function clearCurrentGuildTerritory() {
    if (currentGuildId === 0) {
        alert("目前選取的是「公海」，請先選擇要清除的特定公會！");
        return;
    }
    clearGuildTerritory(currentGuildId);
}

/**
 * 彈窗內一鍵清除
 */
function clearGuildTerritoryFromModal() {
    if (editingGuildId && editingGuildId !== 0) {
        clearGuildTerritory(editingGuildId);
        closeModal();
    }
}

// 地標顯示切換
let isLandmarksHidden = false;
function toggleLandmarks() {
    isLandmarksHidden = !isLandmarksHidden;
    const btn = document.getElementById("landmark-toggle");
    const map = document.getElementById("hexMap");
    
    if (btn) {
        btn.innerText = `隱藏地標：${isLandmarksHidden ? "ON" : "OFF"}`;
        btn.classList.toggle("active", isLandmarksHidden);
    }
    if (map) {
        map.classList.toggle("hide-landmarks", isLandmarksHidden);
    }
}

// 地圖階段切換
function setPhase(p) {
    updateMapPhase(p);
    document.querySelectorAll('.phase-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(p === 1 ? "一" : p === 2 ? "二" : "三")) {
            btn.classList.add('active');
        }
    });
}

// 戰術標記管理 (與公會佔領整合共用選擇狀態)
let currentMarkerTool = null;
let currentMarkerValue = "";

function selectMarkerTool(type) {
    if (currentMarkerTool === type) {
        currentMarkerTool = null;
    } else {
        currentMarkerTool = type;
    }

    // 選擇標記工具時自動進入佔領模式
    if (currentMarkerTool && interactionMode === 'observe') {
        setInteractionMode('occupy');
    }

    if (currentMarkerTool && typeof clearBrushHover === 'function') {
        clearBrushHover();
    }

    document.querySelectorAll('.marker-btn').forEach(btn => {
        btn.classList.remove('active');
        if (currentMarkerTool === type && btn.classList.contains(type)) {
            btn.classList.add('active');
        }
    });

    // 共用選擇狀態：標記啟動時取消公會列表選中高亮，切回無標記時恢復
    renderGuildSelectors();
    updateMapCursor();
    updateActionStatusUI();
}

function updateMarkerValue(val) {
    currentMarkerValue = val.trim();
}

function getMarkerToolStatus() {
    return {
        type: currentMarkerTool,
        value: currentMarkerValue
    };
}

// --- 公會狀態管理與清單渲染 ---
let currentGuildId = 0;
let editingGuildId = null;

function getCurrentGuildId() {
    return currentGuildId;
}

function renderGuildSelectors() {
    const selector = document.getElementById("guild-selector");
    if (!selector) return;
    selector.innerHTML = "";

    Object.values(GUILD_CONFIG).forEach(guild => {
        // 當戰術標記工具啟用時，公會項目不顯示選中高亮
        const isSelected = (!currentMarkerTool && currentGuildId === guild.id);
        const wrapper = document.createElement("div");
        wrapper.className = `guild-item ${isSelected ? 'active' : ''}`;

        // 點擊整行：立即切換為該公會佔領模式（清除戰術標記並進入佔領模式）
        wrapper.onclick = () => {
            currentGuildId = guild.id;
            currentMarkerTool = null;
            document.querySelectorAll('.marker-btn').forEach(btn => btn.classList.remove('active'));
            if (interactionMode === 'observe') {
                setInteractionMode('occupy');
            }
            renderGuildSelectors();
            updateMapCursor();
            updateActionStatusUI();
        };

        const colorBox = document.createElement("div");
        colorBox.className = "guild-btn";
        colorBox.style.backgroundColor = guild.color;
        
        const nameLabel = document.createElement("span");
        nameLabel.className = "guild-name-label";
        nameLabel.innerText = guild.name;

        wrapper.appendChild(colorBox);
        wrapper.appendChild(nameLabel);

        if (guild.id !== 0) {
            // 一鍵重置該公會海域按鈕 (項目 4)
            const resetBtn = document.createElement("button");
            resetBtn.className = "reset-btn";
            resetBtn.title = `清除【${guild.name}】所有海域`;
            resetBtn.innerText = "🗑";
            resetBtn.onclick = (e) => {
                e.stopPropagation();
                clearGuildTerritory(guild.id);
            };
            wrapper.appendChild(resetBtn);

            // 編輯按鈕
            const editBtn = document.createElement("button");
            editBtn.className = "edit-btn";
            editBtn.title = "編輯公會資訊";
            editBtn.innerText = "✎";
            editBtn.onclick = (e) => {
                e.stopPropagation();
                openEditModal(guild.id);
            };
            wrapper.appendChild(editBtn);
        }

        selector.appendChild(wrapper);
    });
}

// 開啟公會編輯視窗 (整合自選與色票)
function openEditModal(id) {
    editingGuildId = id;
    const guild = GUILD_CONFIG[id];
    document.getElementById("edit-name").value = guild.name;
    document.getElementById("edit-color").value = guild.color;
    
    // 渲染預設推薦色票
    const container = document.getElementById("swatch-container");
    container.innerHTML = "";
    
    PRESET_COLORS.forEach(color => {
        const swatch = document.createElement("div");
        swatch.className = "swatch";
        swatch.style.backgroundColor = color;
        
        if (guild.color.toUpperCase() === color.toUpperCase()) {
            swatch.classList.add("selected");
        }

        swatch.onclick = () => {
            document.getElementById("edit-color").value = color;
            document.querySelectorAll(".swatch").forEach(s => s.classList.remove("selected"));
            swatch.classList.add("selected");
        };
        container.appendChild(swatch);
    });

    document.getElementById("edit-modal").style.display = "flex";
}

function closeModal() {
    document.getElementById("edit-modal").style.display = "none";
}

function saveGuildEdit() {
    const newName = document.getElementById("edit-name").value.trim() || GUILD_CONFIG[editingGuildId].name;
    const newColor = document.getElementById("edit-color").value;

    GUILD_CONFIG[editingGuildId].name = newName;
    GUILD_CONFIG[editingGuildId].color = newColor;

    // 更新地圖上此公會格子的顏色
    if (typeof window.updateMapColors === 'function') {
        window.updateMapColors(editingGuildId, newColor);
    }

    // 重新計算並刷新據點與最大勢力標籤
    refreshAllLogic();
    renderGuildSelectors();
    closeModal();
}

// 初始化公會清單
document.addEventListener("DOMContentLoaded", renderGuildSelectors);

// --- 排行榜與計分系統整合邏輯 ---
let currentTimeMinutes = 0; // 距離 19:00 的分鐘數 (0 = 19:00, 120 = 21:00)
let simTimeMinutes = 0;     // 模擬進度拉條分鐘數 (currentTimeMinutes ~ 120)
const guildBaseScores = {}; // 手動輸入的各公會目前已有分數 { guildId: number }

function formatEventTime(minsFrom1900) {
    const clamped = Math.max(0, Math.min(120, minsFrom1900));
    const hour = 19 + Math.floor(clamped / 60);
    const min = clamped % 60;
    return `${hour}:${String(min).padStart(2, '0')}`;
}

function calculateGuildDynamicScore(baseScore, periodicScore, finalScore, startMins, targetMins) {
    const ticks = Math.max(0, Math.floor(targetMins / 10) - Math.floor(startMins / 10));
    const periodicGain = ticks * periodicScore;
    const finalGain = (targetMins === 120 && startMins < 120) ? finalScore : 0;
    return {
        ticks,
        periodicGain,
        finalGain,
        totalGain: periodicGain + finalGain,
        totalScore: baseScore + periodicGain + finalGain
    };
}

function onCurrentTimeChange() {
    const hourEl = document.getElementById("current-hour");
    const minEl = document.getElementById("current-minute");
    if (!hourEl || !minEl) return;

    let hour = parseInt(hourEl.value) || 19;
    let min = parseInt(minEl.value);
    if (isNaN(min) || min < 0) min = 0;
    if (min > 59) min = 59;

    if (hour >= 21) {
        hour = 21;
        min = 0;
        minEl.value = "00";
        minEl.disabled = true;
    } else {
        minEl.disabled = false;
        minEl.value = String(min).padStart(2, '0');
    }

    currentTimeMinutes = Math.max(0, Math.min(120, (hour - 19) * 60 + min));

    const slider = document.getElementById("sim-time-slider");
    if (slider) {
        slider.min = currentTimeMinutes;
        if (simTimeMinutes < currentTimeMinutes) {
            simTimeMinutes = currentTimeMinutes;
        }
        slider.value = simTimeMinutes;
    }

    updateSimTimeUI();
    updateLeaderboard();
}

function onSimTimeSliderInput(val) {
    simTimeMinutes = Math.max(currentTimeMinutes, Math.min(120, parseInt(val) || 0));
    updateSimTimeUI();
    updateLeaderboard();
}

function jumpSimTime(targetMins) {
    simTimeMinutes = Math.max(currentTimeMinutes, Math.min(120, targetMins));
    const slider = document.getElementById("sim-time-slider");
    if (slider) slider.value = simTimeMinutes;
    updateSimTimeUI();
    updateLeaderboard();
}

function updateSimTimeUI() {
    const timeDisplay = document.getElementById("sim-time-display");
    const ticksDisplay = document.getElementById("sim-ticks-display");
    if (timeDisplay) {
        timeDisplay.innerText = formatEventTime(simTimeMinutes);
    }
    if (ticksDisplay) {
        const ticks = Math.max(0, Math.floor(simTimeMinutes / 10) - Math.floor(currentTimeMinutes / 10));
        const hasFinal = (simTimeMinutes === 120 && currentTimeMinutes < 120);
        ticksDisplay.innerText = hasFinal ? `+${ticks}次定給 + 結算分` : `+${ticks} 次定給分`;
        ticksDisplay.classList.toggle("has-final", hasFinal);
    }
}

function updateManualGuildSelect() {
    const select = document.getElementById("manual-guild-select");
    if (!select) return;
    const prevVal = select.value;
    select.innerHTML = "";
    for (let gId = 1; gId <= 16; gId++) {
        const opt = document.createElement("option");
        opt.value = gId;
        opt.innerText = GUILD_CONFIG[gId].name;
        select.appendChild(opt);
    }
    if (prevVal && parseInt(prevVal) >= 1 && parseInt(prevVal) <= 16) {
        select.value = prevVal;
    }
}

function addManualGuildScore() {
    const select = document.getElementById("manual-guild-select");
    const input = document.getElementById("manual-guild-score");
    if (!select || !input) return;

    const gId = parseInt(select.value);
    const val = Math.max(0, parseInt(input.value) || 0);
    guildBaseScores[gId] = val;
    input.value = "";
    updateLeaderboard();
}

function updateGuildBaseScore(gId, rawVal, shouldResort) {
    const val = Math.max(0, parseInt(rawVal) || 0);
    guildBaseScores[gId] = val;

    if (shouldResort) {
        updateLeaderboard();
        return;
    }

    // 即時更新該卡片數值，避免打字時失去焦點
    const card = document.querySelector(`.lb-guild-group[data-guild-id="${gId}"]`);
    if (!card) return;

    const periodicScore = parseInt(card.dataset.periodic || 0);
    const finalScore = parseInt(card.dataset.final || 0);

    const simRes = calculateGuildDynamicScore(val, periodicScore, finalScore, currentTimeMinutes, simTimeMinutes);
    const estRes = calculateGuildDynamicScore(val, periodicScore, finalScore, currentTimeMinutes, 120);

    const totalEl = card.querySelector(".lb-dynamic-total");
    const gainEl = card.querySelector(".lb-sim-gain");
    const estEl = card.querySelector(".lb-est-final");

    if (totalEl) totalEl.innerText = `${simRes.totalScore.toLocaleString()} 分`;
    if (gainEl) gainEl.innerText = `+${simRes.totalGain.toLocaleString()}`;
    if (estEl) estEl.innerText = estRes.totalScore.toLocaleString();
}

function updateLeaderboard() {
    const panel = document.getElementById("leaderboard-panel");
    const listContainer = document.getElementById("leaderboard-list");
    if (!panel || !listContainer || panel.style.display === 'none') return;

    updateManualGuildSelect();
    listContainer.innerHTML = "";
    
    const stats = {};
    const allHexes = document.querySelectorAll('.hex');

    const getBasePriority = (type, level, name) => {
        if (name === "珍寶點") return 5;
        if (name === "沈船點") return 4;
        if (type === "buff" || name === "人魚島") return 3;
        if (level === 2 || name === "海上餐廳") return 2;
        if (level === 1 || name === "水手酒館") return 1;
        return 0;
    };

    allHexes.forEach(hex => {
        const gId = parseInt(hex.dataset.guildId || 0);
        if (gId === 0) return;

        const type = hex.dataset.type;
        if (type !== 'facility' && type !== 'buff') return;

        if (!stats[gId]) {
            stats[gId] = { 
                validTotal: 0, 
                maxPriority: 0, 
                periodicScore: 0, 
                finalScore: 0, 
                items: {} 
            };
        }

        let name = "";
        let level = 0;
        const q = parseInt(hex.dataset.q);
        const r = parseInt(hex.dataset.r);
        
        if (type === 'buff') {
            name = "人魚島";
        } else {
            const fac = MAP_FEATURES.FACILITIES.find(f => f.q === q && f.r === r);
            if (fac) {
                name = fac.name;
                level = fac.level;
            }
        }

        if (!name) return;

        const isBlocked = (hex.dataset.isBlocked === "true");
        let displayName = name;
        let itemPriority = getBasePriority(type, level, name);

        if (isBlocked) {
            displayName = `${name}(被封鎖)`;
            itemPriority = -1; 
        } else {
            stats[gId].validTotal++;
            if (itemPriority > stats[gId].maxPriority) {
                stats[gId].maxPriority = itemPriority;
            }
            const rules = SCORE_RULES[name] || { periodic: 0, final: 0 };
            stats[gId].periodicScore += rules.periodic;
            stats[gId].finalScore += rules.final;
        }

        if (!stats[gId].items[displayName]) {
            stats[gId].items[displayName] = { count: 0, priority: itemPriority };
        }
        stats[gId].items[displayName].count++;
    });

    // 將有手動輸入已有分數但目前沒有佔領設施的公會也納入顯示
    Object.keys(guildBaseScores).forEach(idStr => {
        const gId = parseInt(idStr);
        if (guildBaseScores[gId] > 0 && !stats[gId]) {
            stats[gId] = {
                validTotal: 0,
                maxPriority: 0,
                periodicScore: 0,
                finalScore: 0,
                items: {}
            };
        }
    });

    // 預先計算各公會的模擬總分與 21:00 預估總分
    Object.keys(stats).forEach(idStr => {
        const gId = parseInt(idStr);
        const base = guildBaseScores[gId] || 0;
        const data = stats[gId];
        data.baseScore = base;
        data.simResult = calculateGuildDynamicScore(base, data.periodicScore, data.finalScore, currentTimeMinutes, simTimeMinutes);
        data.estResult = calculateGuildDynamicScore(base, data.periodicScore, data.finalScore, currentTimeMinutes, 120);
    });

    const sortedGuilds = Object.keys(stats)
        .map(id => parseInt(id))
        .filter(id => Object.keys(stats[id].items).length > 0 || stats[id].baseScore > 0)
        .sort((a, b) => {
            const simDiff = stats[b].simResult.totalScore - stats[a].simResult.totalScore;
            if (simDiff !== 0) return simDiff;
            const estDiff = stats[b].estResult.totalScore - stats[a].estResult.totalScore;
            if (estDiff !== 0) return estDiff;
            const pDiff = stats[b].maxPriority - stats[a].maxPriority;
            if (pDiff !== 0) return pDiff;
            return stats[b].validTotal - stats[a].validTotal;
        });

    sortedGuilds.forEach((gId, index) => {
        const guildData = GUILD_CONFIG[gId];
        const data = stats[gId];

        const group = document.createElement("div");
        group.className = "lb-guild-group";
        group.dataset.guildId = gId;
        group.dataset.periodic = data.periodicScore;
        group.dataset.final = data.finalScore;
        group.style.borderLeftColor = guildData.color;

        const header = document.createElement("div");
        header.className = "lb-header";
        header.innerHTML = `
            <span>#${index + 1} ${guildData.name}</span>
            <span class="lb-dynamic-total">${data.simResult.totalScore.toLocaleString()} 分</span>
        `;
        group.appendChild(header);

        // 目前已有分數輸入列
        const baseRow = document.createElement("div");
        baseRow.className = "lb-base-score-row";
        baseRow.innerHTML = `
            <span>目前已有分數：</span>
            <input type="number" min="0" step="100" class="guild-base-score-input" value="${data.baseScore}"
                oninput="updateGuildBaseScore(${gId}, this.value, false)"
                onchange="updateGuildBaseScore(${gId}, this.value, true)">
        `;
        group.appendChild(baseRow);

        const list = document.createElement("div");
        list.className = "lb-list";

        const sortedItemNames = Object.keys(data.items).sort((nA, nB) => {
             const itemA = data.items[nA];
             const itemB = data.items[nB];
             if (itemA.priority !== itemB.priority) {
                 return itemB.priority - itemA.priority;
             }
             return itemB.count - itemA.count;
        });

        if (sortedItemNames.length === 0) {
            const emptyRow = document.createElement("div");
            emptyRow.className = "lb-item";
            emptyRow.style.color = "#777";
            emptyRow.innerText = "尚無佔領設施";
            list.appendChild(emptyRow);
        } else {
            sortedItemNames.forEach(itemName => {
                const itemData = data.items[itemName];
                const itemRow = document.createElement("div");
                itemRow.className = "lb-item";
                
                const nameStyle = itemData.priority === -1 ? "color: #ff6666;" : "";

                itemRow.innerHTML = `
                    <span style="${nameStyle}">${itemName}</span>
                    <span class="lb-count">${itemData.count}</span>
                `;
                list.appendChild(itemRow);
            });
        }

        group.appendChild(list);

        const footer = document.createElement("div");
        footer.className = "lb-footer lb-footer-grid";
        footer.innerHTML = `
            <div>定給分 <span class="score-p">+${data.periodicScore}</span>/10分</div>
            <div>結算分 <span class="score-f">+${data.finalScore}</span></div>
            <div>模擬增量 <span class="score-p lb-sim-gain">+${data.simResult.totalGain.toLocaleString()}</span></div>
            <div>21:00預估 <span class="score-f lb-est-final">${data.estResult.totalScore.toLocaleString()}</span></div>
        `;
        group.appendChild(footer);

        listContainer.appendChild(group);
    });

    if (sortedGuilds.length === 0) {
        listContainer.innerHTML = "<div style='padding:20px; color:#666; text-align:center;'>尚無公會佔領設施或分數資料</div>";
    }
}

// --- 新手引導教學模式 (Onboarding Tour) ---
const TOUR_STORAGE_KEY = "pirate_chess_tour_done";
let currentTourStep = 0;

const TOUR_STEPS = [
    {
        targetId: null,
        tab: "selector",
        title: "歡迎使用海盜棋模擬網站",
        desc: "這裡提供完整的海盜棋戰術推演、領地連通檢測與計分模擬功能。\n\n操作提示：使用滑鼠滾輪可縮放地圖，拖曳可平移視角；右上角「✕ / ☰」可隨時收合側邊欄，「?」可隨時重新開啟本教學。"
    },
    {
        targetId: "mode-switcher",
        tab: "selector",
        title: "1. 觀察模式與佔領模式切換",
        desc: "系統區分「觀察模式」與「佔領模式」：\n• 觀察模式：僅供拖曳瀏覽地圖，點擊不會誤觸佔領或標記。\n• 佔領模式：點擊地圖即可依目前選取的公會或戰術標記進行編輯。"
    },
    {
        targetId: "guild-selector",
        tab: "selector",
        title: "2. 公會列表與快速管理",
        desc: "點擊任一公會即可切換為該公會佔領狀態（並自動切入佔領模式）。\n• 點擊「✎」可自訂公會名稱與顏色，據點船艦與最大勢力海域會同步顯示。\n• 點擊「🗑」可一鍵清除該公會所有佔領海域。"
    },
    {
        targetId: "brush-section",
        tab: "selector",
        title: "3. 筆刷大小與快速佔領",
        desc: "筆刷大小（1格、7格、19格、37格）會同步套用於「點擊佔領」與「快速佔領」。\n開啟「快速佔領」後，按住滑鼠左鍵拖曳即可連續塗抹大片海域（右鍵或中鍵仍可拖曳移動地圖）。"
    },
    {
        targetId: "marker-section",
        tab: "selector",
        title: "4. 戰術標記（共用選擇狀態）",
        desc: "提供進攻、防守、禁止、注意與清除標記（可選填億數）。\n戰術標記與公會佔領共用選擇狀態：點擊標記工具後即可放置標記；之後只要直接點擊任一公會，就會立即切回該公會佔領模式！"
    },
    {
        targetId: "phase-section",
        tab: "selector",
        title: "5. 地圖階段與地標切換",
        desc: "可切換「第一天、第二天、第三天」的中央禁區開放範圍，也可開關「隱藏地標」來更清楚檢視領地顏色與邊界。"
    },
    {
        targetId: "scoring-control-panel",
        tab: "leaderboard",
        title: "6. 設施統計與即時計分系統",
        desc: "活動時間固定為 19:00–21:00。\n在此可手動設定「現在時間」、輸入各公會「目前已有分數」，並拖動模擬時間拉條，即時預覽每 10 分鐘定給分與 21:00 最終結算排行！"
    }
];

function startTour(forceOpenSidebar) {
    currentTourStep = 0;
    if (forceOpenSidebar) {
        const sidebar = document.getElementById("ui-sidebar");
        const toggleBtn = document.getElementById("menu-toggle");
        if (sidebar && sidebar.classList.contains("sidebar-closed")) {
            sidebar.classList.remove("sidebar-closed");
            sidebar.classList.add("sidebar-open");
            if (toggleBtn) toggleBtn.innerText = "✕";
        }
    }
    const overlay = document.getElementById("tour-overlay");
    if (overlay) overlay.style.display = "block";
    renderTourStep();
}

function skipTour() {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    const overlay = document.getElementById("tour-overlay");
    if (overlay) overlay.style.display = "none";
    document.querySelectorAll(".tour-target-active").forEach(el => el.classList.remove("tour-target-active"));
    switchTab("selector");
}

function nextTourStep() {
    if (currentTourStep < TOUR_STEPS.length - 1) {
        currentTourStep++;
        renderTourStep();
    } else {
        skipTour();
    }
}

function prevTourStep() {
    if (currentTourStep > 0) {
        currentTourStep--;
        renderTourStep();
    }
}

function renderTourStep() {
    const step = TOUR_STEPS[currentTourStep];
    if (!step) return;

    // 確保側邊欄開啟並切換到對應分頁
    const sidebar = document.getElementById("ui-sidebar");
    const toggleBtn = document.getElementById("menu-toggle");
    if (sidebar && sidebar.classList.contains("sidebar-closed")) {
        sidebar.classList.remove("sidebar-closed");
        sidebar.classList.add("sidebar-open");
        if (toggleBtn) toggleBtn.innerText = "✕";
    }
    if (step.tab) {
        switchTab(step.tab);
    }

    document.getElementById("tour-step-badge").innerText = `步驟 ${currentTourStep + 1} / ${TOUR_STEPS.length}`;
    document.getElementById("tour-title").innerText = step.title;
    document.getElementById("tour-desc").innerText = step.desc;

    const prevBtn = document.getElementById("tour-prev-btn");
    const nextBtn = document.getElementById("tour-next-btn");
    if (prevBtn) prevBtn.style.visibility = currentTourStep === 0 ? "hidden" : "visible";
    if (nextBtn) nextBtn.innerText = (currentTourStep === TOUR_STEPS.length - 1) ? "完成" : "下一步";

    // 更新聚光燈與卡片位置
    document.querySelectorAll(".tour-target-active").forEach(el => el.classList.remove("tour-target-active"));
    const spotlight = document.getElementById("tour-spotlight");
    const card = document.getElementById("tour-card");

    const targetEl = step.targetId ? document.getElementById(step.targetId) : null;
    if (targetEl && spotlight) {
        const rect = targetEl.getBoundingClientRect();
        const pad = 6;
        spotlight.style.display = "block";
        spotlight.style.left = `${rect.left - pad}px`;
        spotlight.style.top = `${rect.top - pad}px`;
        spotlight.style.width = `${rect.width + pad * 2}px`;
        spotlight.style.height = `${rect.height + pad * 2}px`;

        // 將引導卡片置於目標左側（避免遮擋右側側邊欄）
        if (card) {
            card.style.transform = "none";
            const cardW = 340;
            const leftPos = Math.max(20, rect.left - cardW - 24);
            const topPos = Math.max(20, Math.min(window.innerHeight - 260, rect.top));
            card.style.left = `${leftPos}px`;
            card.style.top = `${topPos}px`;
        }
    } else {
        if (spotlight) spotlight.style.display = "none";
        if (card) {
            card.style.left = "50%";
            card.style.top = "50%";
            card.style.transform = "translate(-50%, -50%)";
        }
    }
}

// 初次進入網站自動觸發引導模式
document.addEventListener("DOMContentLoaded", () => {
    updateActionStatusUI();
    updateMapCursor();
    if (localStorage.getItem(TOUR_STORAGE_KEY) !== "true") {
        setTimeout(() => startTour(true), 400);
    }
});
