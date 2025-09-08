async function loadDB() {
  const res = await fetch('/assets/dbjr.json', { cache: "no-store" });
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

(async function () {
  const db = await loadDB();

  // 🟢 recalc appearances before using players
  calculateAppearances(db.players, db.matches);

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
      <div class="out">
        <img src="/assets/Flag.svg">
        <h1>${player.name}</h1>
        <div class="player-meta">
          ${club ? `<img class="shit" src="${club.crest}" width="24"> ${club.name}` : ''} • ${player.position}
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
    <div class="stat-card"><strong>Grade</strong><br>${player.age || 'Unknown'}</div>
    <div class="stat-card"><strong>Nationality</strong><br>${player.nationality || 'Unknown'}</div>
    <div class="stat-card"><strong>Preferred Foot</strong><br>${player.preferred_foot || 'Unknown'}</div>
    <div class="stat-card"><strong>Appearances</strong><br>${player.appearances}</div>
    <div class="stat-card"><strong>Goals</strong><br>${player.goals}</div>
    <div class="stat-card"><strong>Assists</strong><br>${player.assists}</div>
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
})();
