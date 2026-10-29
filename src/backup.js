/* ============================================================
   Rekap — jurnal trading lokal (localStorage, tanpa server)
   backup.js : Backup & Pulihkan file JSON.
   Alur sama dengan proyek App (ML/AI Academy):
   unduh JSON bernama rekap-backup-YYYY-MM-DD.json, atau
   pulihkan dari file cadangan dengan konfirmasi merge.
   ============================================================ */
import { $, trades, settings, restoreFromBackup } from "./store.js";
import { askConfirm } from "./dialogs.js";

const pad = (n) => String(n).padStart(2, "0");
const KEY_LAST_BACKUP = "rekap.lastBackup.v1";
const DAY_MS = 86400000;

/** tampilkan umur backup terakhir (pengingat >7 hari / belum pernah) */
function updateBackupAge(){
  const el = $("#backupAge");
  if(!el) return;
  let ts = 0;
  try{ ts = Number(localStorage.getItem(KEY_LAST_BACKUP)) || 0; }catch(e){}
  el.hidden = false;
  if(!ts){
    el.className = "backup-age err";
    el.textContent = "⚠️ Belum pernah backup — unduh file backup untuk berjaga-jaga. Data bisa hilang jika cache browser dibersihkan.";
    return;
  }
  const days = Math.floor((Date.now() - ts) / DAY_MS);
  if(days >= 7){
    el.className = "backup-age err";
    el.textContent = "⚠️ Backup terakhir " + days + " hari lalu — saatnya unduh file backup baru.";
  }else if(days >= 1){
    el.className = "backup-age ok";
    el.textContent = "✓ Terakhir backup " + days + " hari lalu.";
  }else{
    el.className = "backup-age ok";
    el.textContent = "✓ Terakhir backup hari ini.";
  }
}

function showMsg(type, text){
  const el = $("#backupMsg");
  if(!el) return;
  el.hidden = false;
  el.className = "backup-msg " + type;
  el.textContent = (type === "ok" ? "✓ " : "⚠️ ") + text;
}
function hideMsg(){
  const el = $("#backupMsg");
  if(el) el.hidden = true;
}

/** unduh seluruh jurnal (+ pengaturan) sebagai file JSON */
function download(){
  try{
    const data = {
      trades,
      settings: { displayCur: settings.displayCur, usdToIdr: settings.usdToIdr }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    a.href = url;
    a.download = "rekap-backup-" + d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    try{ localStorage.setItem(KEY_LAST_BACKUP, String(Date.now())); }catch(e){}
    updateBackupAge();
    showMsg("ok", "File backup berhasil diunduh.");
  }catch(e){
    showMsg("err", "Gagal membuat file backup.");
  }
}

/** validasi minimum: file berisi minimal satu trade yang dikenali */
function looksLikeBackup(data){
  const hasTrade = (t) => t && typeof t === "object" && t.id && t.date;
  if(Array.isArray(data)) return data.some(hasTrade);
  if(data && typeof data === "object") return Array.isArray(data.trades) && data.trades.some(hasTrade);
  return false;
}

async function onFile(ev, render){
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = ""; // izinkan file yang sama dipilih ulang
  if(!file) return;

  let data;
  try{
    data = JSON.parse(await file.text());
  }catch(e){
    showMsg("err", "File tidak dikenali sebagai backup Rekap.");
    return;
  }
  if(!looksLikeBackup(data)){
    showMsg("err", "File tidak dikenali sebagai backup Rekap.");
    return;
  }

  const ok = await askConfirm(
    "Pulihkan akan MENGGABUNGKAN isi file dengan jurnal saat ini — data yang sudah ada tidak akan hilang. Lanjutkan?",
    "Pulihkan"
  );
  if(!ok){ hideMsg(); return; }

  const res = restoreFromBackup(data);
  if(!res.ok){
    showMsg("err", "File tidak dikenali sebagai backup Rekap.");
    return;
  }
  if(typeof render === "function") render();
  showMsg("ok", res.added > 0
    ? "Progres berhasil dipulihkan (+" + res.added + " trade baru)."
    : "Progres berhasil dipulihkan — tidak ada trade baru, semua sudah ada di jurnal.");
}

/** pasang handler kartu Backup & Pulihkan (panggil dari main.js dengan render) */
export function initBackup(render){
  $("#backupBtn").addEventListener("click", download);
  $("#restoreBtn").addEventListener("click", () => $("#restoreFile").click());
  $("#restoreFile").addEventListener("change", (ev) => onFile(ev, render));
  updateBackupAge();
}
