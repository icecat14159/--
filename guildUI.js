// 狀態管理
let currentGuildId = 0;
let editingGuildId = null;

// 提供給 hex.js 呼叫的介面
function getCurrentGuildId() {
    return currentGuildId;
}

let isQuickFillActive = false;

function toggleQuickFill() {
    isQuickFillActive = !isQuickFillActive;
    const btn = document.getElementById("quick-fill-toggle");
    btn.innerText = `快速佔領：${isQuickFillActive ? "ON" : "OFF"}`;
    btn.classList.toggle("active", isQuickFillActive);
}

// 提供介面讓 hex.js 讀取狀態
function getQuickFillStatus() {
    return isQuickFillActive;
}

function toggleSidebar() {
    const sidebar = document.getElementById("ui-sidebar");
    const toggleBtn = document.getElementById("menu-toggle");
    
    if (sidebar.classList.contains("sidebar-open")) {
        sidebar.classList.remove("sidebar-open");
        sidebar.classList.add("sidebar-closed");
        toggleBtn.innerText = "☰"; // 關閉時顯示選單圖示
    } else {
        sidebar.classList.remove("sidebar-closed");
        sidebar.classList.add("sidebar-open");
        toggleBtn.innerText = "✕"; // 開啟時顯示關閉圖示
    }
}

function renderGuildSelectors() {
    const selector = document.getElementById("guild-selector");
    if (!selector) return;
    selector.innerHTML = "";

    Object.values(GUILD_CONFIG).forEach(guild => {
        const isSelected = (currentGuildId === guild.id);
        const wrapper = document.createElement("div");
        // 如果被選中，加入 active class
        wrapper.className = `guild-item ${isSelected ? 'active' : ''}`;

        // 點擊整行即可切換公會
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
            const editBtn = document.createElement("button");
            editBtn.className = "edit-btn";
            editBtn.innerText = "✎";
            editBtn.onclick = (e) => {
                e.stopPropagation(); // 阻止觸發整行點擊
                openEditModal(guild.id);
            };
            wrapper.appendChild(editBtn);
        }

        selector.appendChild(wrapper);
    });
}

let isLandmarksHidden = false;

function toggleLandmarks() {
    isLandmarksHidden = !isLandmarksHidden;
    const btn = document.getElementById("landmark-toggle");
    const map = document.getElementById("hexMap");
    
    btn.innerText = `隱藏地標：${isLandmarksHidden ? "ON" : "OFF"}`;
    btn.classList.toggle("active", isLandmarksHidden);

    if (isLandmarksHidden) {
        map.classList.add("hide-landmarks");
    } else {
        map.classList.remove("hide-landmarks");
    }
    refreshMapColors(); 
}

function refreshMapColors() {
    const allHexes = document.querySelectorAll('.hex');
    allHexes.forEach(hex => {
        const type = hex.dataset.type;
        // 確保轉為整數，避免型別錯誤
        const gId = parseInt(hex.dataset.guildId || 0); 
        
        // 判斷是否顯示地標色
        if (!isLandmarksHidden && (type === 'facility' || type === 'buff')) {
            hex.style.fill = (type === 'facility') ? "#ffd70090" : "#00ffff90";
        } else {
            // 顯示公會色
            if (gId === 0) {
                // 關鍵修正：公海 ID 為 0 時，移除行內樣式
                hex.style.fill = "";
            } else {
                hex.style.fill = GUILD_CONFIG[gId].color;
            }
        }
    });
    if (typeof updateIndicators === "function") updateIndicators();
}

function openEditModal(id) {
    editingGuildId = id;
    const guild = GUILD_CONFIG[id];
    document.getElementById("edit-name").value = guild.name;
    document.getElementById("edit-color").value = guild.color;
    document.getElementById("edit-modal").style.display = "flex";
}

function closeModal() {
    document.getElementById("edit-modal").style.display = "none";
}

