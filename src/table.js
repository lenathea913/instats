import { $, $$, trades, settings, ui, esc, money, signedMoney, price, qtyFmt, dateLabel,
         pnlRaw, pnlDisplay, rMultiple, riskAmount, resultOf, sorted, isFiltering,
         computeStats, toneClass, MISTAKES, EMOTIONS, removeTrade, upsertTrade } from "./store.js";
import { openTrade, deleteTrade, askConfirm } from "./dialogs.js";

function renderLedger(list, total){
  const s = computeStats(list);
  const cur = settings.displayCur;
  const cells = [
    { label:"Total P&L", value: s.n ? signedMoney(s.total, cur) : "—", cls: s.n ? toneClass(s.total) : "flat",
      note: s.n ? (s.tradesBest ? "Terbaik: " + esc(s.tradesBest.symbol) : "") : "belum ada data" },
    { label:"Win rate", value: s.winRate === null ? "—" : (s.winRate*100).toFixed(1).replace(".", ",") + "%",
      cls: s.winRate === null ? "flat" : s.winRate >= 0.5 ? "pos" : "neg",
      note: s.n ? s.wins + " menang · " + s.losses + " kalah · " + s.flat + " impas" : "" },
    { label:"Profit factor", value: s.profitFactor === null ? "—" : s.profitFactor === Infinity ? "∞" : s.profitFactor.toFixed(2),
      cls: s.profitFactor === null ? "flat" : s.profitFactor >= 1 ? "pos" : "neg",
      note:"gross profit ÷ gross loss" },
    { label:"Expectancy", value: s.n ? signedMoney(s.expectancy, cur) : "—", cls: s.n ? toneClass(s.expectancy) : "flat",
      note:"rata-rata per trade" },
    { label:"Rata-rata menang", value: s.avgWin === null ? "—" : signedMoney(s.avgWin, cur), cls: s.avgWin === null ? "flat" : "pos",
      note: s.wins + " trade" },
    { label:"Rata-rata kalah", value: s.avgLoss === null ? "—" : signedMoney(s.avgLoss, cur), cls: s.avgLoss === null ? "flat" : "neg",
      note: s.losses + " trade" },
    { label:"Max drawdown", value: s.n ? "-" + money(s.maxDD, cur) : "—", cls: s.maxDD > 0 ? "neg" : "flat",
      note:"penurunan puncak ke lembah" },
    { label:"Streak terpanjang", value: s.n ? (s.winStreak + "W / " + s.lossStreak + "L") : "—", cls:"flat",
      note:"menang beruntun / kalah beruntun" }
  ];
  $("#ledger").innerHTML = cells.map(c => `
    <div class="stat">
      <span class="stat-label">${c.label}</span>
      <span class="stat-value ${c.cls} num">${c.value}</span>
      <span class="stat-note">${c.note}</span>
    </div>`).join("");

  const scope = list.length === total && !isFiltering()
    ? (total ? total + " trade tercatat" : "Belum ada trade")
    : "menampilkan " + list.length + " dari " + total + " trade";
  $("#scopeHint").textContent = scope;
}

/* ---------- table ---------- */
function sideBadge(side){
  const up = side === "long";
  return `<span class="badge">${up
    ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>Long'
    : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7l10 10M17 9v8H9"/></svg>Short'}</span>`;
}
function rCell(r){
  if(r === null) return '<span class="flat">—</span>';
  const cls = r > 0 ? "pos" : r < 0 ? "neg" : "flat";
  return `<span class="${cls} num">${r > 0 ? "+" : ""}${r.toFixed(2)}R</span>`;
}
function pnlCell(t){
  const v = pnlDisplay(t);
  const conv = t.currency !== settings.displayCur ? "≈ " : "";
  return `<span class="${toneClass(v)} num">${conv}${signedMoney(v, settings.displayCur)}</span>`;
}

