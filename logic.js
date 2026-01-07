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

// logic.js 中的 updateGuildOutlines 修正
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