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
        const gId = parseInt(hex.dataset.guildId || 0);
        
        if (!isLandmarksHidden && (type === 'facility' || type === 'buff')) {
            // 顯示地標專屬色
            hex.style.fill = (type === 'facility') ? "#ffd70090" : "#00ffff90";
        } else {
            // 顯示所屬公會顏色 (gId 0 為公海色)
            hex.style.fill = GUILD_CONFIG[gId].color;
        }
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

// 初始化
document.addEventListener("DOMContentLoaded", renderGuildSelectors);