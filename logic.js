// logic.js - 核心遊戲與地圖邏輯

/**
 * 取得六邊形鄰居座標 (針對平頂、奇數列上偏移)
 */
function getNeighbors(q, r) {
    const isOdd = (q % 2 !== 0);
    // 對應 hexPoints 的 0-5 邊
    const directions = isOdd ? [
        [+1,  0], [ 0, +1], [-1,  0], [-1, -1], [ 0, -1], [+1, -1] 
    ] : [
        [+1, +1], [ 0, +1], [-1, +1], [-1,  0], [ 0, -1], [+1,  0]
    ];
    
    return directions.map(d => ({ q: q + d[0], r: r + d[1] }));
}

/**
 * 更新全地圖的連通狀態 (BFS 連通至據點檢測)
 */
function updateConnectivity() {
    // 1. 初始化：預設所有非中立格皆為封鎖
    const allHexes = document.querySelectorAll('.hex');
    allHexes.forEach(hex => {
        const q = hex.dataset.q;
        const r = hex.dataset.r;
        const mark = document.getElementById(`block-${q}-${r}`);
        
        if (hex.dataset.guildId !== "0") {
            hex.dataset.isBlocked = "true";
            hex.classList.add('is-blocked');
            if (mark) mark.style.display = "block"; // 顯示叉號
        } else {
            hex.dataset.isBlocked = "false";
            hex.classList.remove('is-blocked');
            if (mark) mark.style.display = "none";  // 隱藏叉號
        }
    });

    // 2. 遍歷 1-16 公會，從各家據點出發進行 BFS
    for (let gId = 1; gId <= 16; gId++) {
        const bases = document.querySelectorAll(`.hex[data-type="${TILE_TYPES.BASE}"][data-guild-id="${gId}"]`);
        
        const visited = new Set();
        const queue = [];

        bases.forEach(base => {
            const id = `${base.dataset.q},${base.dataset.r}`;
            queue.push(id);
            visited.add(id);
        });

        // BFS 搜尋
        while (queue.length > 0) {
            const currentId = queue.shift();
            const [q, r] = currentId.split(',').map(Number);
            
            // 標記目前這格為「未封鎖」
            const currentHex = document.querySelector(`.hex[data-q="${q}"][data-r="${r}"]`);
            if (currentHex) {
                currentHex.dataset.isBlocked = "false";
                currentHex.classList.remove('is-blocked');
                const mark = document.getElementById(`block-${q}-${r}`);
                if (mark) mark.style.display = "none"; // 連通則隱藏叉號
            }

            // 檢查鄰居
            getNeighbors(q, r).forEach(n => {
                const nId = `${n.q},${n.r}`;
                if (n.q < 0 || n.q >= COLS || n.r < 0 || n.r >= ROWS) return; // 邊界檢查
                
                const neighborHex = document.querySelector(`.hex[data-q="${n.q}"][data-r="${n.r}"]`);
                if (neighborHex && 
                    !visited.has(nId) && 
                    neighborHex.dataset.guildId == gId && 
                    neighborHex.dataset.type !== FEATURE_TYPES.OBSTACLE) {
                    
                    visited.add(nId);
                    queue.push(nId);
                }
            });
        }
    }
}

/**
 * 繪製各公會領地外框線
 */
function updateGuildOutlines() {
    document.querySelectorAll(".guild-outline").forEach(el => el.remove());

    const allHexes = document.querySelectorAll('.hex');
    allHexes.forEach(hex => {
        const q = parseInt(hex.dataset.q);
        const r = parseInt(hex.dataset.r);
        const gId = parseInt(hex.dataset.guildId);

        if (gId === 0) return;

        const guildColor = GUILD_CONFIG[gId].color;
        const neighbors = getNeighbors(q, r);

        neighbors.forEach((n, sideIndex) => {
            // 邊界檢查
            if (n.q < 0 || n.q >= COLS || n.r < 0 || n.r >= ROWS) {
                drawHexBoundary(q, r, sideIndex, guildColor);
                return;
            }

            const neighborHex = document.querySelector(`.hex[data-q="${n.q}"][data-r="${n.r}"]`);
            const neighborGId = neighborHex ? parseInt(neighborHex.dataset.guildId) : 0;

            // 只有當鄰居是不同公會時，才畫那一條邊
            if (neighborGId !== gId) {
                drawHexBoundary(q, r, sideIndex, guildColor);
            }
        });
    });
}

/**
 * 繪製狀態箭頭 (加成上三角 / 封鎖下三角)
 */