function saveGuildEdit() {
    const newName = document.getElementById("edit-name").value;
    const newColor = document.getElementById("edit-color").value;

    GUILD_CONFIG[editingGuildId].name = newName;
    GUILD_CONFIG[editingGuildId].color = newColor;

    // 更新地圖顏色
    if (typeof window.updateMapColors === 'function') {
        window.updateMapColors(editingGuildId, newColor);
    }

    renderGuildSelectors();
    closeModal();
}

const PRESET_COLORS = [
    "#ffffff", // 白色
    "#33ccff", // 天藍
    "#9966ff", // 紫羅蘭
    "#ff66b2", // 粉紅
    "#008080", // 深青
    "#b2b2b2", // 淺灰
    "#6600cc", // 深紫
    "#ccff33", // 萊姆綠 (偏黃)
    "#00cc99", // 薄荷綠
    "#99004c", // 桃紅
    "#66b2ff", // 亮藍
    "#c0c0c0", // 銀色
    "#ff99cc", // 淺粉
    "#4d94ff", // 鈷藍
    "#99ffeb", // 淺青
    "#9933ff", // 紫色
    "#66ff66", // 淺綠 (與據點綠區分)
    "#b380ff", // 薰衣草
    "#5cd6d6", // 青綠
    "#ffccff"  // 淡紫
];

function openEditModal(id) {
    editingGuildId = id;
    const guild = GUILD_CONFIG[id];
    document.getElementById("edit-name").value = guild.name;
    document.getElementById("edit-color").value = guild.color;
    
    // 生成色票
    const container = document.getElementById("swatch-container");
    container.innerHTML = "";
    
    PRESET_COLORS.forEach(color => {
        const swatch = document.createElement("div");
        swatch.className = "swatch";
        swatch.style.backgroundColor = color;
        
        // 如果目前顏色等於此色票，標記為選中
        if (guild.color.toUpperCase() === color.toUpperCase()) {
            swatch.classList.add("selected");
        }

        swatch.onclick = () => {
            // 更新隱藏的顏色輸入框
            document.getElementById("edit-color").value = color;
            // 更新色票選中視覺
            document.querySelectorAll(".swatch").forEach(s => s.classList.remove("selected"));
            swatch.classList.add("selected");
        };
        container.appendChild(swatch);
    });

    document.getElementById("edit-modal").style.display = "flex";
}

function setPhase(p) {
    if (typeof updateMapPhase === "function") {
        updateMapPhase(p);
    }
    
    // 按鈕視覺回饋 (Optional)
    document.querySelectorAll('.phase-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(p === 1 ? "一" : p === 2 ? "二" : "三")) {
            btn.classList.add('active');
        }
    });
}

// 初始化
document.addEventListener("DOMContentLoaded", renderGuildSelectors);

// --- 分頁切換邏輯 ---
function switchTab(tabName) {
    // 1. 切換按鈕狀態
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(tabName === 'selector' ? '列表' : '統計')) {
            btn.classList.add('active');
        }
    });

    // 2. 切換內容顯示
    const selector = document.getElementById("guild-selector");
    const leaderboard = document.getElementById("leaderboard-panel");

    if (tabName === 'selector') {
        selector.style.display = 'flex';
        leaderboard.style.display = 'none';
    } else {
        selector.style.display = 'none';
        leaderboard.style.display = 'block';
        updateLeaderboard(); // 切換過來時刷新數據
    }
}

