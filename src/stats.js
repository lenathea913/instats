/* ============================================================
   Rekap — stats.js : statistik per setup & per simbol.
   Mengelompokkan trade yang sedang ditampilkan lalu menghitung
   jumlah trade, win rate, total P&L, dan R-rata-rata tiap kelompok.
   ============================================================ */
import { $, settings, esc, signedMoney, toneClass, pnlDisplay, rMultiple, resultOf } from "./store.js";

function groupBy(list, keyFn){
  const map = new Map();
  list.forEach(t => {
    const k = keyFn(t) || "";
    if(!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  });
  return Array.from(map.entries()).map(([name, arr]) => {
    const n = arr.length;
    let wins = 0, losses = 0, total = 0, rSum = 0, rN = 0;
    arr.forEach(t => {
      total += pnlDisplay(t);
      const r = resultOf(t);
      if(r === "win") wins++;
      else if(r === "loss") losses++;
      const rm = rMultiple(t);
      if(rm !== null){ rSum += rm; rN++; }
    });
    return {
      name, n, total,
      winRate: (wins + losses) ? wins / (wins + losses) : null,
      avgR: rN ? rSum / rN : null
    };
  }).sort((a, b) => b.total - a.total);
}

function rowsHtml(groups){
  const cur = settings.displayCur;
  return groups.map(g => `
    <tr>
      <td class="sym">${g.name ? esc(g.name) : '<span class="flat">Tanpa setup</span>'}</td>
      <td class="r num">${g.n}</td>
      <td class="r num">${g.winRate === null ? '<span class="flat">—</span>' : (g.winRate * 100).toFixed(0).replace(".", ",") + "%"}</td>
      <td class="r num ${toneClass(g.total)}">${signedMoney(g.total, cur)}</td>
      <td class="r num ${g.avgR === null ? "flat" : toneClass(g.avgR)}">${g.avgR === null ? "—" : (g.avgR > 0 ? "+" : "") + g.avgR.toFixed(2) + "R"}</td>
    </tr>`).join("");
}

function renderBreakdown(list){
  const section = $("#breakdownSection");
  if(!section) return;
  section.hidden = list.length === 0;
  if(list.length === 0) return;
  $("#bdSetup").querySelector("tbody").innerHTML = rowsHtml(groupBy(list, t => t.setup));
  $("#bdSymbol").querySelector("tbody").innerHTML = rowsHtml(groupBy(list, t => t.symbol));
}

export { renderBreakdown };
