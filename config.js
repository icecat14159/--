const GUILD_CONFIG = {
    0: { id: 0, name: "公海", color: "#c2d7f54d", textColor: "#000" }, // 預設空白格
    1: { id: 1, name: "公會1", color: "#ffffff", textColor: "#fff" },
    2: { id: 2, name: "公會2", color: "#33ccff", textColor: "#000" },
    3: { id: 3, name: "公會3", color: "#9966ff", textColor: "#fff" },
    4: { id: 4, name: "公會4", color: "#ff66b2", textColor: "#000" },
    5: { id: 5, name: "公會5", color: "#008080", textColor: "#fff" },
    6: { id: 6, name: "公會6", color: "#b2b2b2", textColor: "#000" },
    7: { id: 7, name: "公會7", color: "#6600cc", textColor: "#fff" },
    8: { id: 8, name: "公會8", color: "#ccff33", textColor: "#000" },
    9: { id: 9, name: "公會9", color: "#00cc99", textColor: "#fff" },
    10: { id: 10, name: "公會10", color: "#99004c", textColor: "#000" },
    11: { id: 11, name: "公會11", color: "#66b2ff", textColor: "#fff" },
    12: { id: 12, name: "公會12", color: "#c0c0c0", textColor: "#000" },
    13: { id: 13, name: "公會13", color: "#9933ff", textColor: "#fff" },
    14: { id: 14, name: "公會14", color: "#5cd6d6", textColor: "#000" },
    15: { id: 15, name: "公會15", color: "#ffccff", textColor: "#fff" },
    16: { id: 16, name: "公會16", color: "#b380ff", textColor: "#000" }
};

// 格子類型枚舉
const TILE_TYPES = {
    EMPTY: 'empty',
    BASE: 'base',      // 據點
    LAND: 'land',      // 一般可佔領格
    OBSTACLE: 'wall'   // 障礙物
};

const MAP_FEATURES = {
    // 公會據點 (16家)
    BASE: [ 
        { q: 1, r: 3, guildId: 1},
        { q: 1, r: 7, guildId: 2},
        { q: 1, r: 21, guildId: 3},
        { q: 1, r: 25, guildId: 4},
        { q: 4, r: 0, guildId: 5},
        { q: 3, r: 28, guildId: 6},
        { q: 8, r: 0, guildId: 7},
        { q: 7, r: 28, guildId: 8},
        { q: 20, r: 0, guildId: 9},
        { q: 21, r: 28, guildId: 10},
        { q: 24, r: 0, guildId: 11},
        { q: 25, r: 28, guildId: 12},
        { q: 27, r: 3, guildId: 13},
        { q: 27, r: 7, guildId: 14},
        { q: 27, r: 21, guildId: 15},
        { q: 27, r: 25, guildId: 16}
    ],
    // 設施
    FACILITIES: [
        { q: 2, r: 3, level: 1, name: "水手酒館" },   //左上
        { q: 2, r: 7, level: 1, name: "水手酒館" },
        { q: 5, r: 1, level: 1, name: "水手酒館" },
        { q: 5, r: 5, level: 2, name: "海上餐廳" },
        { q: 6, r: 3, level: 2, name: "海上餐廳" },
        { q: 9, r: 1, level: 1, name: "水手酒館" },
        { q: 2, r: 20, level: 1, name: "水手酒館" },   //左下
        { q: 2, r: 24, level: 1, name: "水手酒館" },
        { q: 4, r: 27, level: 1, name: "水手酒館" },
        { q: 5, r: 23, level: 2, name: "海上餐廳" },
        { q: 5, r: 25, level: 2, name: "海上餐廳" },
        { q: 8, r: 27, level: 1, name: "水手酒館" },
        { q: 19, r: 1, level: 1, name: "水手酒館" },   //右上
        { q: 22, r: 3, level: 2, name: "海上餐廳" },
        { q: 23, r: 1, level: 1, name: "水手酒館" },
        { q: 23, r: 5, level: 2, name: "海上餐廳" },
        { q: 26, r: 3, level: 1, name: "水手酒館" },
        { q: 26, r: 7, level: 1, name: "水手酒館" },
        { q: 20, r: 27, level: 1, name: "水手酒館" },   //右下
        { q: 23, r: 23, level: 2, name: "海上餐廳" },
        { q: 23, r: 25, level: 2, name: "海上餐廳" },
        { q: 24, r: 27, level: 1, name: "水手酒館" },
        { q: 26, r: 20, level: 1, name: "水手酒館" },
        { q: 26, r: 24, level: 1, name: "水手酒館" },
        { q: 1, r: 14, level: 1, name: "水手酒館" },   //中線
        { q: 5, r: 14, level: 2, name: "海上餐廳" },
        { q: 14, r: 2, level: 1, name: "水手酒館" },
        { q: 14, r: 6, level: 2, name: "海上餐廳" },
        { q: 14, r: 22, level: 2, name: "海上餐廳" },
        { q: 14, r: 26, level: 1, name: "水手酒館" },
        { q: 23, r: 14, level: 2, name: "海上餐廳" },
        { q: 27, r: 14, level: 1, name: "水手酒館" },
        { q: 12, r: 11, level: 3, name: "沈船點" }, //中央
        { q: 12, r: 17, level: 3, name: "沈船點" },
        { q: 16, r: 11, level: 3, name: "沈船點" },
        { q: 16, r: 17, level: 3, name: "沈船點" },
        { q: 10, r: 14, level: 3, name: "沈船點" },
        { q: 18, r: 14, level: 3, name: "沈船點" },
        { q: 14, r: 14, level: 4, name: "珍寶點" }
    ],
    //人魚島
    BUFFS: [
        { q: 14, r: 9, name: "人魚島", type: "power_buff" },
        { q: 14, r: 19, name: "人魚島", type: "power_buff" }
    ],
    //障礙*31
    OBSTACLES: [
        { q: 0, r: 2 }, { q: 0, r: 6 }, { q: 0, r: 21 }, { q: 0, r: 25 },
        { q: 3, r: 14 }, { q: 4, r: 13 },
        { q: 7, r: 14 }, { q: 8, r: 13 }, { q: 9, r: 14 },
        { q: 8, r: 5 }, { q: 8, r: 23 },
        { q: 12, r: 24 }, { q: 13, r: 25 }, { q: 13, r: 24 }, { q: 13, r: 23 }, 
        { q: 15, r: 4 }, { q: 15, r: 5 }, { q: 15, r: 6 }, { q: 16, r: 4 },
        { q: 19, r: 15 }, { q: 20, r: 15 }, { q: 21, r: 15 },
        { q: 24, r: 14 }, { q: 25, r: 14 },
        { q: 20, r: 5 }, { q: 20, r: 23 },
        { q: 28, r: 2 }, { q: 28, r: 6 }, { q: 28, r: 21 }, { q: 28, r: 25 },
        { q: 14, r: 0 }
    ]
};

const FEATURE_TYPES = {
    BASE: 'base',
    FACILITY: 'facility',
    BUFF: 'buff',      //人魚島
    OBSTACLE: 'obstacle'
};