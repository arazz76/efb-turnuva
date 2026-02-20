// ======== CONFIG ========
const CONFIG = {
  // Sheets bağlamak için doldur:
  SHEET_ID: "",

  // gid değerleri (Sheets sekmelerinin gid’si)
  GID: {
    Teams: "0",
    Matches: "0",
    Scorers: "0",
    Bracket: "0",
  },

  SEASON_LABEL: "2026",
};

const $ = (id) => document.getElementById(id);

// ======== DEMO DATA (SHEET_ID boşsa) ========
const demo = {
  teams: [
    { team_id:"A", team_name:"Takım A" },
    { team_id:"B", team_name:"Takım B" },
    { team_id:"C", team_name:"Takım C" },
    { team_id:"D", team_name:"Takım D" },
  ],
  matches: [
    { week:1, date:"2026-02-18", home_id:"A", away_id:"B", home_goals:3, away_goals:1, played:true },
    { week:1, date:"2026-02-18", home_id:"C", away_id:"D", home_goals:0, away_goals:0, played:true },
    { week:2, date:"2026-02-25", home_id:"B", away_id:"C", home_goals:0, away_goals:0, played:false },
    { week:2, date:"2026-02-25", home_id:"D", away_id:"A", home_goals:0, away_goals:0, played:false },
  ],
  scorers: [
    { player_name:"Arda", team_id:"A", goals:4 },
    { player_name:"Kenan", team_id:"B", goals:3 },
    { player_name:"Koray", team_id:"C", goals:2 },
  ],
  bracket: [
    { round:"QF", match_no:1, home_id:"A", away_id:"D", home_goals:2, away_goals:1, played:true },
    { round:"QF", match_no:2, home_id:"B", away_id:"C", home_goals:0, away_goals:1, played:true },
  ]
};

function n(x){ const v = Number(x); return Number.isFinite(v) ? v : 0; }
function s(x){ return String(x ?? "").trim(); }
function bool(x){ return String(x).toLowerCase() === "true" || x === true; }

function setMeta(modeText){
  const y = new Date().getFullYear();
  if ($("year")) $("year").textContent = y;
  if ($("modePill")) $("modePill").textContent = `Mod: ${modeText}`;
  const stamp = new Date().toLocaleString("tr-TR");
  ["updatedPill","updatedPill2","updatedPill3","updatedPill4","updatedPill5"].forEach(id=>{
    if ($(id)) $(id).textContent = `Güncelleme: ${stamp}`;
  });
}

// ======== GViz fetch (Sheets -> JSON) ========
function gvizUrl(sheetId, gid){
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
}
async function fetchGvizRows(sheetId, gid){
  const res = await fetch(gvizUrl(sheetId, gid));
  const text = await res.text();
  const jsonText = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const data = JSON.parse(jsonText);

  const cols = data.table.cols.map(c => (c.label || "").trim());
  const rows = data.table.rows.map(r => {
    const obj = {};
    r.c?.forEach((cell, i) => {
      const key = cols[i] || `col_${i}`;
      obj[key] = cell ? (cell.v ?? null) : null;
    });
    return obj;
  });
  return rows;
}

