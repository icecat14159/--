const svg = document.getElementById("hexMap");
const viewport = document.getElementById("viewport");

const HEX_SIZE = 30;        // 六邊形半徑
const COLS = 29;            // 寬格數
const ROWS = 29;             // 高格數

const HEX_WIDTH = 2 * HEX_SIZE; //每格寬
const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE; //每格高

const MAP_WIDTH = (COLS - 1) * (HEX_SIZE * 1.5) + HEX_SIZE * 2;
const MAP_HEIGHT = ROWS * HEX_HEIGHT + HEX_HEIGHT / 2;

// SVG 尺寸
svg.setAttribute("width", MAP_WIDTH);
svg.setAttribute("height", MAP_HEIGHT);

// 六邊形六個角
function hexPoints(cx, cy, size) {
  const points = [];
  for (let i = 0; i < 6; i++) { //6頂點
    const angle = Math.PI / 180 * (60 * i); //弧度
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(" ");
}

function getFeatureAt(q, r) {
    const isBase = MAP_FEATURES.BASE.find(b => b.q === q && b.r === r);
    if (isBase) return { type: FEATURE_TYPES.BASE, guildId: isBase.guildId };
    
    const isFac = MAP_FEATURES.FACILITIES.find(f => f.q === q && f.r === r);
    if (isFac) return { type: FEATURE_TYPES.FACILITY, level: isFac.level };
    
    const isObs = MAP_FEATURES.OBSTACLES.find(o => o.q === q && o.r === r);
    if (isObs) return { type: FEATURE_TYPES.OBSTACLE };
    
    return null;
}

// 重構：統一的佔領函式
function occupyTile(element) {
  const type = element.dataset.type;
  // 據點與障礙物不可被變更佔領
  if (type === FEATURE_TYPES.BASE || type === FEATURE_TYPES.OBSTACLE) return;

  const guildId = getCurrentGuildId();
  element.dataset.guildId = guildId;
  element.style.fill = GUILD_CONFIG[guildId].color;
  // 設施可以被佔領，但顏色變更時應保留發光邊框（由 CSS class 控制）
  updateConnectivity(); 
}

const gridLayer = document.getElementById("grid-layer");
const effectLayer = document.getElementById("effect-layer");
// 建立棋盤
for (let q = 0; q < COLS; q++) {
  for (let r = 0; r < ROWS; r++) {
    // 水平間距
    const x = q * (HEX_SIZE * 1.5) + HEX_SIZE;
    // 垂直間距
    let y = r * HEX_HEIGHT + HEX_HEIGHT/2;
    // 奇數列向上偏移半高
    if (q % 2 === 1) {
      y -= HEX_HEIGHT / 2;
    }

    const hex = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    hex.setAttribute("points", hexPoints(x, y, HEX_SIZE));
    hex.setAttribute("class", "hex");
    
    hex.dataset.q = q;
    hex.dataset.r = r;

    hex.dataset.guildId = 0; // 初始公會為中立
    hex.dataset.type = TILE_TYPES.LAND; // 預設為可佔領格
    hex.dataset.id = `${q},${r}`;

    const feature = getFeatureAt(q, r);

    if (feature) {
      hex.dataset.type = feature.type;
      if (feature.type === FEATURE_TYPES.BASE) {
        hex.dataset.guildId = feature.guildId;
        hex.style.fill = GUILD_CONFIG[feature.guildId].color;
        addSpecialEffect(x, y, "hex-base", "🚢");
      } else if (feature.type === FEATURE_TYPES.FACILITY) {
        hex.dataset.level = feature.level;
        const icon = feature.level >= 3 ? "🏯" : "🏠";
        addSpecialEffect(x, y, "hex-facility", icon);
      } else if (feature.type === FEATURE_TYPES.OBSTACLE) {
        hex.style.fill = "#ff4444";
        addSpecialEffect(x, y, "hex-obstacle", "🪨");
      }
    }
    
    // 新增：滑鼠移入事件
    hex.addEventListener("mouseenter", function() {
        // 只有在「快速佔領開啟」且「滑鼠左鍵按下」時才觸發
        if (getQuickFillStatus() && isMouseDown) {
            occupyTile(this);
        }
    });

    // 修改原有的點擊事件
    hex.addEventListener("click", function(e) {
        if (getQuickFillStatus()) return; // 快速模式下交由 mouseenter 處理
        
        // 判斷是否為拖曳而非點擊
        if (Math.abs(e.clientX - (startX + translateX)) > 5 || 
            Math.abs(e.clientY - (startY + translateY)) > 5) return;

        occupyTile(this);
    });

    gridLayer.appendChild(hex);

    // 為每一格建立專屬的封鎖叉號
    const blockedMark = document.createElementNS("http://www.w3.org/2000/svg", "g");
    blockedMark.setAttribute("class", "hex-blocked-mark");
    blockedMark.setAttribute("id", `block-${q}-${r}`);

    // 繪製叉號的兩條線
    const offset = HEX_SIZE * 0.4;

    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute("x1", x - offset); line1.setAttribute("y1", y - offset);
    line1.setAttribute("x2", x + offset); line1.setAttribute("y2", y + offset); // 修正點：這裡原本寫成 line2.setAttribute

    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line"); // 修正點：確保 line2 有被宣告
    line2.setAttribute("x1", x + offset); line2.setAttribute("y1", y - offset);
    line2.setAttribute("x2", x - offset); line2.setAttribute("y2", y + offset);

    blockedMark.appendChild(line1);
    blockedMark.appendChild(line2);
    effectLayer.appendChild(blockedMark);
  }
}

// 輔助函式：在地圖上放圖示
function addSpecialEffect(cx, cy, className, iconText) {
    // 1. 建立一個虛擬的發光層（僅有邊框，填色透明）
    const effectHex = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    effectHex.setAttribute("points", hexPoints(cx, cy, HEX_SIZE));
    effectHex.setAttribute("class", `hex-effect ${className}`);
    effectHex.setAttribute("fill", "transparent");
    effectHex.style.pointerEvents = "none"; // 不干擾點擊
    effectLayer.appendChild(effectHex);

    // 2. 建立圖示
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", cx);
    text.setAttribute("y", cy);
    text.setAttribute("class", "hex-icon");
    text.textContent = iconText;
    effectLayer.appendChild(text);
}

window.updateMapColors = function(guildId, newColor) {
  const targets = document.querySelectorAll(`.hex[data-guild-id="${guildId}"]`);
  targets.forEach(hex => {
    hex.style.fill = newColor;
  });
};

//縮放與拖曳
let scale = 1;  //縮放
let translateX = 0; //左右拖
let translateY = 0; //上下拖
let isDragging = false;
let startX, startY;

// 更新畫面變換
function updateTransform() {
  viewport.setAttribute("transform", `translate(${translateX}, ${translateY}) scale(${scale})`);
}

//拖曳邊界
function clampTranslate() {
  const rect = svg.getBoundingClientRect();

  const viewW = rect.width;
  const viewH = rect.height;

  const mapW = MAP_WIDTH * scale;
  const mapH = MAP_HEIGHT * scale;

  //彈性邊界
  const OVER_SCROLL = 150;

  // 計算 X 軸邊界
  let minX, maxX;
  if (mapW <= viewW) {
    // 地圖比視窗小：固定在左側 (0) 或 稍微偏移
    minX = -OVER_SCROLL;
    maxX = OVER_SCROLL;
  } else {
    // 地圖比視窗大：限制拖曳範圍
    minX = viewW - mapW - OVER_SCROLL;
    maxX = OVER_SCROLL;
  }

  // 計算 Y 軸邊界
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
svg.addEventListener("wheel", (e) => {
  e.preventDefault(); // 防止網頁捲動

  const zoomSpeed = 0.1;
  const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
  const oldScale = scale;
  
  // 限制縮放範圍
  scale = Math.min(Math.max(0.4, scale + delta), 2);

  // 計算縮放中心偏移（讓縮放跟隨鼠標）
  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // 補償位移量，使鼠標指向的座標在縮放前後保持一致
  translateX -= (mouseX - translateX) * (scale / oldScale - 1);
  translateY -= (mouseY - translateY) * (scale / oldScale - 1);

  clampTranslate();
  updateTransform();
}, { passive: false });

let isMouseDown = false; // 新增全域變數
// --- 滑鼠拖曳 ---
svg.addEventListener("mousedown", (e) => {
  isMouseDown = true; // 紀錄滑鼠按下
  // 如果快速佔領關閉，才執行原本的拖曳初始化
  if (!getQuickFillStatus()) {
    if (e.target.tagName === "svg" || e.target.tagName === "polygon") {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        svg.style.cursor = "grabbing";
    }
  } else if (e.target.tagName === "polygon") {
    // 快速模式下，點下去的那一格也要佔領
    occupyTile(e.target);
  }
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  
  translateX = e.clientX - startX;
  translateY = e.clientY - startY;
  
  clampTranslate();
  updateTransform();
});

window.addEventListener("mouseup", () => {
  isMouseDown = false;
  isDragging = false;
  svg.style.cursor = "default";
});

function initMapPosition() {
  const rect = svg.getBoundingClientRect();
  // 將地圖中心對準視窗中心
  translateX = (rect.width - MAP_WIDTH * scale) / 2;
  translateY = (rect.height - MAP_HEIGHT * scale) / 2;
  
  // 執行一次邊界檢查，確保不超出我們設定的彈性範圍
  clampTranslate(); 
  updateTransform();
}

// 在生成完所有格子後執行
initMapPosition();

// 如果視窗大小改變，重新調整位置
window.addEventListener('resize', initMapPosition);

