/* ============================================================
   Rekap — csv.js : ekspor trade yang sedang ditampilkan
   (sesuai filter aktif) ke file CSV untuk Excel / Google Sheets.
   ============================================================ */
import { settings, sorted, rMultiple, pnlRaw, EMOTIONS } from "./store.js";

/** escape nilai CSV (kutip, koma, atau newline) */
function q(v){
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function exportCsv(list){
  const head = ["Tanggal", "Simbol", "Arah", "Mata uang", "Entry", "Exit", "Qty",
                "Fee", "Stop loss", "R", "P&L", "Setup", "Kesalahan", "Emosi", "Catatan"];
  const rows = sorted(list).map(t => {
    const r = rMultiple(t);
    return [
      t.date,
      t.symbol,
      t.side === "long" ? "Long" : "Short",
      t.currency || "USD",
      t.entry,
      t.exit,
      t.qty,
      t.fee || 0,
      (t.stop === null || t.stop === undefined || t.stop === "") ? "" : t.stop,
      r === null ? "" : r.toFixed(2),
      Number(pnlRaw(t)).toFixed(2),
      t.setup || "",
      (t.mistakes || []).join(" | "),
      t.emotion ? t.emotion + " · " + EMOTIONS[t.emotion] : "",
      t.notes || ""
    ].map(q).join(",");
  });

  // BOM supaya Excel membaca UTF-8 dengan benar
  const csv = "\uFEFF" + [head.map(q).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  a.href = url;
  a.download = "rekap-trade-" + d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export { exportCsv };
