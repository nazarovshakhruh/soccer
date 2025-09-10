// --- Utility: make slugs from player names ---
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

async function loadMatchFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug"); // e.g. "royals-vs-blitz-2025-09-11"

  if (!slug) {
    document.getElementById("match-info").textContent = "No match selected.";
    return;
  }

  await loadMatch(slug);
}

async function loadMatch(matchId) {
  try {
    const res = await fetch("/assets/dbjr.json");
    const db = await res.json();

    const match = db.matches.find(m => m.id === matchId);
    if (!match) {
      document.getElementById("match-info").textContent = "Match not found.";
      return;
    }

    const clubsById = Object.fromEntries(db.clubs.map(c => [c.id, c]));
    const playersById = Object.fromEntries(db.players.map(p => [p.id, p]));

    const home = clubsById[match.home_team];
    const away = clubsById[match.away_team];

    // --- Match info header ---
    document.getElementById("match-info").innerHTML = `
      <h2>
        <div class="jt fhlf">
          <a href="/teamsjr/${home.id}">
            ${home.name}
          </a>
          <img src="${home.crest}" alt="${home.name} crest" style="height:70px;vertical-align:middle">
        </div>
        <span>${
  match.home_goals === null || match.away_goals === null
    ? "?"
    : `${match.home_goals} - ${match.away_goals}`
}</span>
        <div class="jt shlf">
          <img src="${away.crest}" alt="${away.name} crest" style="height:70px;vertical-align:middle">
          <a href="/teamsjr/${away.id}">
            ${away.name}
          </a>
        </div>
      </h2>
      <p>${new Date(match.date).toLocaleString("en-GB")}</p>
    `;

    // --- Clear events ---
    const homeEventsDiv = document.getElementById("home-events");
    const awayEventsDiv = document.getElementById("away-events");

    homeEventsDiv.innerHTML = "<h3>Home</h3>";
    awayEventsDiv.innerHTML = "<h3>Away</h3>";

    let homeEventCount = 0;
    let awayEventCount = 0;

    // --- Add goal events (normal, own goals, penalties) ---
    match.events.forEach(ev => {
      if (["goal", "own_goal", "penalty"].includes(ev.type)) {
        const scorer = playersById[ev.player_id];
        const assist = ev.assist_id ? playersById[ev.assist_id] : null;
        const club = scorer ? clubsById[scorer.club_id] : null;

        const div = document.createElement("div");
        div.className = "event";

        let goalText = "";
        if (ev.type === "own_goal") {
          goalText = `<strong><a href="/playersjr/${scorer ? slugify(scorer.name) : ""}">
                        ${scorer ? scorer.name : "Unknown"}
                      </a></strong> (own goal)`;
        } else if (ev.type === "penalty") {
          goalText = `<strong><a href="/playersjr/${scorer ? slugify(scorer.name) : ""}">
                        ${scorer ? scorer.name : "Unknown"}
                      </a></strong> (penalty)`;
        } else {
          goalText = `<strong><a href="/playersjr/${scorer ? slugify(scorer.name) : ""}">
                        ${scorer ? scorer.name : "Unknown"}
                      </a></strong> ${club ? `(${club.name})` : ""}`;
        }

        const assistText =
          (ev.type === "goal" && assist)
            ? ` <img class="musr" src="/assets/assist.png" style="width:30px;height:30px"> <a href="/playersjr/${slugify(assist.name)}">${assist.name}</a>`
            : "";

        // Pick the right icon based on type
        let iconSrc = "/assets/goal.png";
        if (ev.type === "penalty") {
          iconSrc = "/assets/penalty.png";
        } else if (ev.type === "own_goal") {
          iconSrc = "/assets/owngoal.png";
        }

        div.innerHTML = `
          <span>${ev.minute}'</span>
          ${club ? `<img class="musr2" src="${iconSrc}" style="width:20px;height:20px"> <img src="${club.crest}" style="width:40px;height:40px">` : ""}
          ${goalText}
          ${assistText}
          <br><small>${scorer ? scorer.position : ""}${scorer ? ", " + scorer.nationality : ""}</small>
        `;

        // 🏠 Home goals left | 🛫 Away goals right
        if (ev.type === "own_goal") {
          if (ev.club_id === match.home_team) {
            awayEventsDiv.appendChild(div);
            awayEventCount++;
          } else {
            homeEventsDiv.appendChild(div);
            homeEventCount++;
          }
        } else {
          if (ev.club_id === match.home_team) {
            homeEventsDiv.appendChild(div);
            homeEventCount++;
          } else if (ev.club_id === match.away_team) {
            awayEventsDiv.appendChild(div);
            awayEventCount++;
          }
        }
      }
    });

    // If no events for either side, add placeholder text
    if (homeEventCount === 0) {
      homeEventsDiv.innerHTML += "<p class='no-events'>No home events</p>";
    }
    if (awayEventCount === 0) {
      awayEventsDiv.innerHTML += "<p class='no-events'>No away events</p>";
    }

  } catch (err) {
    console.error("Failed to load match:", err);
    document.getElementById("match-info").textContent = "Error loading match data.";
  }
}

// Auto-load
loadMatchFromUrl();
