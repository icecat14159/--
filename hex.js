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

//六邊形六個角點座標
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

//轉換 q, r 座標
function hexToPixel(q, r) {
    const x = q * (HEX_SIZE * 1.5) + HEX_SIZE;
    let y = r * HEX_HEIGHT + HEX_HEIGHT / 2;
    if (q % 2 === 1) {
        y -= HEX_HEIGHT / 2;
    }
    return { x, y };
}

function getFeatureAt(q, r) {
    const isBase = MAP_FEATURES.BASE.find(b => b.q === q && b.r === r);
    if (isBase) return { type: FEATURE_TYPES.BASE, guildId: isBase.guildId };
    
    const isFac = MAP_FEATURES.FACILITIES.find(f => f.q === q && f.r === r);
    if (isFac) return { type: FEATURE_TYPES.FACILITY, level: isFac.level, name: isFac.name};
    
    const isBuff = MAP_FEATURES.BUFFS.find(b => b.q === q && b.r === r);
    if (isBuff) return { type: FEATURE_TYPES.BUFF, name: isBuff.name };

    const isObs = MAP_FEATURES.OBSTACLES.find(o => o.q === q && o.r === r);
    if (isObs) return { type: FEATURE_TYPES.OBSTACLE };
    
    return null;
}

// 重構：統一的佔領函式
function occupyTile(element, isClickAction = false) {
    if (element.dataset.restricted === "true") {
        return;
    }
    const type = element.dataset.type;
    if (type === FEATURE_TYPES.BASE || type === FEATURE_TYPES.OBSTACLE) return;

    const guildId = getCurrentGuildId();
    element.dataset.guildId = guildId;

    if (guildId === 0) {
        // 關鍵修正：如果是公海，清除行內樣式，讓 CSS :hover 生效
        element.style.fill = ""; 
    } else {
        // 其他公會則設定顏色
        element.style.fill = GUILD_CONFIG[guildId].color;
    }
}

