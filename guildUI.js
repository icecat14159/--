//當側邊攔開關按鈕按下
function toggleSidebar(){  
    const sidebar = document.getElementById("ui-sidebar"); //抓取開關按鈕CSS樣式
    const toggleBtn = document.getElementById("menu-toggle"); //側邊攔容器樣式
    
    if(sidebar.classList.contains("sidebar-open")){ //關閉時顯示選單圖示
        sidebar.classList.remove("sidebar-open"); //更改狀態
        sidebar.classList.add("sidebar-closed");
        toggleBtn.innerText = "☰"; //更改顯示圖示
    }else{    //開啟時顯示關閉圖示
        sidebar.classList.remove("sidebar-closed");
        sidebar.classList.add("sidebar-open");
        toggleBtn.innerText = "✕";
    }
}

//側邊攔分頁切換
function switchTab(tabName){
    //切換按鈕狀態
    document.querySelectorAll('.tab-btn').forEach(btn => { //找出所有 class=tab-btn 物件
        btn.classList.remove('active'); //先清除狀態
        if(btn.innerText.includes(tabName === 'selector' ? '列表' : '統計')){ //重新賦予狀態 //!!需改善
            btn.classList.add('active');
        }
    });

    //切換內容顯示
    const toolPanel = document.getElementById("tool-panel"); //公會列表功能部分CSS
    const selector = document.getElementById("guild-selector"); //公會列表公會部分CSS
    const leaderboard = document.getElementById("leaderboard-panel"); //設施統計部分CSS

    if(tabName === 'selector'){
        toolPanel.style.display = 'block';
        selector.style.display = 'flex';
        leaderboard.style.display = 'none';
    }else{
        toolPanel.style.display = 'none';
        selector.style.display = 'none';
        leaderboard.style.display = 'block';
        updateLeaderboard(); //切換過來時刷新數據
    }
}

let isQuickFillActive = false; //是否啟用快速佔領
//提供 hex.js 讀取快速佔領啟用狀態
function getQuickFillStatus(){
    return isQuickFillActive;
}

//切換快速佔領
function toggleQuickFill(){
    isQuickFillActive = !isQuickFillActive;
    const btn = document.getElementById("quick-fill-toggle");
    btn.innerText = `快速佔領：${isQuickFillActive ? "ON" : "OFF"}`; //按鈕文字變化
    btn.classList.toggle("active", isQuickFillActive); //加上或移除 active 類別
}

let isLandmarksHidden = false; //是否啟用地標顯示
//切換地標顯示
function toggleLandmarks(){
    isLandmarksHidden = !isLandmarksHidden;
    const btn = document.getElementById("landmark-toggle");
    const map = document.getElementById("hexMap");
    
    btn.innerText = `隱藏地標：${isLandmarksHidden ? "ON" : "OFF"}`; //按鈕文字變化
    btn.classList.toggle("active", isLandmarksHidden); //加上或移除 active 類別
    map.classList.toggle("hide-landmarks", isLandmarksHidden); //加上或移除 hide-landmarks 類別 
}

//地圖階段切換
function setPhase(p) {
    updateMapPhase(p);
    document.querySelectorAll('.phase-btn').forEach(btn => { //檢查每個按鈕
        btn.classList.remove('active');
        if (btn.innerText.includes(p === 1 ? "一" : p === 2 ? "二" : "三")) { //為選中的按鈕加上 active 類別
            btn.classList.add('active');
        }
    });
}

//戰術標記狀態
let currentMarkerTool = null; // null, 'attack', 'defend', 'ban', 'warn', 'clear'
let currentMarkerValue = ""; //戰術標記數值

//戰術標記模式
function selectMarkerTool(type) {
    if (currentMarkerTool === type) { //點擊相同標記按鈕時退出
        currentMarkerTool = null;
    } else {
        currentMarkerTool = type;
    }

    document.querySelectorAll('.marker-btn').forEach(btn => { //找被選中的按鈕
        btn.classList.remove('active');
        if (currentMarkerTool === type && btn.classList.contains(type)) {
            btn.classList.add('active'); //加入樣式
        }
    });

    //更改文字提示
    const statusText = document.getElementById("marker-status");
    if (!currentMarkerTool) { //如果退出狀態
        statusText.innerText = "目前模式：無 (點擊佔領)";
        statusText.style.color = "#aaa";
    } else { //依模式改變顯示
        const names = { attack: "進攻", defend: "防守", ban: "禁止", warn: "注意", clear: "清除" };
        statusText.innerText = `目前模式：${names[type]}`;
        statusText.style.color = "#fff";
    }
}

//填入數值
function updateMarkerValue(val) {
    currentMarkerValue = val.trim();
}

//提供 hex.js 讀取戰術標記變數
function getMarkerToolStatus() {
    return {
        type: currentMarkerTool,
        value: currentMarkerValue
    };
}

//整理至此
// 狀態管理
let currentGuildId = 0;
let editingGuildId = null;

//提供 hex.js 讀取
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

// 初始化
document.addEventListener("DOMContentLoaded", renderGuildSelectors);

// --- 排行榜統計邏輯 ---
// 定義設施分數表
const SCORE_RULES = {
    "水手酒館": { periodic: 100, final: 200 },
    "海上餐廳": { periodic: 150, final: 300 },
    "沈船點":   { periodic: 270, final: 1080 },
    "珍寶點":   { periodic: 800, final: 9600 },
    "人魚島":   { periodic: 0,   final: 0 }
};
function updateLeaderboard() {
    const panel = document.getElementById("leaderboard-panel");
    if (panel.style.display === 'none') return;

    panel.innerHTML = "";
    
    // 統計資料結構：
    // stats[gId] = { 
    //    validTotal: 0,      // 有效數量 (排序用)
    //    maxPriority: 0,     // 最高權重 (排序用)
    //    periodicScore: 0,   // 定給分總計
    //    finalScore: 0,      // 結算分總計
    //    items: { "設施名": { count: 0, priority: 0 } } 
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
            stats[gId] = { 
                validTotal: 0, 
                maxPriority: 0, 
                periodicScore: 0, 
                finalScore: 0, 
                items: {} 
            };
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
            itemPriority = -1; 
        } else {
            // 有效設施：更新公會的統計數據
            stats[gId].validTotal++;
            if (itemPriority > stats[gId].maxPriority) {
                stats[gId].maxPriority = itemPriority;
            }
            // --- 累加分數 ---
            const rules = SCORE_RULES[name] || { periodic: 0, final: 0 };
            stats[gId].periodicScore += rules.periodic;
            stats[gId].finalScore += rules.final;
        }

        // 統計該項目的數量 (分開統計 "水手酒館" 與 "水手酒館(被封鎖)")
        if (!stats[gId].items[displayName]) {
            stats[gId].items[displayName] = { count: 0, priority: itemPriority };
        }
        stats[gId].items[displayName].count++;
    });

    // 2. 排序公會
    const sortedGuilds = Object.keys(stats)
        .map(id => parseInt(id))
        .filter(id => Object.keys(stats[id].items).length > 0)
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
        //計分資訊
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