async function loadData(){
  if (!CONFIG.SHEET_ID){
    setMeta("Demo");
    return demo;
  }
  setMeta("Sheets");
  const [tRows, mRows, sRows, bRows] = await Promise.all([
    fetchGvizRows(CONFIG.SHEET_ID, CONFIG.GID.Teams),
    fetchGvizRows(CONFIG.SHEET_ID, CONFIG.GID.Matches),
    fetchGvizRows(CONFIG.SHEET_ID, CONFIG.GID.Scorers),
    fetchGvizRows(CONFIG.SHEET_ID, CONFIG.GID.Bracket),
  ]);

  // Beklenen kolon adları:
  // Teams: team_id, team_name
  const teams = tRows.map(r=>({ team_id:s(r.team_id), team_name:s(r.team_name) }))
    .filter(t=>t.team_id && t.team_name);

  // Matches: week, date, home_id, away_id, home_goals, away_goals, played
  const matches = mRows.map(r=>({
    week:n(r.week),
    date:s(r.date),
    home_id:s(r.home_id),
    away_id:s(r.away_id),
    home_goals:n(r.home_goals),
    away_goals:n(r.away_goals),
    played:bool(r.played),
  })).filter(m=>m.week && m.home_id && m.away_id);

  // Scorers: player_name, team_id, goals
  const scorers = sRows.map(r=>({
    player_name:s(r.player_name),
    team_id:s(r.team_id),
    goals:n(r.goals),
  })).filter(x=>x.player_name && x.team_id);

  // Bracket: round, match_no, home_id, away_id, home_goals, away_goals, played
  const bracket = bRows.map(r=>({
    round:s(r.round),
    match_no:n(r.match_no),
    home_id:s(r.home_id),
    away_id:s(r.away_id),
    home_goals:n(r.home_goals),
    away_goals:n(r.away_goals),
    played:bool(r.played),
  })).filter(x=>x.round && x.match_no);

  return { teams, matches, scorers, bracket };
}

// ======== Standings compute (lig) ========
function computeStandings(teams, matches){
  const map = new Map();
  teams.forEach(t=>{
    map.set(t.team_id, { id:t.team_id, team:t.team_name, o:0,g:0,b:0,m:0,a:0,y:0,av:0,p:0 });
  });

  for (const m of matches){
    if (!m.played) continue;
    const home = map.get(m.home_id);
    const away = map.get(m.away_id);
    if (!home || !away) continue;

    home.o++; away.o++;
    home.a += m.home_goals; home.y += m.away_goals;
    away.a += m.away_goals; away.y += m.home_goals;

    if (m.home_goals > m.away_goals){ home.g++; away.m++; home.p += 3; }
    else if (m.home_goals < m.away_goals){ away.g++; home.m++; away.p += 3; }
    else { home.b++; away.b++; home.p += 1; away.p += 1; }
  }

  const arr = Array.from(map.values());
  arr.forEach(t=> t.av = t.a - t.y);
  arr.sort((x,y)=>(y.p-x.p)||(y.av-x.av)||(y.a-x.a)||x.team.localeCompare(y.team,"tr"));
  return arr;
}

// ======== Render helpers ========
function renderStandingsTable(targetId, rows, limit=null){
  const slice = limit ? rows.slice(0, limit) : rows;
  const html = `
  <table>
    <thead><tr>
      <th>#</th><th>Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>AV</th><th>P</th>
    </tr></thead>
    <tbody>
      ${slice.map((r,i)=>`
        <tr>
          <td>${i+1}</td>
          <td>${r.team}</td>
          <td>${r.o}</td><td>${r.g}</td><td>${r.b}</td><td>${r.m}</td>
          <td>${r.av}</td>
          <td><span class="badge">${r.p}</span></td>
        </tr>
      `).join("")}
    </tbody>
  </table>`;
  if ($(targetId)) $(targetId).innerHTML = html;
}

function renderFixturesList(targetId, fixtures, limit=null){
  const slice = limit ? fixtures.slice(0, limit) : fixtures;
  const html = `<div class="list">
    ${slice.map(m=>`
      <div class="matchRow">
        <div>
          <div class="w">Hafta ${m.week}</div>
          <div class="w">${m.date || ""}</div>
        </div>
        <div class="t">${m.home} <span class="muted">vs</span> ${m.away}</div>
        <div class="s">${m.played ? `${m.home_goals}-${m.away_goals}` : "-"}</div>
      </div>
    `).join("")}
  </div>`;
  if ($(targetId)) $(targetId).innerHTML = html;
}