//重計算函式
function refreshAllLogic() {
    updateConnectivity(); //重算連通性
    updateGuildOutlines(); //重算公會邊界
    updateIndicators(); //重算戰術箭頭
    updateLeaderboard(); //重算排行榜
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

    /*if (feature) { ///廢棄
      hex.dataset.type = feature.type;
      if (feature.type === FEATURE_TYPES.BASE) {
        hex.dataset.guildId = feature.guildId;
        hex.style.fill = GUILD_CONFIG[feature.guildId].color;
        addSpecialEffect(x, y, "hex-base", "🚢");
      }else if (feature.type === FEATURE_TYPES.FACILITY) {
        hex.dataset.level = feature.level;
        const icon = feature.level >= 3 ? "🏯" : "🏠";
        addSpecialEffect(x, y, "hex-facility", icon);
      }else if (feature.type === FEATURE_TYPES.BUFF) {
        addSpecialEffect(x, y, "hex-buff", "🧜‍♀️");
      }else if (feature.type === FEATURE_TYPES.OBSTACLE) {
        hex.classList.add("hex-obstacle");
      }
    }*/

    if (feature) {
      hex.dataset.type = feature.type;
      if (feature.type === FEATURE_TYPES.BASE) {
        hex.dataset.guildId = feature.guildId;
        hex.style.fill = GUILD_CONFIG[feature.guildId].color;
        addFeatureImage(x, y, "公會船"); // 替換

      } else if (feature.type === FEATURE_TYPES.FACILITY) {
        hex.dataset.level = feature.level;
        addFeatureImage(x, y, feature.name); // 直接傳入設施名稱(水手酒館, 珍寶點等)

      } else if (feature.type === FEATURE_TYPES.BUFF) {
        addFeatureImage(x, y, "人魚島"); // 替換

      } else if (feature.type === FEATURE_TYPES.OBSTACLE) {
        hex.classList.add("hex-obstacle");
      }
    }
    
    //滑鼠移入事件
    hex.addEventListener("mouseenter", function() {
        if (getQuickFillStatus() && isMouseDown) { //只在快速佔領開啟且滑鼠左鍵按下時才觸發
            occupyTile(this);
        }
    });

    //滑鼠點擊事件
    hex.addEventListener("click", function(e) {
        if (getQuickFillStatus()) return; //快速佔領模式時改由 mouseenter 處理
        
        const distMoved = Math.hypot(translateX - dragStartTranslateX, translateY - dragStartTranslateY);
        if (distMoved > 3) return; //撇除拖曳行為
        
        const markerStatus = getMarkerToolStatus(); //判斷目前模式
        if (markerStatus.type) {
            placeMarker(this, markerStatus.type, markerStatus.value); //進行標記
        } else {
            occupyTile(this); //進行佔領
            refreshAllLogic(); //重計算
        }
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

//廢棄 - 地圖上放圖示
/*
function addSpecialEffect(cx, cy, className, iconText) {
    // 1. 建立一個虛擬的發光層（僅有邊框，填色透明）
    const effectHex = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    effectHex.setAttribute("points", hexPoints(cx, cy, HEX_SIZE*0.9));
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
}*/

//繪製設施底圖
function addFeatureImage(cx, cy, featureName) {
    const asset = IMAGE_ASSETS[featureName];
    if (!asset || !asset.url) return; //沒找到就退出

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

//地圖上建立戰術標記
function placeMarker(hexElement, type, value) {
    const q = parseInt(hexElement.dataset.q);
    const r = parseInt(hexElement.dataset.r);
    
    const existingMarker = document.getElementById(`marker-${q}-${r}`);
    if (existingMarker) { //清除該格既有標記
        existingMarker.remove();
    }

    //清除模式下刪完就結束
    if (type === 'clear') return;

    //設定繪製座標
    const { x, y } = hexToPixel(q, r);
    const offsetX = 0;
    const offsetY = -HEX_SIZE * 0.45; //稍微向上偏移
    const pinX = x + offsetX;
    const pinY = y + offsetY;

    //定義顏色與圖示
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
    const settings = config[type]; //取得目前選擇模式
    if (!settings) return; //防錯機制 無模式立即退出

    //建立標記主容器
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("id", `marker-${q}-${r}`);
    group.setAttribute("class", "map-marker-group");
    group.setAttribute("transform", `translate(${pinX}, ${pinY})`);

    //繪製圖釘針頭
    const pinPoint = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pinPoint.setAttribute("d", "M -5,0 L 0,13 L 5,0 Z");
    pinPoint.setAttribute("class", "map-marker-pin");
    pinPoint.setAttribute("transform", "translate(0, 5)");
    group.appendChild(pinPoint);

    //繪製圖釘圓頭
    const head = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    head.setAttribute("cx", 0);
    head.setAttribute("cy", 0);
    head.setAttribute("r", HEX_SIZE * 0.35);
    head.setAttribute("fill", settings.color); //填入當前模式顏色
    head.setAttribute("class", "map-marker-head");
    group.appendChild(head);

    //顯示內容
    if (value && value.length > 0) { //有數值時
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", 0);
        text.setAttribute("y", 1);
        text.setAttribute("class", "map-marker-text");
        text.textContent = value;
        text.style.fontSize = (value.length >= 5) ? "7px" : (value.length >= 3) ? "9px" : "11px"; //依數值字數改變大小
        group.appendChild(text);
    } else { //無數值時
        const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        iconPath.setAttribute("d", settings.path); //繪製圖案
        iconPath.setAttribute("class", "map-marker-icon");
        iconPath.setAttribute("transform", "scale(0.55) translate(-12, -12)");
        group.appendChild(iconPath);
    }
    document.getElementById("mark-layer").appendChild(group); //加入到標記圖層
}

window.updateMapColors = function(guildId, newColor) {
  const targets = document.querySelectorAll(`.hex[data-guild-id="${guildId}"]`);
  targets.forEach(hex => {
    hex.style.fill = newColor;
  });
};

function drawHexBoundary(q, r, sideIndex, color) {
    const { x, y } = hexToPixel(q, r);
    // 關鍵：使用與 hexPoints 完全一致的邏輯
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i);
        points.push({
            x: x + HEX_SIZE*0.9 * Math.cos(angle),
            y: y + HEX_SIZE*0.9 * Math.sin(angle)
        });
    }

    // 取得該邊的兩個端點
    const p1 = points[sideIndex];
    const p2 = points[(sideIndex + 1) % 6];

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", p1.x); line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x); line.setAttribute("y2", p2.y);
    
    // 視覺微調：使用顏色與發光
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "4"); 
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("class", "guild-outline");
    line.style.filter = `drop-shadow(0 0 3px ${color})`;
    line.style.pointerEvents = "none";
    
    document.getElementById("effect-layer").appendChild(line);
}

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
let wheelTimeout;
svg.addEventListener("wheel", (e) => {
  e.preventDefault(); // 防止網頁捲動

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
  isMouseDown = true;
  dragStartTranslateX = translateX;
  dragStartTranslateY = translateY;
  // 如果快速佔領關閉，才執行原本的拖曳初始化
  if (!getQuickFillStatus()) {
    if (e.target.tagName === "svg" || e.target.tagName === "polygon") {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        svg.style.cursor = "grabbing";
        svg.classList.add("is-interacting");
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
  if (isMouseDown) {
      refreshAllLogic();
  }
  isMouseDown = false;
  isDragging = false;
  svg.style.cursor = "default";
  svg.classList.remove("is-interacting");
});

function updateBackgroundSize() {
    const bg = document.getElementById("map-background");
    if (bg) {
        // 讓圖片寬度等於地圖計算出來的總寬度
        bg.setAttribute("width", MAP_WIDTH);
        bg.setAttribute("height", MAP_HEIGHT);
        
        // 稍微調整位移，補足六角格生成的邊際空間
        bg.setAttribute("x", 0);
        bg.setAttribute("y", -(HEX_HEIGHT/2));
        
        // 調整底圖透明度，方便觀察格子覆蓋情況
        bg.setAttribute("opacity", "0.6"); 
    }
}

function initMapPosition() {
  updateBackgroundSize();

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

setTimeout(() => {
    if (typeof updateMapPhase === "function") {
        updateMapPhase(1); // 預設開啟第一期
    }
}, 100);