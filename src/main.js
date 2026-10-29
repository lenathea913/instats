/* ============================================================
   Rekap — jurnal trading crypto (lokal, tanpa server)
   main.js : render halaman, switch mata uang, init.
   ============================================================ */
import {
  $, trades, settings, load, saveSettings, fmtCacheClear, money, filtered
} from "./store.js";
import { renderLedger, renderTable, initTable } from "./table.js";
import {
  chart, chartPoints, animateChart, animatePieChart, getChartMode, initChart
} from "./chart.js";
import { initDialogs } from "./dialogs.js";
import { initBackup } from "./backup.js";
import { renderBreakdown } from "./stats.js";
import { renderCalendar, initCalendar } from "./calendar.js";
import { exportCsv, initImport } from "./csv.js";
import { initCalc } from "./calc.js";

function render(opts){
  const list = filtered();
  renderLedger(list, trades.length);
  renderTable(list);
  renderBreakdown(list);
  renderCalendar(list);
  $("#exportCsv").disabled = list.length === 0;
  chart.pts = chartPoints(list);
  chart.hover = -1;
  $("#chartTip").hidden = true;

  if(getChartMode() === "pie"){
    animatePieChart(opts && opts.animate === false);
  }else{
    $("#lossPie").hidden = true;
    $("#pieLegend").hidden = true;
    animateChart(opts && opts.animate === false);
  }

  $("#rateLabel").textContent = "1 USD = " + money(settings.usdToIdr, "IDR").replace(/,00$/, "");
  $("#curIDR").setAttribute("aria-pressed", String(settings.displayCur === "IDR"));
  $("#curUSD").setAttribute("aria-pressed", String(settings.displayCur === "USD"));
}

/* ---------- init ---------- */
load();
initTable(render);
initDialogs(render);
initChart();
initBackup(render);
initCalendar();
$("#exportCsv").addEventListener("click", () => exportCsv(filtered()));
initImport(render);
initCalc();

$("#curIDR").addEventListener("click", () => {
  settings.displayCur = "IDR"; saveSettings(); fmtCacheClear(); render();
});
$("#curUSD").addEventListener("click", () => {
  settings.displayCur = "USD"; saveSettings(); fmtCacheClear(); render();
});

render();