function renderScorersTable(targetId, scorers, teamNameById, limit=null){
  const rows = scorers
    .map(sx=>({ player:sx.player_name, team: teamNameById[sx.team_id] || sx.team_id, goals:sx.goals }))
    .sort((a,b)=>b.goals-a.goals || a.player.localeCompare(b.player,"tr"));

  const slice = limit ? rows.slice(0, limit) : rows;

  const html = `
  <table>
    <thead><tr><th>#</th><th>Oyuncu</th><th>Takım</th><th>Gol</th></tr></thead>
    <tbody>
      ${slice.map((r,i)=>`
        <tr>
          <td>${i+1}</td><td>${r.player}</td><td>${r.team}</td><td><span class="badge">${r.goals}</span></td>
        </tr>
      `).join("")}
    </tbody>
  </table>`;
  if ($(targetId)) $(targetId).innerHTML = html;
}

function getNextAndLast(matches, teamNameById){
  const played = matches.filter(m=>m.played).sort((a,b)=> (b.week-a.week) || (b.date||"").localeCompare(a.date||""));
  const upcoming = matches.filter(m=>!m.played).sort((a,b)=> (a.week-b.week) || (a.date||"").localeCompare(b.date||""));
  const last = played[0];
  const next = upcoming[0];

  const fmt = (m)=> m ? `${teamNameById[m.home_id]||m.home_id} vs ${teamNameById[m.away_id]||m.away_id} • ${m.played?`${m.home_goals}-${m.away_goals}`:"-"}`
                      : "—";
  return { lastText: fmt(last), nextText: fmt(next) };
}

function renderBracket(targetId, bracket, teamNameById){
  if (!$(targetId)) return;
  if (!bracket?.length){
    $(targetId).innerHTML = `<div class="muted">Braket yok.</div>`;
    return;
  }
  const grouped = bracket.reduce((acc,m)=>{
    (acc[m.round] ||= []).push(m);
    return acc;
  }, {});
  const rounds = Object.keys(grouped);
  const html = rounds.map(r=>{
    const items = grouped[r].sort((a,b)=>a.match_no-b.match_no).map(m=>{
      const h = teamNameById[m.home_id] || m.home_id;
      const a = teamNameById[m.away_id] || m.away_id;
      const sc = m.played ? `${m.home_goals}-${m.away_goals}` : "-";
      return `<div class="matchRow"><div><div class="w">${r}</div><div class="w">Maç ${m.match_no}</div></div><div class="t">${h} <span class="muted">vs</span> ${a}</div><div class="s">${sc}</div></div>`;
    }).join("");
    return `<div style="margin-top:10px"><div class="pill">${r}</div><div class="list" style="margin-top:8px">${items}</div></div>`;
  }).join("");
  $(targetId).innerHTML = html;
}

// ======== Boot ========
(async function init(){
  try{
    const data = await loadData();
    const teamNameById = Object.fromEntries(data.teams.map(t=>[t.team_id, t.team_name]));

    const standings = computeStandings(data.teams, data.matches);
    const fixturesSorted = data.matches.slice().sort((a,b)=>(a.week-b.week)|| (a.date||"").localeCompare(b.date||""));

    // index mini
    renderStandingsTable("standingsMini", standings, 6);
    renderFixturesList("fixturesMini", fixturesSorted, 6);
    renderScorersTable("scorersMini", data.scorers, teamNameById, 6);

    // full pages
    renderStandingsTable("standingsFull", standings);
    renderFixturesList("fixturesFull", fixturesSorted);
    renderScorersTable("scorersFull", data.scorers, teamNameById);

    // hero next/last
    const { lastText, nextText } = getNextAndLast(data.matches, teamNameById);
    if ($("nextMatch")) $("nextMatch").textContent = nextText;
    if ($("lastResult")) $("lastResult").textContent = lastText;

    // bracket
    renderBracket("bracket", data.bracket, teamNameById);

    // expose for search.js
    window.__SAH = {
      teams: data.teams,
      matches: data.matches,
      scorers: data.scorers,
      standings,
      teamNameById
    };

  }catch(e){
    console.error(e);
    ["standingsMini","fixturesMini","scorersMini","standingsFull","fixturesFull","scorersFull","bracket","nextMatch","lastResult"]
      .forEach(id=>{ if($(id)) $(id).innerHTML = `<div class="muted">Yüklenemedi: ${String(e)}</div>`; });
    setMeta("Hata");
  }
})();