// --- 排行榜統計邏輯 ---
function updateLeaderboard() {
    const panel = document.getElementById("leaderboard-panel");
    if (panel.style.display === 'none') return;

    panel.innerHTML = "";
    
    // 統計資料結構：
    // stats[gId] = { 
    //    validTotal: 0,      // 有效(未封鎖)設施總數 -> 用於公會排序
    //    maxPriority: 0,     // 有效設施的最高權重 -> 用於公會排序
    //    items: { "設施名": { count: 0, priority: 0 } } // 用於內部列表顯示與排序
    // }
    const stats = {};
    const allHexes = document.querySelectorAll('.hex');

    // 定義權重 (數字越大排越前)
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
            stats[gId] = { validTotal: 0, maxPriority: 0, items: {} };
        }

        // 取得名稱與等級
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

        // 判斷封鎖狀態
        const isBlocked = (hex.dataset.isBlocked === "true");
        let displayName = name;
        let itemPriority = getBasePriority(type, level, name);

        if (isBlocked) {
            displayName = `${name}(被封鎖)`;
            // 被封鎖的設施：
            // 1. 不計入 validTotal (公會排序用)
            // 2. 不更新 maxPriority (公會排序用)
            // 3. 內部列表排序權重設為 -1 (讓它沉底)
            itemPriority = -1; 
        } else {
            // 有效設施：更新公會的統計數據
            stats[gId].validTotal++;
            if (itemPriority > stats[gId].maxPriority) {
                stats[gId].maxPriority = itemPriority;
            }
        }

        // 統計該項目的數量 (分開統計 "水手酒館" 與 "水手酒館(被封鎖)")
        if (!stats[gId].items[displayName]) {
            stats[gId].items[displayName] = { count: 0, priority: itemPriority };
        }
        stats[gId].items[displayName].count++;
    });

    // 2. 排序公會
    // 規則：只看「有效佔領」。如果全部被封鎖，validTotal 為 0，會排在最後。
    // 過濾條件：該公會必須至少「佔領」一個設施 (不論封鎖與否都顯示，但排序依據有效值)
    const sortedGuilds = Object.keys(stats)
        .map(id => parseInt(id))
        .filter(id => Object.keys(stats[id].items).length > 0) // 只要有佔領就顯示
        .sort((a, b) => {
            // 先比有效設施的最高等級
            const pA = stats[a].maxPriority;
            const pB = stats[b].maxPriority;
            if (pA !== pB) return pB - pA; 
            
            // 再比有效設施的總數
            return stats[b].validTotal - stats[a].validTotal;
        });

    // 3. 渲染 DOM
    sortedGuilds.forEach(gId => {
        const guildData = GUILD_CONFIG[gId];
        const data = stats[gId];

        const group = document.createElement("div");
        group.className = "lb-guild-group";
        group.style.borderLeftColor = guildData.color;

        // 標題顯示：公會名稱 + (有效數量總計，可選)
        const header = document.createElement("div");
        header.className = "lb-header";
        header.innerHTML = `<span>${guildData.name}</span>`;
        group.appendChild(header);

        const list = document.createElement("div");
        list.className = "lb-list";

        // 4. 排序公會內部的設施列表
        // 依據 priority 降冪 (正常設施在前，被封鎖的(-1)在後)
        const sortedItemNames = Object.keys(data.items).sort((nA, nB) => {
             const itemA = data.items[nA];
             const itemB = data.items[nB];
             // 先比權重
             if (itemA.priority !== itemB.priority) {
                 return itemB.priority - itemA.priority;
             }
             // 權重相同比數量 (多的在前)
             return itemB.count - itemA.count;
        });

        sortedItemNames.forEach(itemName => {
            const itemData = data.items[itemName];
            const itemRow = document.createElement("div");
            itemRow.className = "lb-item";
            
            // 如果是被封鎖的項目，文字顏色變暗或變紅以示區別
            const nameStyle = itemData.priority === -1 ? "color: #ff6666;" : "";

            itemRow.innerHTML = `
                <span style="${nameStyle}">${itemName}</span>
                <span class="lb-count">${itemData.count}</span>
            `;
            list.appendChild(itemRow);
        });

        group.appendChild(list);
        panel.appendChild(group);
    });

    if (sortedGuilds.length === 0) {
        panel.innerHTML = "<div style='padding:20px; color:#666; text-align:center;'>尚無公會佔領設施</div>";
    }
}