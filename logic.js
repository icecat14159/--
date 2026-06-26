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

function updateIndicators() {
    document.querySelectorAll(".indicator-group").forEach(el => el.remove());
    
    // 只獲取有被佔領的格子，大幅減少循環次數
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

        // 渲染邏輯 (保持原有垂直排列顯示方式)
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


//切換地圖階段
let currentPhase = 1; // 預設為第一天
function updateMapPhase(phase) {
    currentPhase = phase;
    
    //清除舊禁區遮罩與標記
    document.getElementById("restriction-layer").innerHTML = ""; //清空禁區圖層的所有內容
    document.querySelectorAll('.hex').forEach(hex => { //清除每格的禁區屬性
        hex.dataset.restricted = "false";
    });

    let radius = 0; //第三天全開放
    if (phase === 1) radius = 7; //第一天半徑7封閉
    else if (phase === 2) radius = 4; //第二天半徑4封閉

    //BFS 從中心點 (14, 14) 擴散找禁區
    if (radius > 0) {
        const centerQ = 14;
        const centerR = 14;
        const centerId = `${centerQ},${centerR}`; //先設中心點

        const restrictedSet = new Set(); //Set資料結構紀錄已訪問格子
        const queue = [{ q: centerQ, r: centerR, dist: 0 }]; //佇列資料結構(此時先放入中心點)
        restrictedSet.add(centerId); //先記錄中心點

        while (queue.length > 0) {
            const { q, r, dist } = queue.shift(); //從佇列中取出
            markAsRestricted(q, r); //標記為禁區

            if (dist < radius) { //未達禁區半徑就繼續往外找
                getNeighbors(q, r).forEach(n => { //取得鄰近六格座標
                    const nId = `${n.q},${n.r}`;
                    if (!restrictedSet.has(nId)) { //如果未訪問過
                        restrictedSet.add(nId); //紀錄訪問
                        queue.push({ q: n.q, r: n.r, dist: dist + 1 }); //推入佇列
                    }
                });
            }
        }
    }
    refreshAllLogic();
}

//禁區設定
function markAsRestricted(q, r) {
    //防錯段落
    const hex = document.querySelector(`.hex[data-q="${q}"][data-r="${r}"]`); //尋找該物件
    if (!hex) return;

    //標記為禁區
    hex.dataset.restricted = "true";

    //建立遮罩圖案
    const { x, y } = hexToPixel(q, r);
    const overlay = document.createElementNS("http://www.w3.org/2000/svg", "polygon"); //創建svg
    overlay.setAttribute("points", hexPoints(x, y, HEX_SIZE)); //畫出該位置上的六邊形
    overlay.setAttribute("class", "hex-restricted-overlay"); //加入樣式
    
    document.getElementById("restriction-layer").appendChild(overlay); //加到禁區圖層中

    if (hex.dataset.guildId !== "0") { //如果是公會海域
        hex.dataset.guildId = "0"; //設為公海
        hex.style.fill = ""; //清除樣式
    }
}