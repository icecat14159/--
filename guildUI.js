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
        leaderboard.style.display = 'block';
        updateLeaderboard(); // 切換時即時刷新統計
    }
}

// --- 項目 3：快速佔領改進（筆刷功能與大小調節） ---
let isQuickFillActive = false; // 是否啟用筆刷佔領
let currentBrushSize = 1;      // 筆刷大小 (1: 1格, 2: 7格, 3: 19格, 4: 37格)

function getQuickFillStatus() {
    return isQuickFillActive;
}

function getBrushSize() {
    return currentBrushSize;
}

// 切換筆刷佔領狀態
function toggleQuickFill() {
    isQuickFillActive = !isQuickFillActive;
    const btn = document.getElementById("quick-fill-toggle");
    if (btn) {
        btn.innerText = `筆刷佔領：${isQuickFillActive ? "ON" : "OFF"}`;
        btn.classList.toggle("active", isQuickFillActive);
    }
    
    // 地圖指標變化
    const map = document.getElementById("hexMap");
    if (map) {
        map.style.cursor = isQuickFillActive ? "crosshair" : "default";
    }

    if (!isQuickFillActive && typeof clearBrushHover === 'function') {
        clearBrushHover();
    }
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

// 戰術標記管理
let currentMarkerTool = null;
let currentMarkerValue = "";

function selectMarkerTool(type) {
    if (currentMarkerTool === type) {
        currentMarkerTool = null;
    } else {
        currentMarkerTool = type;
    }

    document.querySelectorAll('.marker-btn').forEach(btn => {
        btn.classList.remove('active');
        if (currentMarkerTool === type && btn.classList.contains(type)) {
            btn.classList.add('active');
        }
    });

    const statusText = document.getElementById("marker-status");
    if (!currentMarkerTool) {
        statusText.innerText = "目前模式：無 (點擊佔領)";
        statusText.style.color = "#aaa";
    } else {
        const names = { attack: "進攻", defend: "防守", ban: "禁止", warn: "注意", clear: "清除" };
        statusText.innerText = `目前模式：${names[type]}`;
        statusText.style.color = "#fff";
    }
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
        const isSelected = (currentGuildId === guild.id);
        const wrapper = document.createElement("div");
        wrapper.className = `guild-item ${isSelected ? 'active' : ''}`;

        // 點擊整行選取該公會
        wrapper.onclick = () => {
            currentGuildId = guild.id;
            renderGuildSelectors(); 
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

// --- 排行榜統計邏輯 ---
function updateLeaderboard() {
    const panel = document.getElementById("leaderboard-panel");
    if (!panel || panel.style.display === 'none') return;

    panel.innerHTML = "";
    
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

    const sortedGuilds = Object.keys(stats)
        .map(id => parseInt(id))
        .filter(id => Object.keys(stats[id].items).length > 0)
        .sort((a, b) => {
            const pA = stats[a].maxPriority;
            const pB = stats[b].maxPriority;
            if (pA !== pB) return pB - pA; 
            return stats[b].validTotal - stats[a].validTotal;
        });

    sortedGuilds.forEach(gId => {
        const guildData = GUILD_CONFIG[gId];
        const data = stats[gId];

        const group = document.createElement("div");
        group.className = "lb-guild-group";
        group.style.borderLeftColor = guildData.color;

        const header = document.createElement("div");
        header.className = "lb-header";
        header.innerHTML = `<span>${guildData.name}</span>`;
        group.appendChild(header);

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

        group.appendChild(list);

        if (data.periodicScore > 0 || data.finalScore > 0) {
            const footer = document.createElement("div");
            footer.className = "lb-footer";
            footer.innerHTML = `
                <div>定給分 <span class="score-p">+${data.periodicScore}</span>/10 min</div>
                <div>結算分 <span class="score-f">+${data.finalScore}</span></div>
            `;
            group.appendChild(footer);
        }
        panel.appendChild(group);
    });

    if (sortedGuilds.length === 0) {
        panel.innerHTML = "<div style='padding:20px; color:#666; text-align:center;'>尚無公會佔領設施</div>";
    }
}