function renderTable(list){
  const tbody = $("#tbody");
  const rows = sorted(list);

  // buang pilihan yang sudah tidak ada di jurnal
  for(const id of ui.selected){ if(!trades.some(t => t.id === id)) ui.selected.delete(id); }
  renderedIds = rows.map(t => t.id);

  if(rows.length === 0){
    tbody.innerHTML = `<tr><td class="empty-cell" colspan="12">${
      trades.length ? "Tidak ada trade yang cocok dengan filter ini. Longgarkan filternya atau bersihkan." : "Belum ada trade. Tekan “Catat trade” untuk memulai jurnal."
    }</td></tr>`;
  }else{
    tbody.innerHTML = rows.map(t => {
      const open = ui.expanded.has(t.id);
      const r = rMultiple(t);
      const p = pnlDisplay(t);
      const emo = t.emotion ? EMOTIONS[t.emotion] : null;
      const main = `
        <tr class="main-row" data-id="${t.id}">
          <td class="chk"><input type="checkbox" class="row-chk" data-id="${t.id}"${ui.selected.has(t.id) ? " checked" : ""} aria-label="Pilih ${esc(t.symbol)} ${dateLabel(t.date)}"></td>
          <td class="num">${dateLabel(t.date)}</td>
          <td class="sym">${esc(t.symbol)}</td>
          <td>${sideBadge(t.side)}</td>
          <td class="r num">${price(Number(t.entry))}</td>
          <td class="r num">${price(Number(t.exit))}</td>
          <td class="r num">${qtyFmt(Number(t.qty))}</td>
          <td class="r num">${t.stop ? price(Number(t.stop)) : '<span class="flat">—</span>'}</td>
          <td class="r">${rCell(r)}</td>
          <td class="r">${pnlCell(t)}</td>
          <td title="${esc(t.setup || "")}">${t.setup ? esc(t.setup) : '<span class="flat">—</span>'}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="icon-btn expand-btn" data-act="toggle" data-id="${t.id}"
                      aria-expanded="${open}" aria-label="${open ? "Tutup" : "Buka"} detail ${esc(t.symbol)}" title="Detail">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>
              </button>
              <button type="button" class="icon-btn" data-act="edit" data-id="${t.id}" aria-label="Edit ${esc(t.symbol)}" title="Edit">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
              <button type="button" class="icon-btn danger" data-act="delete" data-id="${t.id}" aria-label="Hapus ${esc(t.symbol)}" title="Hapus">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
              </button>
            </div>
          </td>
        </tr>`;

      const mistakes = (t.mistakes || []);
      const detail = `
        <tr class="detail-row" data-detail="${t.id}" ${open ? "" : "hidden"}>
          <td colspan="12">
            <div class="detail-inner">
              <div class="detail-grid">
                <div class="kv"><span class="k">Setup</span><span class="v">${t.setup ? esc(t.setup) : "—"}</span></div>
                <div class="kv"><span class="k">Emosi</span><span class="v">${t.emotion ? t.emotion + " · " + EMOTIONS[t.emotion] : "—"}</span></div>
                <div class="kv"><span class="k">Biaya</span><span class="v num">${money(Number(t.fee || 0), t.currency)}</span></div>
                <div class="kv"><span class="k">Risiko (1R)</span><span class="v num">${riskAmount(t) === null ? "—" : money(riskAmount(t), t.currency)}</span></div>
                <div class="kv"><span class="k">P&amp;L asli</span><span class="v ${toneClass(pnlRaw(t))} num">${signedMoney(pnlRaw(t), t.currency)}</span></div>
                <div class="kv"><span class="k">Hasil</span><span class="v">${resultOf(t) === "win" ? "Menang" : resultOf(t) === "loss" ? "Kalah" : "Impas"}</span></div>
              </div>
              <div class="kv">
                <span class="k">Kesalahan</span>
                <span class="v">${mistakes.length
                  ? '<span class="tags">' + mistakes.map(m => `<span class="tag">${esc(m)}</span>`).join("") + "</span>"
                  : '<span class="flat">Tidak ada — trade sesuai rencana</span>'}</span>
              </div>
              <div class="kv">
                <span class="k">Catatan</span>
                <span class="v">${t.notes ? `<p class="note-text">${esc(t.notes)}</p>` : '<span class="flat">Tidak ada catatan.</span>'}</span>
              </div>
            </div>
          </td>
        </tr>`;
      return main + detail;
    }).join("");
  }

  const hasAny = trades.length > 0;
  $("#tradeTable").parentElement.hidden = !hasAny;
  $("#emptyState").hidden = hasAny;
  if(!hasAny){
    $("#emptyTitle").textContent = "Belum ada trade";
    $("#emptyText").textContent = "Jurnal ini masih kosong. Setiap entry yang kamu catat disimpan di browser ini — harga, risiko, setup, kesalahan, dan emosi saat itu.";
  }
  $("#rowCount").textContent = rows.length ? rows.length + " baris" : "";
  $("#resetFilters").hidden = !isFiltering();
  syncBulkBar();

  // daftar setup untuk filter
  const sel = $("#fSetup");
  const setups = Array.from(new Set(trades.map(t => t.setup).filter(Boolean))).sort();
  const current = ui.filters.setup;
  sel.innerHTML = '<option value="">Setup: semua</option>' +
    setups.map(s => `<option value="${esc(s)}"${s === current ? " selected" : ""}>${esc(s)}</option>`).join("");

  // daftar kesalahan & emosi untuk filter
  $("#fMistake").innerHTML = '<option value="">Kesalahan: semua</option>' +
    MISTAKES.map(m => `<option value="${esc(m)}"${m === ui.filters.mistake ? " selected" : ""}>${esc(m)}</option>`).join("");
  $("#fEmotion").innerHTML = '<option value="">Emosi: semua</option>' +
    Object.keys(EMOTIONS).map(k => `<option value="${k}"${k === ui.filters.emotion ? " selected" : ""}>${k} · ${EMOTIONS[k]}</option>`).join("");
}

