// hex.js - 六角網格地圖渲染與互動

const svg = document.getElementById("hexMap");
const viewport = document.getElementById("viewport");

const HEX_SIZE = 30;                            // 六邊形半徑
const COLS = 29;                                // 橫向格數
const ROWS = 29;                                // 縱向格數

const HEX_WIDTH = 2 * HEX_SIZE;                 // 每格外接圓直徑寬
const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;     // 每格高

const MAP_WIDTH = (COLS - 1) * (HEX_SIZE * 1.5) + HEX_SIZE * 2;
const MAP_HEIGHT = ROWS * HEX_HEIGHT + HEX_HEIGHT / 2;

// 設定 SVG 尺寸
svg.setAttribute("width", MAP_WIDTH);
svg.setAttribute("height", MAP_HEIGHT);

// 拖曳與滑鼠狀態
let dragStartTranslateX = 0;
let dragStartTranslateY = 0;
let isMouseDown = false;
let isDragging = false;
let startX = 0, startY = 0;
let scale = 1;
let translateX = 0;
let translateY = 0;

// 計算六邊形六個頂點座標 (平頂六角形)
function hexPoints(cx, cy, size) {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i);
        const x = cx + size * Math.cos(angle);
        const y = cy + size * Math.sin(angle);
        points.push(`${x},${y}`);
    }
    return points.join(" ");
}

// 軸座標 (q, r) 轉像素中心 (x, y) (平頂，奇數列往上偏移)
function hexToPixel(q, r) {
    const x = q * (HEX_SIZE * 1.5) + HEX_SIZE;
    let y = r * HEX_HEIGHT + HEX_HEIGHT / 2;
    if (q % 2 === 1) {
        y -= HEX_HEIGHT / 2;
    }
    return { x, y };
}

// 取得特定座標的地圖要素
function getFeatureAt(q, r) {
    const isBase = MAP_FEATURES.BASE.find(b => b.q === q && b.r === r);
    if (isBase) return { type: FEATURE_TYPES.BASE, guildId: isBase.guildId };
    
    const isFac = MAP_FEATURES.FACILITIES.find(f => f.q === q && f.r === r);
    if (isFac) return { type: FEATURE_TYPES.FACILITY, level: isFac.level, name: isFac.name };
    
    const isBuff = MAP_FEATURES.BUFFS.find(b => b.q === q && b.r === r);
    if (isBuff) return { type: FEATURE_TYPES.BUFF, name: isBuff.name };

    const isObs = MAP_FEATURES.OBSTACLES.find(o => o.q === q && o.r === r);
    if (isObs) return { type: FEATURE_TYPES.OBSTACLE };
    
    return null;
}

// 統一佔領函式
function occupyTile(element) {
    if (element.dataset.restricted === "true") return;
    const type = element.dataset.type;
    if (type === FEATURE_TYPES.BASE || type === FEATURE_TYPES.OBSTACLE) return;

    const guildId = getCurrentGuildId();
    element.dataset.guildId = guildId;

    if (guildId === 0) {
        element.style.fill = ""; 
    } else {
        element.style.fill = GUILD_CONFIG[guildId].color;
    }
}

// 重計算全地圖邏輯與標籤
function refreshAllLogic() {
    updateConnectivity();      // 連通性檢查 (封鎖判斷)
    updateGuildOutlines();     // 領地外圍發光邊框
    updateIndicators();        // 人魚島與封鎖箭頭指示
    updateBaseLabels();        // 項目 1：公會據點(船)名稱
    updateTerritoryLabels();   // 項目 2：公會最大片佔領海域勢力名稱
    updateLeaderboard();       // 設施統計數據
}

// --- 項目 3：筆刷演算法與視覺預覽 ---