function updateIndicators() {
    document.querySelectorAll(".indicator-group").forEach(el => el.remove());
    
    const occupiedHexes = Array.from(document.querySelectorAll('.hex[data-guild-id]:not([data-guild-id="0"])'));
    const visitedGlobal = new Set();

    occupiedHexes.forEach(startHex => {
        const startCoord = `${startHex.dataset.q},${startHex.dataset.r}`;
        if (visitedGlobal.has(startCoord)) return;

        const gId = startHex.dataset.guildId;
        const component = [];
        const queue = [startCoord];
        visitedGlobal.add(startCoord);

        let hasBaseConnection = false;
        let buffInComponent = 0;

        while (queue.length > 0) {
            const coord = queue.shift();
            const [q, r] = coord.split(',').map(Number);
            const hex = document.querySelector(`.hex[data-q="${q}"][data-r="${r}"]`);
            
            component.push(hex);
            if (hex.dataset.type === FEATURE_TYPES.BASE) hasBaseConnection = true;
            if (hex.dataset.type === FEATURE_TYPES.BUFF) buffInComponent++;

            getNeighbors(q, r).forEach(n => {
                const nCoord = `${n.q},${n.r}`;
                const nHex = document.querySelector(`.hex[data-q="${n.q}"][data-r="${n.r}"]`);
                if (nHex && nHex.dataset.guildId == gId && !visitedGlobal.has(nCoord)) {
                    visitedGlobal.add(nCoord);
                    queue.push(nCoord);
                }
            });
        }

        // 渲染指示器
        component.forEach(hex => {
            const type = hex.dataset.type;
            if (type === FEATURE_TYPES.BASE) return; 

            const q = parseInt(hex.dataset.q);
            const r = parseInt(hex.dataset.r);
            const { x, y } = hexToPixel(q, r);
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", "indicator-group");

            const baseX = x + 10;
            const baseY = y + 15;

            // 1. 綠色上三角 (人魚島加成)
            if (buffInComponent > 0) {
                const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                textEl.setAttribute("y", baseY);
                textEl.setAttribute("class", "arrow-green");
                textEl.setAttribute("text-anchor", "start");

                if (buffInComponent === 1) {
                    textEl.setAttribute("x", baseX);
                    textEl.textContent = "▲";
                } else {
                    textEl.setAttribute("x", baseX - 14);
                    textEl.textContent = "▲▲";
                }
                g.appendChild(textEl);
            }

            // 2. 紅色下三角 (未連通據點封鎖)
            if (!hasBaseConnection) {
                const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                textEl.setAttribute("x", baseX);
                textEl.setAttribute("y", baseY + 12); 
                textEl.setAttribute("class", "arrow-red");
                textEl.setAttribute("text-anchor", "start");
                textEl.textContent = "▼";
                g.appendChild(textEl);
            }

            if (g.hasChildNodes()) {
                document.getElementById("effect-layer").appendChild(g);
            }
        });    
    });
}

/**
 * 項目 1：公會據點(公會船)上顯示公會名稱
 */
function updateBaseLabels() {
    let container = document.getElementById("base-labels");
    const parent = document.getElementById("territory-label-layer");
    if (!parent) return;

    if (!container) {
        container = document.createElementNS("http://www.w3.org/2000/svg", "g");
        container.setAttribute("id", "base-labels");
        parent.appendChild(container);
    }
    container.innerHTML = "";

    MAP_FEATURES.BASE.forEach(base => {
        const { x, y } = hexToPixel(base.q, base.r);
        const guild = GUILD_CONFIG[base.guildId];
        if (!guild) return;

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "base-name-badge");
        g.setAttribute("transform", `translate(${x}, ${y + 15})`);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("class", "base-name-text");
        text.setAttribute("x", "0");
        text.setAttribute("y", "0");
        text.textContent = guild.name;

        g.appendChild(text);
        container.appendChild(g);
    });
}

/**
 * 項目 2：於公會的最大片佔領海域上顯示該公會勢力
 */
