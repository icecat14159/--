// logic.js

/**
 * 取得六邊形鄰居座標 (針對平頂、奇數列上偏移)
 */
function getNeighbors(q, r) {
    const isOdd = (q % 2 !== 0);
    // 修正順序以對應 hexPoints 的 0-5 邊
    const directions = isOdd ? [
        [+1,  0], [ 0, +1], [-1,  0], [-1, -1], [ 0, -1], [+1, -1] 
    ] : [
        [+1, +1], [ 0, +1], [-1, +1], [-1,  0], [ 0, -1], [+1,  0]
    ];
    
    return directions.map(d => ({ q: q + d[0], r: r + d[1] }));
}

/**
 * 更新全地圖的連通狀態
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
        // 找到該公會的所有據點 (有些公會可能在地圖邊緣有多個據點座標)
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

// logic.js

function updateIndicators() {
    // 1. 清除舊圖標
    document.querySelectorAll(".indicator-group").forEach(el => el.remove());

    const allHexes = document.querySelectorAll('.hex');
    
    // 針對 1-16 個公會分別處理
    for (let gId = 1; gId <= 16; gId++) {
        const guildHexes = Array.from(allHexes).filter(h => parseInt(h.dataset.guildId) === gId);
        if (guildHexes.length === 0) continue;

        const visited = new Set();

        // 2. 使用 BFS 找出該公會所有的「獨立連通區塊 (Components)」
        guildHexes.forEach(startHex => {
            const startCoord = `${startHex.dataset.q},${startHex.dataset.r}`;
            if (visited.has(startCoord)) return;

            const component = []; // 存放目前這個區塊的所有格子
            const queue = [startCoord];
            visited.add(startCoord);

            let hasBaseConnection = false; // 該區塊是否連通據點
            let buffInComponent = 0;       // 該區塊內含有幾座人魚島

            // BFS 搜尋區塊範圍
            while (queue.length > 0) {
                const coord = queue.shift();
                const [q, r] = coord.split(',').map(Number);
                const hex = document.querySelector(`.hex[data-q="${q}"][data-r="${r}"]`);
                
                component.push(hex);
                
                // 判斷該區塊屬性
                if (hex.dataset.type === FEATURE_TYPES.BASE) hasBaseConnection = true;
                if (hex.dataset.type === FEATURE_TYPES.BUFF) buffInComponent++;

                getNeighbors(q, r).forEach(n => {
                    const nCoord = `${n.q},${n.r}`;
                    const nHex = document.querySelector(`.hex[data-q="${n.q}"][data-r="${n.r}"]`);
                    // 只有相同公會且未訪問過的格子才加入同一個區塊
                    if (nHex && nHex.dataset.guildId == gId && !visited.has(nCoord)) {
                        visited.add(nCoord);
                        queue.push(nCoord);
                    }
                });
            }

            // 3. 根據該區塊分析結果，為區塊內所有格子繪製圖標
                        // logic.js 中的渲染邏輯修正

            // 3. 根據該區塊分析結果，為區塊內所有格子繪製圖標
            component.forEach(hex => {
                const type = hex.dataset.type;
                if (type === FEATURE_TYPES.BASE) return; 

                const q = parseInt(hex.dataset.q);
                const r = parseInt(hex.dataset.r);
                const { x, y } = hexToPixel(q, r);
                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("class", "indicator-group");

                // 基礎偏移位置（原右下角參考點）
                const baseX = x + 10;
                const baseY = y + 15;

                // --- 1. 處理綠色上三角 (加成) ---
                if (buffInComponent > 0) {
                    const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    textEl.setAttribute("y", baseY);
                    textEl.setAttribute("class", "arrow-green");
                    textEl.setAttribute("text-anchor", "start");

                    if (buffInComponent === 1) {
                        textEl.setAttribute("x", baseX);
                        textEl.textContent = "▲";
                    } else {
                        // 雙箭頭：將起始點向左移 10px，讓兩個箭頭並排在格子內
                        textEl.setAttribute("x", baseX - 14);
                        textEl.textContent = "▲▲";
                    }
                    g.appendChild(textEl);
                }

                // --- 2. 處理紅色下三角 (封鎖) ---
                if (!hasBaseConnection) {
                    const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    // 固定在綠色圖標下方 12px
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
}