/* ===========================
   ACTIVITY DATA
=========================== */
const activities = [
  {
    id: 1,
    title: "Taronga Zoo",
    emoji: "🦁",
    color: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
    description: "Meet over 4,000 animals with stunning Harbour views. A Sydney classic that never gets old — from giraffes to gorillas, there's wonder at every turn.",
    age: ["0-2", "3-5", "6-9", "10+"],
    neighborhood: "North Shore",
    day: ["Weekdays", "Weekends"],
    cost: "$47",
    costLabel: "per adult"
  },
  {
    id: 2,
    title: "Luna Park",
    emoji: "🎡",
    color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    description: "Step through the giant laughing face and into a world of rides and fairy floss. A heritage-listed icon on the Harbour, perfect for thrill-seeking kids.",
    age: ["3-5", "6-9", "10+"],
    neighborhood: "North Shore",
    day: ["Weekdays", "Weekends"],
    cost: "Free",
    costLabel: "entry (rides extra)"
  },
  {
    id: 3,
    title: "Manly Beach Rock Pools",
    emoji: "🪸",
    color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    description: "Hunt for crabs, starfish and tiny fish in the natural pools at Manly's North Head. A hands-on nature experience that kids absolutely love.",
    age: ["0-2", "3-5", "6-9"],
    neighborhood: "Northern Beaches",
    day: ["Weekdays", "Weekends"],
    cost: "Free",
    costLabel: "entry"
  },
  {
    id: 4,
    title: "SEA LIFE Sydney Aquarium",
    emoji: "🦈",
    color: "linear-gradient(135deg, #0052d4 0%, #4364f7 50%, #6fb1fc 100%)",
    description: "Walk through glass tunnels surrounded by sharks, rays and thousands of fish. The dugong exhibit is a firm family favourite.",
    age: ["0-2", "3-5", "6-9", "10+"],
    neighborhood: "CBD",
    day: ["Weekdays", "Weekends"],
    cost: "$44",
    costLabel: "per adult"
  },
  {
    id: 5,
    title: "Centennial Park Playgrounds",
    emoji: "🌳",
    color: "linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)",
    description: "Five hectares of parkland with multiple playgrounds, duck ponds, cycling tracks and wide open lawns. Pack a picnic and stay all day.",
    age: ["0-2", "3-5", "6-9", "10+"],
    neighborhood: "Eastern Suburbs",
    day: ["Weekdays", "Weekends"],
    cost: "Free",
    costLabel: "entry"
  },
  {
    id: 6,
    title: "Featherdale Wildlife Park",
    emoji: "🦘",
    color: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
    description: "Hand-feed kangaroos, cuddle a koala and spot wombats — all in one place. One of Australia's best small wildlife parks, right in Western Sydney.",
    age: ["0-2", "3-5", "6-9", "10+"],
    neighborhood: "Western Sydney",
    day: ["Weekdays", "Weekends"],
    cost: "$33",
    costLabel: "per adult"
  },
  {
    id: 7,
    title: "Powerhouse Museum",
    emoji: "🚀",
    color: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    description: "Science, technology, design and culture under one roof. Interactive exhibits keep kids engaged for hours, with something new every visit.",
    age: ["3-5", "6-9", "10+"],
    neighborhood: "CBD",
    day: ["Weekdays", "Weekends"],
    cost: "Free",
    costLabel: "general entry"
  },
  {
    id: 8,
    title: "Kids Cooking Class",
    emoji: "👨‍🍳",
    color: "linear-gradient(135deg, #f953c6 0%, #b91d73 100%)",
    description: "Junior chefs learn to make pizza, pasta and sweet treats in a fun, hands-on kitchen environment. Classes run on weekends for ages 6 and up.",
    age: ["6-9", "10+"],
    neighborhood: "Inner West",
    day: ["Weekends"],
    cost: "$65",
    costLabel: "per child"
  },
  {
    id: 9,
    title: "Bounce Inc Trampoline Park",
    emoji: "🤸",
    color: "linear-gradient(135deg, #f7971e 0%, #ff5f6d 100%)",
    description: "Walls of trampolines, foam pits, dodgeball courts and high-performance zones. Guaranteed to burn energy and deliver big smiles.",
    age: ["3-5", "6-9", "10+"],
    neighborhood: "Western Sydney",
    day: ["Weekdays", "Weekends"],
    cost: "$20",
    costLabel: "per hour"
  },
  {
    id: 10,
    title: "Sydney Observatory Stargazing",
    emoji: "🔭",
    color: "linear-gradient(135deg, #2c3e50 0%, #3498db 100%)",
    description: "Look through historic telescopes and discover the southern sky. Evening sessions offer a magical experience for curious kids aged 8 and up.",
    age: ["6-9", "10+"],
    neighborhood: "CBD",
    day: ["Weekends"],
    cost: "$27",
    costLabel: "per adult"
  },
  {
    id: 11,
    title: "Wet 'n' Wild Sydney",
    emoji: "💦",
    color: "linear-gradient(135deg, #00c6fb 0%, #005bea 100%)",
    description: "Twelve thrilling water rides, wave pools and lazy rivers. Sydney's biggest waterpark is the ultimate summer day out for the whole family.",
    age: ["3-5", "6-9", "10+"],
    neighborhood: "Western Sydney",
    day: ["Weekdays", "Weekends"],
    cost: "$68",
    costLabel: "per adult"
  },
  {
    id: 12,
    title: "Paddington Reservoir Gardens",
    emoji: "🌿",
    color: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    description: "Explore the atmospheric ruins of a Victorian-era reservoir transformed into a stunning urban garden. A free and fascinating history lesson outdoors.",
    age: ["3-5", "6-9", "10+"],
    neighborhood: "Eastern Suburbs",
    day: ["Weekdays", "Weekends"],
    cost: "Free",
    costLabel: "entry"
  },
  {
    id: 13,
    title: "Royal Botanic Garden Scavenger Hunt",
    emoji: "🌺",
    color: "linear-gradient(135deg, #c6f432 0%, #1cbf73 100%)",
    description: "Download the free activity sheet and embark on a self-guided discovery of Sydney's oldest garden. Spot birds, bugs and beautiful plants along the way.",
    age: ["0-2", "3-5", "6-9"],
    neighborhood: "CBD",
    day: ["Weekdays", "Weekends"],
    cost: "Free",
    costLabel: "entry"
  },
  {
    id: 14,
    title: "Inner West Climbing Gym",
    emoji: "🧗",
    color: "linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)",
    description: "Kid-friendly bouldering and top-rope climbing with qualified instructors. Great for building confidence, strength and problem-solving skills.",
    age: ["6-9", "10+"],
    neighborhood: "Inner West",
    day: ["Weekdays", "Weekends"],
    cost: "$25",
    costLabel: "per session"
  },
  {
    id: 15,
    title: "Sensory Play at Nurtured",
    emoji: "🎨",
    color: "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)",
    description: "Specially designed sensory play classes for babies and toddlers. Explore textures, colours and sounds in a safe, stimulating environment.",
    age: ["0-2", "3-5"],
    neighborhood: "North Shore",
    day: ["Weekdays"],
    cost: "$22",
    costLabel: "per session"
  }
];

