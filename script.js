/* ===========================
   LOAD ACTIVITIES FROM JSON
=========================== */
let activities = [];

async function loadActivities() {
  const res = await fetch('activities.json?v=oct26-strongest-ec-13');
  activities = await res.json();
  init();
}

/* ===========================
   STATE
=========================== */
const PAGE_SIZE = 15;

const state = {
  age: "",
  neighborhood: "",
  days: [],  // array — multi-select
  visibleCount: PAGE_SIZE
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
  if (!dayArr || dayArr.length === 0) return "Any Day";
  if (dayArr.length === 7) return "Any Day";
  if (dayArr.length === 5 &&
      ["Monday","Tuesday","Wednesday","Thursday","Friday"].every(d => dayArr.includes(d)))
    return "Mon - Fri";
  const abbr = { Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu",
                 Friday:"Fri", Saturday:"Sat", Sunday:"Sun" };
  return dayArr.map(d => abbr[d] || d).join(", ");
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

  // Rank special, date-specific experiences first. Routine weekly programmes go last.
  // Editor's Choice is deliberately only set by an editor.
  const recurringPattern = /storytime|story play|family tales|rhymetime|singing and stories|mindspark monday|kidtopia|lego challenge|game-a-thon|weekly|regular|every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;
  const specialPattern = /festival|opening|workshop|exhibition|art prize|fair|concert|rainforest|costume swap|open day|bird week|jazz|grandparents day|halloween|songs & stories/i;
  const isRecurringEvent = a => Boolean(a.isRecurring) ||
    (recurringPattern.test(a.title || '') && !specialPattern.test(a.title || ''));
  const rank = a => {
    if (a.editorsChoice) return -1000 + (a.ecOrder ?? 100);
    if (isRecurringEvent(a)) return 1000;
    let score = 100;
    if (specialPattern.test(a.title || '')) score -= 60;
    if (a.startDate && a.endDate && a.startDate === a.endDate) score -= 15;
    if (a.imageUrl && !/pexels|unsplash|pixabay/i.test(a.imageUrl)) score -= 8;
    if (a.cost === 'Free') score -= 5;
    return score;
  };
  const sorted = [...list].sort((a, b) =>
    rank(a) - rank(b) ||
    (a.editorialPriority ?? 999) - (b.editorialPriority ?? 999) ||
    (a.startDate || '9999').localeCompare(b.startDate || '9999') ||
    (a.title || '').localeCompare(b.title || '')
  );

  const visible = sorted.slice(0, state.visibleCount);
  const hasMore = sorted.length > state.visibleCount;

  countEl.textContent = `Showing ${visible.length} of ${list.length} activit${list.length === 1 ? "y" : "ies"}`;

  grid.innerHTML = visible.map((act, i) => {
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

    const venueHtml = act.venue
      ? `<div class="activity-card__address">📍 ${escapeHtml(act.venue)}</div>`
      : "";

    const featuredBadge = act.editorsChoice
      ? `<div class="activity-card__editors-choice">✨ Editor's Choice</div>`
      : "";

    const onlineBadge = act.isOnline
      ? `<span class="tag tag--online">💻 Online</span>`
      : "";

    // Link to subpage if seoSlug exists, else fall back to source URL
    let cardUrl, websiteBtn;
    if (act.seoSlug) {
      cardUrl = `/${act.seoSlug}/`;
      websiteBtn = `<a href="${cardUrl}" class="activity-card__cta">View Details →</a>`;
    } else {
      const sourceUrl = act.source || act.website;
      cardUrl = sourceUrl || "#";
      websiteBtn = sourceUrl
        ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="activity-card__cta">View Details →</a>`
        : `<span class="activity-card__cta">View Details →</span>`;
    }

    return `
    <article class="activity-card${act.editorsChoice ? " activity-card--editors-choice" : ""}" onclick="location.href='${act.seoSlug ? `/${act.seoSlug}/` : (act.source || act.website || '#')}'" style="cursor:pointer;">
      <div class="activity-card__thumb" style="${thumbStyle}">
        ${thumbContent}
        ${featuredBadge}
      </div>
      <div class="activity-card__body">
        <div class="activity-card__tags">
          ${act.category ? `<span class="tag tag--category">${escapeHtml(act.category)}</span>` : ""}
          <span class="tag tag--age">🧒 ${escapeHtml(ageLabel(act.age))}</span>
          <span class="tag tag--area">🏙️ ${escapeHtml(act.neighborhood)}</span>
          <span class="tag tag--day">📅 ${escapeHtml(dayLabel(act.day))}</span>
          ${onlineBadge}
          ${dateHtml}
        </div>
        <h3 class="activity-card__title">${escapeHtml(act.title)}</h3>
        <p class="activity-card__desc">${escapeHtml(act.description)}</p>
        ${timeHtml}
        ${venueHtml}
        <div class="activity-card__footer">
          <div class="activity-card__cost">
            ${escapeHtml(act.cost)} <span>${escapeHtml(act.costLabel)}</span>
          </div>
          ${websiteBtn}
        </div>
      </div>
    </article>`;
  }).join("");

  // Show More button
  let showMoreBtn = document.getElementById("show-more-btn");
  if (!showMoreBtn) {
    showMoreBtn = document.createElement("div");
    showMoreBtn.id = "show-more-btn";
    showMoreBtn.className = "show-more-wrap";
    showMoreBtn.innerHTML = `<button class="btn btn--primary btn--lg" id="show-more">Show More Activities</button>`;
    grid.after(showMoreBtn);

    document.getElementById("show-more").addEventListener("click", () => {
      const prevCount = state.visibleCount;
      state.visibleCount += PAGE_SIZE;
      applyFilters();
      // Scroll to first newly revealed card
      const cards = document.querySelectorAll(".activity-card");
      if (cards[prevCount]) {
        cards[prevCount].scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  showMoreBtn.style.display = hasMore ? "flex" : "none";
}

/* ===========================
   FILTER
=========================== */
function applyFilters() {
  const { age, neighborhood, days } = state;
  const dateParts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const part = type => dateParts.find(p => p.type === type)?.value || '';
  const today = `${part('year')}-${part('month')}-${part('day')}`;

  const normalizeAge = value => {
    const v = String(value || '').toLowerCase();
    if (v.includes('all ages')) return 'all';
    if (v.includes('babies') || v.includes('baby')) return 'babies';
    if (v.includes('toddler')) return 'toddlers';
    if (v.includes('pre-school') || v.includes('preschool')) return 'preschool';
    if (v.includes('school kids')) return 'school';
    if (v.includes('teen')) return 'teens';
    return v;
  };
  const normalizeArea = value => {
    const v = String(value || '').toLowerCase().trim();
    if (v.includes('north shore')) return 'north shore';
    if (v === 'city centre' || v === 'city center') return 'cbd';
    return v;
  };
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const activeDays = act => {
    if (!act.startDate) return Array.isArray(act.day) ? act.day : [];
    const start = new Date(act.startDate + 'T12:00:00Z');
    const end = new Date((act.endDate || act.startDate) + 'T12:00:00Z');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return act.day || [];
    const span = Math.round((end - start) / 86400000);
    if (span < 0 || span > 365) return act.day || [];
    const result = [];
    for (let i = 0; i <= span; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      result.push(dayNames[d.getUTCDay()]);
    }
    return result;
  };

  const filtered = activities.filter(act => {
    if (act.expired) return false;
    if (act.endDate && act.endDate < today) return false;
    if (!act.endDate && act.startDate && act.startDate < today) return false;

    const ages = Array.isArray(act.age) ? act.age : [act.age];
    const selectedAge = normalizeAge(age);
    const ageMatch = !age || ages.some(a => normalizeAge(a) === 'all' || normalizeAge(a) === selectedAge);
    const areaMatch = !neighborhood || normalizeArea(act.neighborhood) === normalizeArea(neighborhood);
    const dayMatch = days.length === 0 || days.some(d => activeDays(act).includes(d));
    return ageMatch && areaMatch && dayMatch;
  });
  renderCards(filtered);
}

function resetFilters() {
  state.age = "";
  state.neighborhood = "";
  state.days = [];
  state.visibleCount = PAGE_SIZE;

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
        state.visibleCount = PAGE_SIZE;
        if (filterKey === "day") {
          const val = chip.dataset.value;
          if (val === "") {
            // "Any Day" clears all
            group.querySelectorAll(".chip").forEach(c => c.classList.remove("chip--active"));
            chip.classList.add("chip--active");
            state.days = [];
          } else {
            group.querySelector('[data-value=""]').classList.remove("chip--active");
            chip.classList.toggle("chip--active");
            const active = chip.classList.contains("chip--active");
            if (active) {
              state.days.push(val);
            } else {
              state.days = state.days.filter(d => d !== val);
            }
            if (state.days.length === 0) {
              group.querySelector('[data-value=""]').classList.add("chip--active");
            }
          }
        } else {
          group.querySelectorAll(".chip").forEach(c => c.classList.remove("chip--active"));
          chip.classList.add("chip--active");
          state[filterKey] = chip.dataset.value;
        }
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
  applyFilters();
}

loadActivities();

/* ===========================
   NEWSLETTER SIGNUP
=========================== */
(function () {
  if (new URLSearchParams(window.location.search).get('subscribed') === '1') {
    const msg = document.getElementById('newsletter-msg');
    if (msg) {
      msg.textContent = 'Thank you for subscribing! On Sunday we\'ll send you the best of next week\'s activities. 🎉';
      msg.style.color = '#fff';
      msg.style.display = 'block';
    }
  }
}());

/* ===========================
   MOBILE HAMBURGER MENU
=========================== */
(function () {
  const btn = document.getElementById('nav-hamburger');
  const menu = document.getElementById('nav-mobile-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', isOpen);
    menu.setAttribute('aria-hidden', !isOpen);
  });

  // Close menu when a link inside it is clicked
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
    });
  });
}());
