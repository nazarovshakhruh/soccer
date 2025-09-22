async function loadDB() {
  const res = await fetch('/dbjr.json', { cache: "no-store" });
  return res.json();
}

function slugify(s) {
  return String(s).toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
}

function getPlayerSlug() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('slug')) return urlParams.get('slug');
  return window.location.pathname.split('/').pop();
}

// 🟢 Calculate appearances dynamically based on matches
function calculateAppearances(players, matches) {
  const clubMatches = {};

  matches.forEach(m => {
    // only count matches that already happened (goals not null)
    if (m.home_goals !== null && m.away_goals !== null) {
      [m.home_team, m.away_team].forEach(teamId => {
        clubMatches[teamId] = (clubMatches[teamId] || 0) + 1;
      });
    }
  });

  players.forEach(p => {
    p.appearances = clubMatches[p.club_id] || 0;
  });

  return players;
}

// 🟢 Calculate goals and assists dynamically from events
function calculateGoalsAssists(players, matches) {
  const stats = {};
  players.forEach(p => { stats[p.id] = { goals: 0, assists: 0 }; });

  matches.forEach(m => {
    if (m.home_goals !== null && m.away_goals !== null && m.events) {
      m.events.forEach(ev => {
        // Count goals from normal + penalties
        if (ev.type === "goal" || ev.type === "penalty") {
          if (ev.player_id && stats[ev.player_id]) {
            stats[ev.player_id].goals++;
          }
          if (ev.assist_id && stats[ev.assist_id] && ev.type === "goal") {
            // assists only from open play goals
            stats[ev.assist_id].assists++;
          }
        }
        // own_goal gives no credit to scorer
      });
    }
  });

  players.forEach(p => {
    p.goals = stats[p.id]?.goals || 0;
    p.assists = stats[p.id]?.assists || 0;
  });

  return players;
}
// 🟢 Calculate MOTM counts dynamically
function calculateMotm(players, matches) {
  const counts = {};
  players.forEach(p => { counts[p.id] = 0; });

  matches.forEach(m => {
    if (m.home_goals !== null && m.away_goals !== null && m.motm) {
      if (counts[m.motm] !== undefined) {
        counts[m.motm]++;
      }
    }
  });

  players.forEach(p => {
    p.motm = counts[p.id] || 0;
  });

  return players;
}

(async function () {
  const db = await loadDB();

  // 🟢 recalc appearances, goals, and assists before using players
  calculateAppearances(db.players, db.matches);
  calculateGoalsAssists(db.players, db.matches);
  calculateMotm(db.players, db.matches);


  const slug = getPlayerSlug();
  const player = db.players.find(p => slugify(p.name) === slug);

  if (!player) {
    document.body.innerHTML = "<p style='color:red'>Player not found</p>";
    return;
  }

  const club = db.clubs.find(c => c.id === player.club_id);
  const teammates = db.players.filter(p => p.club_id === player.club_id && p.id !== player.id);

  const container = document.getElementById("player-container");
  container.innerHTML = `
  <div class="hdrs">
    <div class="player-header fnm">
      <img class="shyt" src="${player.image || 'https://placehold.co/150x200?text=Player'}" alt="${player.name}">
<div class="out" id="player-out">
<div class="row">
  <img src="/assets/Flag.svg" class="flag-icon">
</div>
  <h1>${player.name}</h1>
  <div class="player-meta">
    ${club ? `<img class="shit" src="${club.crest}" width="24">${club.name}` : ''} (Senior League) • ${player.position}
  </div>
</div>

    </div>
    <div class="player-header knd">
      <a href="/teamsjr/${club?.id}">
        <h2>Club</h2>
        <img class="shyt" src="${club?.crest || 'https://placehold.co/150x200?text=Club'}" alt="${club?.name}">
      </a>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card"><strong>Nationality</strong><br>${player.nationality || 'Unknown'}</div>
    <div class="stat-card"><strong>Grade</strong><br>${player.age || 'Unknown'}</div>
    <div class="stat-card"><strong>Appearances</strong><br>${player.appearances}</div>
    <div class="stat-card"><strong>Preferred Foot</strong><br>${player.preferred_foot || 'Unknown'}</div>
    <div class="stat-card"><strong>Goals</strong><br>${player.goals}</div>
    <div class="stat-card"><strong>Assists</strong><br>${player.assists}</div>
    <div class="stat-card"><strong>MOTMs</strong><br>${player.motm}</div>
  </div>

  <div class="teammates">
    <h2>Teammates</h2>
    <div class="teammate-list">
      ${teammates.map(t => `
        <div class="teammate-card">
          <a href="/playersjr/${slugify(t.name)}">
            <img src="${t.image || 'https://placehold.co/80x80?text=Player'}" alt="${t.name}">
            <div><strong>${t.name}</strong></div>
            <div>${t.position}</div>
          </a>
        </div>
      `).join('')}
    </div>
  </div>
  `;
// ⭐ Add star next to flag if player is in the star list
const starPlayers = ["alibek-norimatov", "shohrux-nazarov"]; // slugs or ids of star players

if (starPlayers.includes(slug) || starPlayers.includes(String(player.id))) {
  const outDiv = document.getElementById("player-out");
  const flagImg = outDiv.querySelector(".flag-icon");

  if (flagImg) {
    const starImg = document.createElement("img");
    starImg.src = "/assets/star.png"; // replace with your star image path
    starImg.alt = "Star Player";
    starImg.classList.add("star-icon"); // optional styling
    flagImg.insertAdjacentElement("afterend", starImg);
  }
}
})();