// 利用 BFS 計算筆刷半徑內的全部格子
function getBrushHexes(centerQ, centerR, brushSize) {
    const radius = brushSize - 1;
    const result = [];
    const visited = new Set();
    const queue = [{ q: centerQ, r: centerR, dist: 0 }];
    visited.add(`${centerQ},${centerR}`);

    while (queue.length > 0) {
        const { q, r, dist } = queue.shift();
        const hex = document.querySelector(`.hex[data-q="${q}"][data-r="${r}"]`);
        if (hex) {
            result.push(hex);
        }

        if (dist < radius) {
            getNeighbors(q, r).forEach(n => {
                const key = `${n.q},${n.r}`;
                if (!visited.has(key) && n.q >= 0 && n.q < COLS && n.r >= 0 && n.r < ROWS) {
                    visited.add(key);
                    queue.push({ q: n.q, r: n.r, dist: dist + 1 });
                }
            });
        }
    }
    return result;
}

// 判斷目前是否處於「公會佔領」狀態（佔領模式且非戰術標記）
function isGuildOccupyMode() {
    return typeof getInteractionMode === "function" &&
           getInteractionMode() === "occupy" &&
           !getMarkerToolStatus().type;
}

// 高亮顯示筆刷涵蓋格子
function highlightBrushHover(centerHex) {
    clearBrushHover();
    if (!isGuildOccupyMode()) return;

    const q = parseInt(centerHex.dataset.q);
    const r = parseInt(centerHex.dataset.r);
    const hexes = getBrushHexes(q, r, getBrushSize());

    hexes.forEach(h => {
        if (h.dataset.restricted !== "true" && h.dataset.type !== FEATURE_TYPES.OBSTACLE) {
            h.classList.add("brush-hover");
        }
    });
}

// 清除筆刷高亮
function clearBrushHover() {
    document.querySelectorAll(".hex.brush-hover").forEach(h => h.classList.remove("brush-hover"));
}

// 執行筆刷範圍塗抹佔領
function paintWithBrush(centerHex) {
    const q = parseInt(centerHex.dataset.q);
    const r = parseInt(centerHex.dataset.r);
    const hexes = getBrushHexes(q, r, getBrushSize());
    hexes.forEach(h => occupyTile(h));
}

// --- 初始化生成棋盤 ---
const gridLayer = document.getElementById("grid-layer");
const effectLayer = document.getElementById("effect-layer");

for (let q = 0; q < COLS; q++) {
    for (let r = 0; r < ROWS; r++) {
        const { x, y } = hexToPixel(q, r);

        const hex = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        hex.setAttribute("points", hexPoints(x, y, HEX_SIZE));
        hex.setAttribute("class", "hex");
        
        hex.dataset.q = q;
        hex.dataset.r = r;
        hex.dataset.guildId = 0; // 初始為公海中立
        hex.dataset.type = TILE_TYPES.LAND;
        hex.dataset.id = `${q},${r}`;

        const feature = getFeatureAt(q, r);

        if (feature) {
            hex.dataset.type = feature.type;
            if (feature.type === FEATURE_TYPES.BASE) {
                hex.dataset.guildId = feature.guildId;
                hex.style.fill = GUILD_CONFIG[feature.guildId].color;
                addFeatureImage(x, y, "公會船");
            } else if (feature.type === FEATURE_TYPES.FACILITY) {
                hex.dataset.level = feature.level;
                addFeatureImage(x, y, feature.name);
            } else if (feature.type === FEATURE_TYPES.BUFF) {
                addFeatureImage(x, y, "人魚島");
            } else if (feature.type === FEATURE_TYPES.OBSTACLE) {
                hex.classList.add("hex-obstacle");
            }
        }
        
        // 滑鼠移入：在公會佔領狀態下顯示筆刷範圍預覽，若開啟快速佔領並按住左鍵則連續塗抹
        hex.addEventListener("mouseenter", function() {
            if (isGuildOccupyMode()) {
                highlightBrushHover(this);
                if (getQuickFillStatus() && isMouseDown) {
                    paintWithBrush(this);
                }
            }
        });

        // 點擊事件：觀察模式不觸發；佔領模式下依共用狀態執行標記或筆刷點擊佔領
        hex.addEventListener("click", function(e) {
            if (typeof getInteractionMode === "function" && getInteractionMode() === "observe") return;
            if (getQuickFillStatus() && isGuildOccupyMode()) return; // 快速佔領改由 mousedown/mouseenter 處理
            
            const distMoved = Math.hypot(translateX - dragStartTranslateX, translateY - dragStartTranslateY);
            if (distMoved > 3) return; // 拖曳時不觸發點擊
            
            const markerStatus = getMarkerToolStatus();
            if (markerStatus.type) {
                placeMarker(this, markerStatus.type, markerStatus.value);
            } else {
                paintWithBrush(this); // 同步套用筆刷大小於點擊佔領
                refreshAllLogic();
            }
        });

        gridLayer.appendChild(hex);

        // 建立封鎖叉號標誌
        const blockedMark = document.createElementNS("http://www.w3.org/2000/svg", "g");
        blockedMark.setAttribute("class", "hex-blocked-mark");
        blockedMark.setAttribute("id", `block-${q}-${r}`);

        const offset = HEX_SIZE * 0.4;
        const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line1.setAttribute("x1", x - offset); line1.setAttribute("y1", y - offset);
        line1.setAttribute("x2", x + offset); line1.setAttribute("y2", y + offset);

        const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line2.setAttribute("x1", x + offset); line2.setAttribute("y1", y - offset);
        line2.setAttribute("x2", x - offset); line2.setAttribute("y2", y + offset);

        blockedMark.appendChild(line1);
        blockedMark.appendChild(line2);
        effectLayer.appendChild(blockedMark);
    }
}