function updateTerritoryLabels() {
    let container = document.getElementById("territory-labels");
    const parent = document.getElementById("territory-label-layer");
    if (!parent) return;

    if (!container) {
        container = document.createElementNS("http://www.w3.org/2000/svg", "g");
        container.setAttribute("id", "territory-labels");
        parent.appendChild(container);
    }
    container.innerHTML = "";

    for (let gId = 1; gId <= 16; gId++) {
        const guildHexes = Array.from(document.querySelectorAll(`.hex[data-guild-id="${gId}"]`));
        if (guildHexes.length === 0) continue;

        // 檢查是否佔有海域（非據點格子）
        const seaHexes = guildHexes.filter(h => h.dataset.type !== FEATURE_TYPES.BASE);
        if (seaHexes.length === 0) continue; // 只有據點尚未佔領海域，不顯示額外勢力標籤

        // 找出所有連通區塊
        const visited = new Set();
        const components = [];

        guildHexes.forEach(h => {
            const key = `${h.dataset.q},${h.dataset.r}`;
            if (visited.has(key)) return;

            const comp = [];
            const queue = [h];
            visited.add(key);

            while (queue.length > 0) {
                const curr = queue.shift();
                comp.push(curr);
                const cq = parseInt(curr.dataset.q);
                const cr = parseInt(curr.dataset.r);

                getNeighbors(cq, cr).forEach(n => {
                    const nKey = `${n.q},${n.r}`;
                    if (!visited.has(nKey) && n.q >= 0 && n.q < COLS && n.r >= 0 && n.r < ROWS) {
                        const nHex = document.querySelector(`.hex[data-q="${n.q}"][data-r="${n.r}"]`);
                        if (nHex && parseInt(nHex.dataset.guildId) === gId) {
                            visited.add(nKey);
                            queue.push(nHex);
                        }
                    }
                });
            }
            components.push(comp);
        });

        // 依據區塊面積（格數）排序，取得最大片海域
        components.sort((a, b) => b.length - a.length);
        const largestComp = components[0];
        if (!largestComp || largestComp.length === 0) continue;

        // 計算最大連通海域的幾何中心 (Centroid)
        let sumX = 0, sumY = 0;
        largestComp.forEach(h => {
            const pt = hexToPixel(parseInt(h.dataset.q), parseInt(h.dataset.r));
            sumX += pt.x;
            sumY += pt.y;
        });
        const avgX = sumX / largestComp.length;
        const avgY = sumY / largestComp.length;

        // 從該區塊內尋找最接近中心點的格子（優先選非據點海域格，避免疊在公會船據點文字上）
        const nonBases = largestComp.filter(h => h.dataset.type !== FEATURE_TYPES.BASE);
        const candidates = nonBases.length > 0 ? nonBases : largestComp;

        let bestHex = candidates[0];
        let minDist = Infinity;
        candidates.forEach(h => {
            const pt = hexToPixel(parseInt(h.dataset.q), parseInt(h.dataset.r));
            const dist = Math.hypot(pt.x - avgX, pt.y - avgY);
            if (dist < minDist) {
                minDist = dist;
                bestHex = h;
            }
        });

        const bestPt = hexToPixel(parseInt(bestHex.dataset.q), parseInt(bestHex.dataset.r));
        const guild = GUILD_CONFIG[gId];

        // 建立勢力標籤群組
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "guild-territory-group");
        g.setAttribute("transform", `translate(${bestPt.x}, ${bestPt.y})`);

        // 公會主名稱
        const mainText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        mainText.setAttribute("class", "guild-territory-text");
        mainText.setAttribute("x", "0");
        mainText.setAttribute("y", "0");
        mainText.textContent = guild.name;

        // 勢力副標籤
        const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        subText.setAttribute("class", "guild-territory-sub");
        subText.setAttribute("x", "0");
        subText.setAttribute("y", "13");
        subText.textContent = `勢力 (${largestComp.length}格)`;

        g.appendChild(mainText);
        g.appendChild(subText);
        container.appendChild(g);
    }
}

// 切換地圖開放階段
let currentPhase = 1;
function updateMapPhase(phase) {
    currentPhase = phase;
    
    // 清除舊禁區遮罩與標記
    document.getElementById("restriction-layer").innerHTML = "";
    document.querySelectorAll('.hex').forEach(hex => {
        hex.dataset.restricted = "false";
    });

    let radius = 0; // 第三天全開放
    if (phase === 1) radius = 7; // 第一天半徑 7 封閉
    else if (phase === 2) radius = 4; // 第二天半徑 4 封閉

    // BFS 從中心點 (14, 14) 擴散尋找禁區
    if (radius > 0) {
        const centerQ = 14;
        const centerR = 14;
        const centerId = `${centerQ},${centerR}`;

        const restrictedSet = new Set();
        const queue = [{ q: centerQ, r: centerR, dist: 0 }];
        restrictedSet.add(centerId);

        while (queue.length > 0) {
            const { q, r, dist } = queue.shift();
            markAsRestricted(q, r);

            if (dist < radius) {
                getNeighbors(q, r).forEach(n => {
                    const nId = `${n.q},${n.r}`;
                    if (!restrictedSet.has(nId)) {
                        restrictedSet.add(nId);
                        queue.push({ q: n.q, r: n.r, dist: dist + 1 });
                    }
                });
            }
        }
    }
    refreshAllLogic();
}

// 標記禁區
function markAsRestricted(q, r) {
    const hex = document.querySelector(`.hex[data-q="${q}"][data-r="${r}"]`);
    if (!hex) return;

    hex.dataset.restricted = "true";

    const { x, y } = hexToPixel(q, r);
    const overlay = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    overlay.setAttribute("points", hexPoints(x, y, HEX_SIZE));
    overlay.setAttribute("class", "hex-restricted-overlay");
    
    document.getElementById("restriction-layer").appendChild(overlay);

    if (hex.dataset.guildId !== "0") {
        hex.dataset.guildId = "0";
        hex.style.fill = "";
    }
}