/* ===========================
   STATE
=========================== */
const state = {
  age: "",
  neighborhood: "",
  day: ""
};

/* ===========================
   RENDER
=========================== */
function ageLabel(ageArr) {
  if (ageArr.includes("0-2") && ageArr.includes("10+")) return "All Ages";
  if (ageArr.length >= 4) return "All Ages";
  return ageArr.join(", ");
}

function dayLabel(dayArr) {
  if (dayArr.length === 2) return "Any Day";
  return dayArr[0];
}

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

  grid.innerHTML = list.map(act => `
    <article class="activity-card">
      <div class="activity-card__thumb" style="background: ${act.color}">
        <span>${act.emoji}</span>
      </div>
      <div class="activity-card__body">
        <div class="activity-card__tags">
          <span class="tag tag--age">🧒 ${ageLabel(act.age)}</span>
          <span class="tag tag--area">📍 ${act.neighborhood}</span>
          <span class="tag tag--day">📅 ${dayLabel(act.day)}</span>
        </div>
        <h3 class="activity-card__title">${act.title}</h3>
        <p class="activity-card__desc">${act.description}</p>
        <div class="activity-card__footer">
          <div class="activity-card__cost">
            ${act.cost} <span>${act.costLabel}</span>
          </div>
          <span class="activity-card__cta">View Details →</span>
        </div>
      </div>
    </article>
  `).join("");
}

/* ===========================
   FILTER
=========================== */
function applyFilters() {
  const { age, neighborhood, day } = state;

  const filtered = activities.filter(act => {
    const ageMatch = !age || act.age.includes(age);
    const neighborhoodMatch = !neighborhood || act.neighborhood === neighborhood;
    const dayMatch = !day || act.day.includes(day);
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
document.querySelectorAll(".filter-chips").forEach(group => {
  const filterKey = group.dataset.filter;

  group.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      // Update active chip within this group
      group.querySelectorAll(".chip").forEach(c => c.classList.remove("chip--active"));
      chip.classList.add("chip--active");

      state[filterKey] = chip.dataset.value;
      applyFilters();
    });
  });
});

document.getElementById("clear-filters").addEventListener("click", resetFilters);
document.getElementById("no-results-clear").addEventListener("click", resetFilters);

/* ===========================
   INIT
=========================== */
renderCards(activities);
