  (function(){
    async function fetchData(){
      try {
        const res = await fetch('db.json', {cache:'no-store'});
        if(!res.ok) throw new Error('no db.json');
        return await res.json();
      } catch(err){
        // fallback sample
        return {
          teams: [
            {id:'t1', name:'Club 1', crest:'assets/nushpiyoz.png'},
            {id:'t2', name:'Club 2', crest:'club2.png'},
            {id:'t3', name:'Club 3', crest:'club3.png'},
            {id:'t4', name:'Club 4', crest:'club4.png'},
            {id:'t5', name:'Club 5', crest:'club5.png'},
            {id:'t6', name:'Club 6', crest:'club6.png'},
            {id:'t7', name:'Club 7', crest:'club7.png'},
            {id:'t8', name:'Club 8', crest:'club8.png'}
          ],
          matches: [
            // you can pre-fill some scores here to test auto-progression:
            // {id:'qf1', home:'t1', away:'t2', home_score:2, away_score:1, date:'2025-09-10T12:00:00Z'},
            // ...
          ]
        };
      }
    }

    function getScoreField(m){
      const home = (m.home_score != null) ? m.home_score : (m.home_goals != null ? m.home_goals : null);
      const away = (m.away_score != null) ? m.away_score : (m.away_goals != null ? m.away_goals : null);
      return {home, away};
    }

    function winnerOf(match){
      if(!match) return null;
      const s = getScoreField(match);
      if(s.home == null || s.away == null) return null;
      if(s.home > s.away) return match.home;
      if(s.away > s.home) return match.away;
      return null; // draw -> no auto winner
    }

    function safeTeamById(teams, id){
      return teams.find(t => t.id === id) || null;
    }

    function renderOuterSlots(teams){
      for(let i=0;i<8;i++){
        const slot = document.querySelector(`.outer-slot[data-pos="${i}"]`);
        if(!slot) continue;
        const team = teams[i] || null;
        if(team){
          slot.innerHTML = `<img src="${team.crest}" alt="${team.name}"><div class="team-name">${team.name}</div>`;
        } else {
          slot.innerHTML = `<div style="opacity:.6">TBD</div>`;
        }
      }
    }

    function renderMatchCard(el, homeTeam, awayTeam, matchData){
      // matchData may be undefined; homeTeam/awayTeam may be null
      const homeName = homeTeam ? homeTeam.name : 'TBD';
      const awayName = awayTeam ? awayTeam.name : 'TBD';
      const homeCrest = homeTeam ? homeTeam.crest : 'https://placehold.co/44x44?text=?';
      const awayCrest = awayTeam ? awayTeam.crest : 'https://placehold.co/44x44?text=?';
      const s = matchData ? getScoreField(matchData) : {home:null, away:null};
      const scoreStr = (s.home==null || s.away==null) ? '' : `<span class="score">${s.home} - ${s.away}</span>`;
      el.innerHTML = `
        <div style="width:100%;display:flex;flex-direction:column;gap:6px;align-items:center">
          <div class="pair">
            <div class="team-mini"><img src="${homeCrest}" alt=""><div class="tname">${homeName}</div></div>
            ${ (s.home==null && s.away==null) ? '<div style="flex:1"></div>' : `<div style="flex:1;text-align:center">${scoreStr}</div>` }
            <div class="team-mini"><img src="${awayCrest}" alt=""><div class="tname">${awayName}</div></div>
          </div>
          <div class="muted" style="font-size:12px">${matchData && matchData.date ? (new Date(matchData.date)).toLocaleString() : ''}</div>
        </div>
      `;
    }

    function pushWinnerToTarget(matchesById, fromMatchId, toMatchId, toField){
      // if both from match and to match exist, set the toMatch home/away id if not already provided (so DB can override)
      const from = matchesById[fromMatchId];
      const to = matchesById[toMatchId];
      if(!from || !to) return;
      const w = winnerOf(from);
      if(!w) return;
      // only set target if missing
      if(!to[toField]) to[toField] = w;
    }

    async function init(){
      const db = await fetchData();
      const teams = db.teams || [];
      const matchesFromDb = (db.matches || []).reduce((acc,m)=>{ acc[m.id] = {...m}; return acc;},{});

      // 1) Render outer slots using teams array order (positions 0..7)
      renderOuterSlots(teams);

      // 2) Build the quarterfinal matches (if DB has qf matches, prefer them)
      // default pairing using positions: 0v1, 2v3, 4v5, 6v7
      const qfDefaults = [
        {id:'qf1', home: teams[0]?.id || null, away: teams[1]?.id || null},
        {id:'qf2', home: teams[2]?.id || null, away: teams[3]?.id || null},
        {id:'qf3', home: teams[4]?.id || null, away: teams[5]?.id || null},
        {id:'qf4', home: teams[6]?.id || null, away: teams[7]?.id || null}
      ];

      // Merge with db matches (db may contain scores & overrides)
      const matches = {};
      qfDefaults.forEach(d=>{
        matches[d.id] = matchesFromDb[d.id] ? {...d,...matchesFromDb[d.id]} : {...d};
      });

      // Ensure semifinals + final exist (either from DB or created)
      matches['sf1'] = matchesFromDb['sf1'] ? {...matchesFromDb['sf1']} : {id:'sf1', home:null, away:null};
      matches['sf2'] = matchesFromDb['sf2'] ? {...matchesFromDb['sf2']} : {id:'sf2', home:null, away:null};
      matches['final'] = matchesFromDb['final'] ? {...matchesFromDb['final']} : {id:'final', home:null, away:null};

      // If DB provided explicit qf matches use them (already merged above). Also allow DB to provide explicit qf ids not present in defaults:
      Object.keys(matchesFromDb).forEach(k=>{
        if(/^qf[1-4]$/.test(k)) matches[k] = {...matchesFromDb[k]};
      });

      // 3) compute winners from QFs (if scores present) and push to SFs
      // mapping: qf1 -> sf1.home, qf2 -> sf1.away ; qf3 -> sf2.home, qf4 -> sf2.away
      // But db might already have sf1 populated; only fill empty fields
      pushWinnerToTarget(matches, 'qf1', 'sf1', 'home');
      pushWinnerToTarget(matches, 'qf2', 'sf1', 'away');
      pushWinnerToTarget(matches, 'qf3', 'sf2', 'home');
      pushWinnerToTarget(matches, 'qf4', 'sf2', 'away');

      // after possibly pushing winners, we can also allow DB provided sf results to determine final
      pushWinnerToTarget(matches, 'sf1', 'final', 'home');
      pushWinnerToTarget(matches, 'sf2', 'final', 'away');

      // If DB contains explicit sf matches, override the constructed ones
      ['sf1','sf2','final'].forEach(id=>{
        if(matchesFromDb[id]) matches[id] = {...matchesFromDb[id]};
      });

      // 4) Render the left semis (we used placeholders data-match="qf1-sf1" etc to decide which pair goes where)
      // We'll treat left-semis first card as SF1, second as SF1 second slot (for display symmetry)
      const leftSemiEls = document.querySelectorAll('#left-semis .match-card');
      // Render SF1: home = winner qf1 OR matches['sf1'].home ; away = winner qf2 OR matches['sf1'].away
      const sf1home = safeTeamById(teams, matches['sf1'].home) || safeTeamById(teams, matches['qf1']?.home);
      const sf1away = safeTeamById(teams, matches['sf1'].away) || safeTeamById(teams, matches['qf2']?.home);
      // Put the two halves (we'll render the same sf into both cards for visual vertical layout)
      leftSemiEls.forEach(el => renderMatchCard(el, sf1home, sf1away, matches['sf1']));

      // 5) Right semis
      const rightSemiEls = document.querySelectorAll('#right-semis .match-card');
      const sf2home = safeTeamById(teams, matches['sf2'].home) || safeTeamById(teams, matches['qf3']?.home);
      const sf2away = safeTeamById(teams, matches['sf2'].away) || safeTeamById(teams, matches['qf4']?.home);
      rightSemiEls.forEach(el => renderMatchCard(el, sf2home, sf2away, matches['sf2']));

      // 6) Final
      const finalEl = document.querySelector('[data-match="final"]');
      const finalHome = safeTeamById(teams, matches['final'].home) || safeTeamById(teams, winnerOf(matches['sf1']));
      const finalAway = safeTeamById(teams, matches['final'].away) || safeTeamById(teams, winnerOf(matches['sf2']));
      renderMatchCard(finalEl, finalHome, finalAway, matches['final']);

      // 7) Render fixtures list from db.matches (display known matches). If db has nothing, render QFs computed
      const fixturesEl = document.getElementById('fixtures');
      fixturesEl.innerHTML = '';

      const allMatches = [];
      // prefer DB match list ordering if present
      if(Array.isArray(db.matches) && db.matches.length) {
        allMatches.push(...db.matches);
      } else {
        // fallback to our constructed matches in order: qf1..qf4, sf1, sf2, final
        ['qf1','qf2','qf3','qf4','sf1','sf2','final'].forEach(id=>{
          if(matches[id]) allMatches.push({...matches[id], id});
        });
      }

      allMatches.forEach(m=>{
        // only show if both teams known OR if there is a score or a date
        if(!m.home && !m.away && !m.date && (m.home_score==null && m.home_goals==null && m.away_score==null && m.away_goals==null)) return;
        const homeT = safeTeamById(teams, m.home);
        const awayT = safeTeamById(teams, m.away);
        const s = getScoreField(m);
        const leftHTML = `
          <div class="left">
            <img src="${homeT ? homeT.crest : 'https://placehold.co/36x36?text=?'}" alt="">
            <div style="min-width:120px">
              <div style="font-weight:600">${homeT ? homeT.name : (m.home||'TBD')}</div>
              <div class="muted">${m.round||''}</div>
            </div>
          </div>
        `;
        const rightHTML = `
          <div style="text-align:right">
            <div style="font-weight:600">${awayT ? awayT.name : (m.away||'TBD')}</div>
            <div class="muted">${m.date ? new Date(m.date).toLocaleString() : ''}</div>
          </div>
        `;
        const scoreHTML = (s.home==null || s.away==null) ? `<div class="muted">Upcoming</div>` : `<div style="font-weight:700">${s.home} - ${s.away}</div>`;
        fixturesEl.innerHTML += `<div class="fixture" role="listitem">${leftHTML}${scoreHTML}${rightHTML}</div>`;
      });

      // 8) (optional) If you'd like winners to automatically be written into DB you'd need a backend - client-side can't persist to your repo.
    } // init

    init();

  })();