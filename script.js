// Helper: render one card's inner HTML (supports multiple flags)
function ensureCardContent(card){
  if (card.dataset.ready) return;

  const name = card.dataset.name || "";
  const flags = (card.dataset.flags || "").split(",").map(s => s.trim()).filter(Boolean);

  // Build flags row
  const flagsHTML = flags.map(code =>
    `<img src="https://flagcdn.com/w40/${code}.png" alt="${code.toUpperCase()} flag" loading="lazy">`
  ).join("");

  card.innerHTML = `
    <div class="flags">${flagsHTML}</div>
    <div class="country">${name}</div>
    <div class="time">--:--</div>
    <div class="utc">UTC--</div>
    <div class="date">---</div>
  `;

  card.dataset.ready = "1";
}

// Format: "Sun,Aug 24,2025"
function formatCardDate(d, tz){
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).formatToParts(d);

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const wd = map.weekday;    // Sun
  const mon = map.month;     // Aug
  const day = map.day;       // 24
  const yr = map.year;       // 2025
  return `${wd},${mon} ${day},${yr}`;
}

// Always return strict UTC±hh:mm for any timezone
function getUTCLabel(d, tz) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset"
  });

  const parts = dtf.formatToParts(d);
  const offsetToken = parts.find(p => p.type === "timeZoneName")?.value || "UTC+0";

  let out = offsetToken.replace(/^GMT/i, "UTC");

  const match = out.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (match) {
    const sign = match[1];
    const hh = match[2].padStart(2, "0");
    const mm = (match[3] || "00").padStart(2, "0");
    out = `UTC${sign}${hh}:${mm}`;
  }
  return out;
}

function updateAllCards() {
  const now = new Date();

  document.querySelectorAll(".card").forEach(card => {
    ensureCardContent(card);

    const tz = card.dataset.tz;
    if (!tz) return;

    // Time in 12-hour format
    const timeStr = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(now);

    // UTC offset
    const utcStr = getUTCLabel(now, tz);

    // Date
    const dateStr = formatCardDate(now, tz);

    card.querySelector(".time").textContent = timeStr;
    const timeElem = card.querySelector(".time");
    card.querySelector(".utc").textContent = utcStr;
    card.querySelector(".date").textContent = dateStr;

    // ================== DAY/NIGHT LOGIC ==================
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false
    }).format(now);

    const isDay = hour >= 6 && hour < 18; // 6 AM – 6 PM

    // ================== WEEKDAY / WEEKEND LOGIC ==================
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short"
    }).format(now);

    // Default weekend
    let weekends = ["Sat", "Sun"];

    // GCC weekend override
    const name = card.dataset.name || "";
    if (
      name.includes("Saudi Arabia & Bahrain") ||
      name.includes("Kuwait, Oman, Qatar, UAE")
    ) {
      weekends = ["Fri", "Sat"];
    }

    const isWeekend = weekends.includes(weekday);

    // ================== RED TIME LOGIC ==================
    let redTime = false;
    if (isWeekend) {
      redTime = true; // all day red
    } else {
      if (hour >= 17 || hour < 8) redTime = true; // 5 PM – 7:59 AM
    }

    // Apply time color
    timeElem.style.color = redTime ? "red" : (tz === "Asia/Kolkata" ? "white" : "");

    // ================== CARD BACKGROUND ==================
    if (card.dataset.tz === "Asia/Kolkata") {
      // India card always green
      card.style.backgroundColor = "#008000";
      card.style.color = "white";
    } else {
      if (isDay) {
        card.style.backgroundColor = "var(--card-bg)";
        card.style.color = "var(--text)";
      } else {
        card.style.background =
          "linear-gradient(145deg, rgba(150, 150, 150, 0.95), rgba(110, 110, 110, 0.9))";
        card.style.color = "white";
      }
    }
  });

  // Bar 4 segment 1 same color as India
  const bar4Segment1 = document.querySelector(".bar4 > div:nth-child(1)");
  if (bar4Segment1) {
    bar4Segment1.style.backgroundColor = "#008000"; // India green
    bar4Segment1.style.color = "white";
  }
}


/* ===== Insert separate small bars (segments) =====
   Each segment is a .bar-chip element placed into the main 9-col grid.
   We give each segment an inline grid-column: span N to realize your splits.
*/
function insertBarSegments(){
  const grid = document.querySelector(".grid");
  if (!grid) return;

  // Clean up old chips if re-running
  grid.querySelectorAll(".bar-chip").forEach(n => n.remove());

  const cards = Array.from(grid.querySelectorAll(".card"));

  // Where to insert (before which card index) and how to split (must sum to 9)
  const groups = [
    { before: 0,  spans: [3,3,1,1,1], labels: ["Mexico&CAM cluster","SAM Cluster","NAM Cluster","Brazil","UKI Cluster"] },
    { before: 9,  spans: [2,1,1,2,3], labels: ["Iberia Region","Belgium/Luxembourg","DACH Region","France&Italy Cluster","Nordics"] },
    { before: 18, spans: [2,2,1,1,1,2], labels: ["NEA Cluster","SEE Region","Saudi & Bahrain","Baltics","Gulf Cluster","Central Asia(Sub Cluster)"] },
    { before: 27, spans: [1,2,3,1,2],   labels: ["India","Indonesia,Thailan,Vietnam","East Asian Countries","Japan& Korea","Pacific Cluster"] },
  ];

  groups.forEach((g, gi) => {
    const ref = cards[g.before] || null;
    if (!ref) return;

    g.spans.forEach((span, si) => {
      const chip = document.createElement("div");
      chip.className = "bar-chip";
      chip.textContent = g.labels?.[si] ?? "";
      chip.style.gridColumn = `span ${span}`;
      chip.setAttribute("role", "group");
      chip.setAttribute("aria-label", `Bar ${gi+1} Segment ${si+1}`);

       if (gi === 3 && si === 0) {
      chip.style.backgroundColor = "#008000"; // same green as India card
      chip.style.color = "white";             // make text visible
      chip.style.borderRadius = "10px";       // optional for style
      chip.style.display = "flex";
      chip.style.alignItems = "center";
      chip.style.justifyContent = "center";
    }

      grid.insertBefore(chip, ref);
    });
  });

}

// Start
updateAllCards();
setInterval(updateAllCards, 1000);

insertBarSegments();