// 繪製設施與公會船底圖
function addFeatureImage(cx, cy, featureName) {
    const asset = IMAGE_ASSETS[featureName];
    if (!asset || !asset.url) return;

    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttribute("href", asset.url);
    img.setAttribute("class", "feature-image");

    const sizeW = HEX_WIDTH * asset.scaleW;
    const sizeH = HEX_HEIGHT * asset.scaleH;
    
    img.setAttribute("width", sizeW);
    img.setAttribute("height", sizeH);
    img.setAttribute("x", cx - (sizeW / 2) + asset.offsetX);
    img.setAttribute("y", cy - (sizeH / 2) + asset.offsetY);
    
    document.getElementById("feature-image-layer").appendChild(img);
}

// 地圖上建立戰術標記
function placeMarker(hexElement, type, value) {
    const q = parseInt(hexElement.dataset.q);
    const r = parseInt(hexElement.dataset.r);
    
    const existingMarker = document.getElementById(`marker-${q}-${r}`);
    if (existingMarker) {
        existingMarker.remove();
    }

    if (type === 'clear') return;

    const { x, y } = hexToPixel(q, r);
    const pinX = x;
    const pinY = y - HEX_SIZE * 0.45;

    const config = {
        attack: { 
            color: "#fd7e14",
            path: "M 4 21 L 2 19 L 4 17 L 1 14 L 3 12 L 6 15 L 18 3 L 20 3 L 20 5 L 8 17 L 11 20 L 9 22 L 6 19 Z M 6 3 L 4 3 L 4 5 L 10 11 L 12 9 Z M 12 13 L 16 17 L 13 20 L 15 22 L 18 19 L 20 21 L 22 19 L 20 17 L 23 14 L 21 12 L 18 15 L 14 11 Z"
        },
        defend: { 
            color: "#007bff", 
            path: "M12,1L3,5v6c0,5.55,3.84,10.74,9,12c5.16-1.26,9-6.45,9-12V5L12,1z M12,11.99h7c-0.53,4.12-3.28,7.79-7,8.94V12H5V6.3 l7-3.11V11.99z"
        },
        ban: { 
            color: "#dc3545", 
            path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.84.62-3.54 1.66-4.92L16.92 18.34C15.54 19.38 13.84 20 12 20zm8-8c0 1.84-.62 3.54-1.66 4.92L7.08 5.66C8.46 4.62 10.16 4 12 4c4.41 0 8 3.59 8 8z"
        },
        warn: { 
            color: "#ffc107", 
            path: "M1,21h22L12,2L1,21z M13,18h-2v-2h2V18z M13,14h-2v-4h2V14z"
        }
    };
    const settings = config[type];
    if (!settings) return;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("id", `marker-${q}-${r}`);
    group.setAttribute("class", "map-marker-group");
    group.setAttribute("transform", `translate(${pinX}, ${pinY})`);

    const pinPoint = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pinPoint.setAttribute("d", "M -5,0 L 0,13 L 5,0 Z");
    pinPoint.setAttribute("class", "map-marker-pin");
    pinPoint.setAttribute("transform", "translate(0, 5)");
    group.appendChild(pinPoint);

    const head = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    head.setAttribute("cx", 0);
    head.setAttribute("cy", 0);
    head.setAttribute("r", HEX_SIZE * 0.35);
    head.setAttribute("fill", settings.color);
    head.setAttribute("class", "map-marker-head");
    group.appendChild(head);

    if (value && value.length > 0) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", 0);
        text.setAttribute("y", 1);
        text.setAttribute("class", "map-marker-text");
        text.textContent = value;
        text.style.fontSize = (value.length >= 5) ? "7px" : (value.length >= 3) ? "9px" : "11px";
        group.appendChild(text);
    } else {
        const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        iconPath.setAttribute("d", settings.path);
        iconPath.setAttribute("class", "map-marker-icon");
        iconPath.setAttribute("transform", "scale(0.55) translate(-12, -12)");
        group.appendChild(iconPath);
    }
    document.getElementById("mark-layer").appendChild(group);
}

