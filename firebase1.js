import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  query,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// ==========================================
// 1. KONFIGURASI FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "pedulilansia1.firebaseapp.com",
  databaseURL: "https://pedulilansia1-default-rtdb.firebaseio.com",
  projectId: "pedulilansia1",
  storageBucket: "pedulilansia1.appspot.com",
  messagingSenderId: "1016495790494",
  appId: "1:1016495790494:web:e9fb74793a372ebb625e8f",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// 2. TELEGRAM CONFIG
// ==========================================
const BOT_TOKEN = "8520004491:AAF5-pfnJyXMu7WuxrrADIJeUWCKpElEPqo";
const CHAT_ID = "7436616157";

// TEMPLATE PESAN
function formatPesan(status, waktu) {
  return `
*Ibu Lansia 1*
R. Sahabat 1A • 50 Thn • Pr

*Status:* ${status}
*Waktu:* ${waktu}
`;
}

// KIRIM TELEGRAM
function kirimNotifTelegram(pesan) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(pesan)}&parse_mode=Markdown`;

  fetch(url)
    .then(() => console.log("Telegram: OK"))
    .catch((err) => console.error("Telegram Error:", err));
}

let lastStatus = { jatuh: 0, pingsan: 0, sos: 0 };

// ==========================================
// 3. LISTENER PERINGATAN
// ==========================================
onValue(ref(db, "peringatan"), (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  const waktu = new Date().toLocaleTimeString("id-ID");

  // =========================
  // TELEGRAM (MULTI STATUS)
  // =========================
  let statusList = [];

  if (data.sos === 1 && lastStatus.sos === 0) {
    statusList.push("SOS 🚨");
  }

  if (data.pingsan === 1 && lastStatus.pingsan === 0) {
    statusList.push("PINGSAN 🚑");
  } else if (data.jatuh === 1 && lastStatus.jatuh === 0) {
    statusList.push("JATUH ⚠️");
  }

  if (statusList.length > 0) {
    kirimNotifTelegram(formatPesan(statusList.join(", "), waktu));
  }

  // =========================
  // UPDATE UI
  // =========================
  document.getElementById("total_jatuh").innerText = data.jumlah_jatuh || 0;
  document.getElementById("total_pingsan").innerText = data.jumlah_pingsan || 0;

  document.getElementById("status_sos").innerHTML =
    data.sos === 1 ? `<span class="badge bg-danger">SOS</span>` : "Normal";

  document.getElementById("status_jatuh").innerHTML =
    data.jatuh === 1
      ? `<span class="badge bg-warning text-dark">Jatuh</span>`
      : "Normal";

  document.getElementById("status_pingsan").innerHTML =
    data.pingsan === 1
      ? `<span class="badge bg-danger">Pingsan</span>`
      : "Normal";

  // =========================
  // ALERT BOX
  // =========================
  const alertBox = document.getElementById("system-alert");
  const alertMsg = document.getElementById("alert-message");

  let pesan = [];

  if (data.sos === 1) pesan.push("TOMBOL SOS DITEKAN!");
  if (data.pingsan === 1) pesan.push("PASIEN PINGSAN!");
  else if (data.jatuh === 1) pesan.push("PASIEN TERJATUH!");

  if (pesan.length > 0) {
    alertMsg.innerHTML = pesan.join("<br>");
    alertBox.classList.remove("d-none");
  } else {
    alertBox.classList.add("d-none");
  }

  // SIMPAN STATUS TERAKHIR
  lastStatus = {
    jatuh: data.jatuh || 0,
    pingsan: data.pingsan || 0,
    sos: data.sos || 0,
  };
});

// ==========================================
// 4. LISTENER DATA SENSOR
// ==========================================
const sensorRef = query(ref(db, "data_sensor"), limitToLast(8));

onValue(sensorRef, (snapshot) => {
  const dataArray = [];

  snapshot.forEach((child) => {
    dataArray.push(child.val());
  });

  if (dataArray.length === 0) return;

  const latest = dataArray[dataArray.length - 1];

  // =========================
  // TEXT REALTIME
  // =========================
  document.getElementById("bpm").innerText = latest.bpm ?? "--";
  document.getElementById("spo2").innerText = (latest.spo2 ?? "--") + "%";
  document.getElementById("kondisi_jantung").innerText =
    latest.kondisi_jantung ?? "--";
  document.getElementById("kondisi_spo2").innerText =
    latest.kondisi_spo2 ?? "--";
  document.getElementById("last_update").innerText = latest.waktu ?? "--";

  // =========================
  // TABEL RIWAYAT
  // =========================
  const tableBody = document.getElementById("data_riwayat");

  tableBody.innerHTML = dataArray
    .slice()
    .reverse()
    .map(
      (d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${d.waktu ?? "-"}</td>
        <td>${d.bpm ?? "-"}</td>
        <td>${d.spo2 ?? "-"}%</td>
        <td>${d.kondisi_jantung ?? "-"}</td>
        <td>${d.kondisi_spo2 ?? "-"}</td>
      </tr>
    `,
    )
    .join("");

  // =========================
  // GRAFIK
  // =========================
  if (window.bpmChart && window.spo2Chart) {
    const labels = dataArray.map((d) => d.waktu ?? "");

    window.bpmChart.data.labels = labels;
    window.bpmChart.data.datasets[0].data = dataArray.map((d) => d.bpm ?? 0);
    window.bpmChart.update();

    window.spo2Chart.data.labels = labels;
    window.spo2Chart.data.datasets[0].data = dataArray.map((d) => d.spo2 ?? 0);
    window.spo2Chart.update();
  }
});
