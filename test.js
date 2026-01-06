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