/* ---------- interaksi tabel & filter ---------- */
let onChange = () => {};
let renderedIds = [];

function syncBulkBar(){
  const n = ui.selected.size;
  $("#bulkBar").hidden = n === 0;
  $("#bulkCount").textContent = n + " trade dipilih";
  const all = renderedIds.length > 0 && renderedIds.every(id => ui.selected.has(id));
  const some = renderedIds.some(id => ui.selected.has(id));
  $("#fSelAll").checked = all;
  $("#fSelAll").indeterminate = !all && some;
}

function bindFilter(sel, key, evt){
  $(sel).addEventListener(evt || "input", e => {
    ui.filters[key] = e.target.value;
    onChange({ animate:false });
  });
}

function initTable(fn){
  onChange = fn || (() => {});

  $("#tbody").addEventListener("click", e => {
    const btn = e.target.closest("button[data-act]");
    if(!btn) return;
    const id = btn.dataset.id;
    if(btn.dataset.act === "edit") openTrade(id);
    else if(btn.dataset.act === "delete") deleteTrade(id);
    else if(btn.dataset.act === "toggle"){
      if(ui.expanded.has(id)) ui.expanded.delete(id); else ui.expanded.add(id);
      onChange({ animate:false });
      const again = $('#tbody button[data-act="toggle"][data-id="' + id + '"]');
      if(again) again.focus();
    }
  });

  $$("th button.sorter").forEach(b => {
    b.addEventListener("click", () => {
      const k = b.dataset.sort;
      if(ui.sortKey === k) ui.sortDir = ui.sortDir === "asc" ? "desc" : "asc";
      else { ui.sortKey = k; ui.sortDir = "desc"; }
      $$("th[data-sort]").forEach(th => th.removeAttribute("aria-sort"));
      b.closest("th").setAttribute("aria-sort", ui.sortDir === "asc" ? "ascending" : "descending");
      onChange({ animate:false });
    });
  });

  bindFilter("#fSearch", "q");
  bindFilter("#fSide", "side", "change");
  bindFilter("#fResult", "result", "change");
  bindFilter("#fSetup", "setup", "change");
  bindFilter("#fMistake", "mistake", "change");
  bindFilter("#fEmotion", "emotion", "change");
  bindFilter("#fFrom", "from", "change");
  bindFilter("#fTo", "to", "change");

  // pilih massal (hapus banyak trade sekaligus)
  $("#fSelAll").addEventListener("change", e => {
    renderedIds.forEach(id => { if(e.target.checked) ui.selected.add(id); else ui.selected.delete(id); });
    onChange({ animate:false });
  });
  $("#tbody").addEventListener("change", e => {
    const chk = e.target.closest("input.row-chk");
    if(!chk) return;
    if(chk.checked) ui.selected.add(chk.dataset.id); else ui.selected.delete(chk.dataset.id);
    syncBulkBar();
  });
  $("#bulkClear").addEventListener("click", () => {
    ui.selected.clear();
    onChange({ animate:false });
  });

  // edit massal: ubah setup / kesalahan untuk banyak trade sekaligus
  $("#bulkEdit").addEventListener("click", () => {
    const n = ui.selected.size;
    if(!n) return;
    $("#bulkEditHint").textContent = "Berlaku untuk " + n + " trade terpilih. Bagian yang tidak diubah akan dibiarkan apa adanya.";
    const setups = Array.from(new Set(trades.map(t => t.setup).filter(Boolean))).sort();
    $("#beSetupList").innerHTML = setups.map(s => `<option value="${esc(s)}">`).join("");
    $("#beSetup").value = "";
    $("#bulkEditDialog").querySelector('input[name="beMode"][value="keep"]').checked = true;
    $("#beMistakeFields").disabled = true;
    $("#beMistakes").innerHTML = MISTAKES.map(m =>
      `<label><input type="checkbox" name="beMistake" value="${esc(m)}"> ${esc(m)}</label>`).join("");
    $("#bulkEditDialog").showModal();
  });
  ["#closeBulkEdit", "#cancelBulkEdit"].forEach(s =>
    $(s).addEventListener("click", () => $("#bulkEditDialog").close()));
  $("#bulkEditDialog").addEventListener("click", e => {
    if(e.target === $("#bulkEditDialog")) $("#bulkEditDialog").close();
  });
  $("#bulkEditDialog").addEventListener("change", e => {
    if(e.target.name === "beMode") $("#beMistakeFields").disabled = e.target.value === "keep";
  });
  $("#bulkEditForm").addEventListener("submit", e => {
    e.preventDefault();
    const ids = Array.from(ui.selected);
    const setup = $("#beSetup").value.trim();
    const replace = document.querySelector('#bulkEditDialog input[name="beMode"]:checked').value === "replace";
    $("#bulkEditDialog").close();
    if(!ids.length || (!setup && !replace)) return;
    const mistakes = replace
      ? $$("#bulkEditDialog input[name=beMistake]:checked").map(i => i.value)
      : null;
    ids.forEach(id => {
      const data = {};
      if(setup) data.setup = setup;
      if(replace) data.mistakes = mistakes;
      if(Object.keys(data).length) upsertTrade(data, id);
    });
    ui.selected.clear();
    onChange();
  });
  $("#bulkDelete").addEventListener("click", async () => {
    const ids = Array.from(ui.selected);
    if(!ids.length) return;
    const ok = await askConfirm(
      "Hapus " + ids.length + " trade terpilih dari jurnal? Tindakan ini tidak bisa dibatalkan.",
      "Hapus " + ids.length + " trade"
    );
    if(!ok) return;
    ids.forEach(id => removeTrade(id));
    ui.selected.clear();
    onChange();
  });

  $("#resetFilters").addEventListener("click", () => {
    ui.filters = { q:"", side:"", result:"", setup:"", mistake:"", emotion:"", from:"", to:"" };
    $("#fSearch").value = ""; $("#fSide").value = ""; $("#fResult").value = "";
    $("#fSetup").value = ""; $("#fMistake").value = ""; $("#fEmotion").value = "";
    $("#fFrom").value = ""; $("#fTo").value = "";
    onChange();
  });
}

export { renderLedger, renderTable, initTable };