// 提供公會更新顏色時刷新地圖
window.updateMapColors = function(guildId, newColor) {
    const targets = document.querySelectorAll(`.hex[data-guild-id="${guildId}"]`);
    targets.forEach(hex => {
        hex.style.fill = newColor;
    });
};

// 繪製六角單邊外框
function drawHexBoundary(q, r, sideIndex, color) {
    const { x, y } = hexToPixel(q, r);
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i);
        points.push({
            x: x + HEX_SIZE * 0.9 * Math.cos(angle),
            y: y + HEX_SIZE * 0.9 * Math.sin(angle)
        });
    }

    const p1 = points[sideIndex];
    const p2 = points[(sideIndex + 1) % 6];

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", p1.x); line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x); line.setAttribute("y2", p2.y);
    
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "4"); 
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("class", "guild-outline");
    line.style.filter = `drop-shadow(0 0 3px ${color})`;
    line.style.pointerEvents = "none";
    
    document.getElementById("effect-layer").appendChild(line);
}

// 變換矩陣更新
function updateTransform() {
    viewport.setAttribute("transform", `translate(${translateX}, ${translateY}) scale(${scale})`);
}

// 拖曳邊界限制
function clampTranslate() {
    const rect = svg.getBoundingClientRect();
    const viewW = rect.width;
    const viewH = rect.height;

    const mapW = MAP_WIDTH * scale;
    const mapH = MAP_HEIGHT * scale;
    const OVER_SCROLL = 150;

    let minX, maxX;
    if (mapW <= viewW) {
        minX = -OVER_SCROLL;
        maxX = OVER_SCROLL;
    } else {
        minX = viewW - mapW - OVER_SCROLL;
        maxX = OVER_SCROLL;
    }

    let minY, maxY;
    if (mapH <= viewH) {
        minY = -OVER_SCROLL;
        maxY = OVER_SCROLL;
    } else {
        minY = viewH - mapH - OVER_SCROLL;
        maxY = OVER_SCROLL;
    }

    translateX = Math.min(Math.max(translateX, minX), maxX);
    translateY = Math.min(Math.max(translateY, minY), maxY);
}

