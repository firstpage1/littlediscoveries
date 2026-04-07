/* ===========================
   LOAD ACTIVITIES FROM JSON
=========================== */
let activities = [];

async function loadActivities() {
  const res = await fetch('activities.json');
  activities = await res.json();
  init();
}

/* ===========================
   STATE
=========================== */
const state = {
  age: "",
  neighborhood: "",
  day: ""
};

/* ===========================
   HELPERS
=========================== */
function ageLabel(ageArr) {
  if (!ageArr || ageArr.length === 0) return "All Ages";
  if (ageArr.length >= 4) return "All Ages";
  // Shorten the new verbose labels for the card tags
  return ageArr.map(a => a.replace(" years)", ")")).join(", ");
}

function dayLabel(dayArr) {
  if (!dayArr || dayArr.length >= 2) return "Any Day";
  return dayArr[0];
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cardGradient(index) {
  const gradients = [
    "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #0052d4 0%, #4364f7 50%, #6fb1fc 100%)",
    "linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)",
    "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    "linear-gradient(135deg, #f953c6 0%, #b91d73 100%)",
    "linear-gradient(135deg, #f7971e 0%, #ff5f6d 100%)",
    "linear-gradient(135deg, #2c3e50 0%, #3498db 100%)",
    "linear-gradient(135deg, #00c6fb 0%, #005bea 100%)",
    "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    "linear-gradient(135deg, #c6f432 0%, #1cbf73 100%)",
    "linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)",
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)",
    "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
    "linear-gradient(135deg, #fd7043 0%, #ff8a65 100%)",
    "linear-gradient(135deg, #26c6da 0%, #00acc1 100%)"
  ];
  return gradients[index % gradients.length];
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

/* ===========================
   TAG -> EMOJI LOOKUP
=========================== */
const TAG_EMOJI = {
  library:        "📚",
  rhymetime:      "🎵",
  storytime:      "📖",
  babies:         "👶",
  toddlers:       "🧒",
  "pre-schoolers":"🌟",
  "school holidays": "🎒",
  workshop:       "🎨",
  craft:          "✂️",
  STEM:           "🔬",
  robotics:       "🤖",
  coding:         "💻",
  sport:          "⚽",
  gymnastics:     "🤸",
  bilingual:      "🌏",
  Auslan:         "🤟",
  inclusive:      "🌈",
  music:          "🎶",
  art:            "🎨",
  nature:         "🌿",
  swimming:       "🏊",
  dance:          "💃"
};

function tagsEmoji(tags) {
  if (!tags || tags.length === 0) return "🎯";
  for (const t of tags) {
    if (TAG_EMOJI[t]) return TAG_EMOJI[t];
  }
  return "🎯";
}

/* ===========================
   RENDER
=========================== */
function renderCards(list) {
  const grid = document.getElementById("activity-grid");
  const noResults = document.getElementById("no-results");
  const countEl = document.getElementById("results-count");

  if (list.length === 0) {
    grid.innerHTML = "";
    noResults.classList.remove("hidden");
    countEl.textContent = "No activities found";
    return;
  }

  noResults.classList.add("hidden");
  countEl.textContent = `Showing ${list.length} activit${list.length === 1 ? "y" : "ies"}`;

  // Featured first
  const sorted = [...list].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

  grid.innerHTML = sorted.map((act, i) => {
    // Thumbnail: real image if available, else gradient + emoji
    let thumbContent;
    if (act.imageUrl && act.imageUrl.trim() !== "") {
      thumbContent = `<img src="${escapeHtml(act.imageUrl)}" alt="${escapeHtml(act.title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.style.background='${cardGradient(i)}'; this.outerHTML='<span style=\\'font-size:4rem;\\'>${tagsEmoji(act.tags)}</span>';" />`;
    } else {
      thumbContent = `<span style="font-size:4rem;">${tagsEmoji(act.tags)}</span>`;
    }
    const thumbStyle = (act.imageUrl && act.imageUrl.trim() !== "") ? `background: #eee` : `background: ${cardGradient(i)}`;

    const dateHtml = act.startDate
      ? `<span class="tag tag--date">📆 ${formatDate(act.startDate)}${act.endDate ? " - " + formatDate(act.endDate) : ""}</span>`
      : "";

    const timeHtml = act.time
      ? `<div class="activity-card__time">🕐 ${escapeHtml(act.time)}</div>`
      : "";

    const addressHtml = act.address
      ? `<div class="activity-card__address">📍 ${escapeHtml(act.address)}</div>`
      : "";

    const featuredBadge = act.isFeatured
      ? `<div class="activity-card__featured">⭐ Featured</div>`
      : "";

    const recurringBadge = act.isRecurring
      ? `<span class="tag tag--recurring">🔁 Recurring</span>`
      : "";

    // Link to subpage if seoSlug exists, else fall back to source URL
    let cardUrl, websiteBtn;
    if (act.seoSlug) {
      cardUrl = `/littlediscoveries/${act.seoSlug}/`;
      websiteBtn = `<a href="${cardUrl}" class="activity-card__cta">View Details →</a>`;
    } else {
      const sourceUrl = act.source || act.website;
      cardUrl = sourceUrl || "#";
      websiteBtn = sourceUrl
        ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="activity-card__cta">View Details →</a>`
        : `<span class="activity-card__cta">View Details →</span>`;
    }

    return `
    <article class="activity-card${act.isFeatured ? " activity-card--featured" : ""}" onclick="location.href='${act.seoSlug ? `/littlediscoveries/${act.seoSlug}/` : (act.source || act.website || '#')}'" style="cursor:pointer;">
      <div class="activity-card__thumb" style="${thumbStyle}">
        ${thumbContent}
        ${featuredBadge}
      </div>
      <div class="activity-card__body">
        <div class="activity-card__tags">
          <span class="tag tag--age">🧒 ${escapeHtml(ageLabel(act.age))}</span>
          <span class="tag tag--area">🏙️ ${escapeHtml(act.neighborhood)}</span>
          <span class="tag tag--day">📅 ${escapeHtml(dayLabel(act.day))}</span>
          ${recurringBadge}
          ${dateHtml}
        </div>
        <h3 class="activity-card__title">${escapeHtml(act.title)}</h3>
        <p class="activity-card__desc">${escapeHtml(act.description)}</p>
        ${timeHtml}
        ${addressHtml}
        <div class="activity-card__footer">
          <div class="activity-card__cost">
            ${escapeHtml(act.cost)} <span>${escapeHtml(act.costLabel)}</span>
          </div>
          ${websiteBtn}
        </div>
      </div>
    </article>`;
  }).join("");
}

/* ===========================
   FILTER
=========================== */
function applyFilters() {
  const { age, neighborhood, day } = state;

  const filtered = activities.filter(act => {
    const ageMatch = !age || (act.age && act.age.includes(age));
    const neighborhoodMatch = !neighborhood || act.neighborhood === neighborhood;
    const dayMatch = !day || (act.day && act.day.includes(day));
    return ageMatch && neighborhoodMatch && dayMatch;
  });

  renderCards(filtered);
}

function resetFilters() {
  state.age = "";
  state.neighborhood = "";
  state.day = "";

  document.querySelectorAll(".filter-chips").forEach(group => {
    group.querySelectorAll(".chip").forEach(chip => {
      chip.classList.toggle("chip--active", chip.dataset.value === "");
    });
  });

  applyFilters();
}

/* ===========================
   EVENTS
=========================== */
function bindEvents() {
  document.querySelectorAll(".filter-chips").forEach(group => {
    const filterKey = group.dataset.filter;
    group.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        group.querySelectorAll(".chip").forEach(c => c.classList.remove("chip--active"));
        chip.classList.add("chip--active");
        state[filterKey] = chip.dataset.value;
        applyFilters();
      });
    });
  });

  document.getElementById("clear-filters").addEventListener("click", resetFilters);
  document.getElementById("no-results-clear").addEventListener("click", resetFilters);
}

/* ===========================
   INIT
=========================== */
function init() {
  bindEvents();
  renderCards(activities);
}

loadActivities();