// --- 滾輪縮放 ---
let wheelTimeout;
svg.addEventListener("wheel", (e) => {
    e.preventDefault();

    if (!svg.classList.contains("is-interacting")) {
        svg.classList.add("is-interacting");
    }

    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
        svg.classList.remove("is-interacting");
    }, 100);

    const zoomSpeed = 0.1;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    const oldScale = scale;
    
    scale = Math.min(Math.max(0.4, scale + delta), 2);

    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    translateX -= (mouseX - translateX) * (scale / oldScale - 1);
    translateY -= (mouseY - translateY) * (scale / oldScale - 1);

    clampTranslate();
    updateTransform();
}, { passive: false });

// 禁用地圖右鍵選單 (方便右鍵拖曳)
svg.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

// 滑鼠離開地圖時清除筆刷預覽
svg.addEventListener("mouseleave", () => {
    clearBrushHover();
});

// --- 滑鼠按下 ---
svg.addEventListener("mousedown", (e) => {
    isMouseDown = true;
    dragStartTranslateX = translateX;
    dragStartTranslateY = translateY;

    // 滑鼠右鍵或中鍵，始終支援拖曳地圖
    if (e.button === 1 || e.button === 2) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        svg.style.cursor = "grabbing";
        svg.classList.add("is-interacting");
        return;
    }

    // 左鍵點擊
    if (typeof getInteractionMode === "function" && getInteractionMode() === "observe") {
        // 觀察模式：始終允許左鍵拖曳地圖
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        svg.style.cursor = "grabbing";
        svg.classList.add("is-interacting");
    } else if (!getQuickFillStatus() || !isGuildOccupyMode()) {
        // 佔領模式(非快速佔領)或標記模式：支援拖曳平移，短按於 click 觸發動作
        if (e.target.tagName === "svg" || e.target.tagName === "polygon" || e.target.id === "map-background") {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            svg.style.cursor = "grabbing";
            svg.classList.add("is-interacting");
        }
    } else if (e.target.classList.contains("hex")) {
        // 快速佔領模式：左鍵點擊立即塗抹佔領筆刷範圍
        paintWithBrush(e.target);
    }
});

// --- 滑鼠移動拖曳 ---
window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    
    clampTranslate();
    updateTransform();
});

// --- 滑鼠放開 ---
window.addEventListener("mouseup", () => {
    if (isMouseDown && getQuickFillStatus() && isGuildOccupyMode()) {
        refreshAllLogic(); // 快速佔領塗抹完畢後更新連通性、邊框、勢力標籤與計分
    }
    isMouseDown = false;
    isDragging = false;
    if (typeof updateMapCursor === "function") {
        updateMapCursor();
    } else {
        svg.style.cursor = "default";
    }
    svg.classList.remove("is-interacting");
});

// 更新底圖尺寸與透明度
function updateBackgroundSize() {
    const bg = document.getElementById("map-background");
    if (bg) {
        bg.setAttribute("width", MAP_WIDTH);
        bg.setAttribute("height", MAP_HEIGHT);
        bg.setAttribute("x", 0);
        bg.setAttribute("y", -(HEX_HEIGHT / 2));
        bg.setAttribute("opacity", "0.6"); 
    }
}

// 居中地圖初始位置
function initMapPosition() {
    updateBackgroundSize();

    const rect = svg.getBoundingClientRect();
    translateX = (rect.width - MAP_WIDTH * scale) / 2;
    translateY = (rect.height - MAP_HEIGHT * scale) / 2;
    
    clampTranslate(); 
    updateTransform();
}

// 執行地圖位置初始化
initMapPosition();

// 監聽視窗縮放
window.addEventListener('resize', initMapPosition);

// 延遲載入第一階段與標籤
setTimeout(() => {
    if (typeof updateBaseLabels === "function") {
        updateBaseLabels();
    }
    if (typeof updateMapPhase === "function") {
        updateMapPhase(1);
    }
}, 100);
