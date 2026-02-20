const $ = (id) => document.getElementById(id);

function n(x){ const v = Number(x); return Number.isFinite(v) ? v : 0; }
function s(x){ return String(x ?? "").trim(); }

function computeStandings(teams, matches){
  const map = new Map();
  teams.forEach(t => map.set(t.id, { team: t.name, o:0,g:0,b:0,m:0,a:0,y:0,av:0,p:0 }));

  for (const m of matches){
    if (m.status !== "played") continue;
    const home = map.get(m.homeId);
    const away = map.get(m.awayId);
    if (!home || !away) continue;

    const hs = n(m.homeScore), as = n(m.awayScore);

    home.o++; away.o++;
    home.a += hs; home.y += as;
    away.a += as; away.y += hs;

    if (hs > as){ home.g++; away.m++; home.p += 3; }
    else if (hs < as){ away.g++; home.m++; away.p += 3; }
    else { home.b++; away.b++; home.p += 1; away.p += 1; }
  }

  const arr = Array.from(map.values());
  arr.forEach(t => t.av = t.a - t.y);
  arr.sort((x,y)=>(y.p-x.p)||(y.av-x.av)||(y.a-x.a)||x.team.localeCompare(y.team,"tr"));
  return arr;
}

function renderStandings(targetId, rows, limit=null){
  const slice = limit ? rows.slice(0, limit) : rows;

  const html = `
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Takım</th>
        <th>O</th>
        <th>G</th>
        <th>B</th>
        <th>M</th>
        <th>A:Y</th>
        <th>AV</th>
        <th>P</th>
      </tr>
    </thead>
    <tbody>
      ${slice.map((r,i)=>`
        <tr>
          <td>${i+1}</td>
          <td>${r.team}</td>
          <td>${r.o}</td>
          <td>${r.g}</td>
          <td>${r.b}</td>
          <td>${r.m}</td>
          <td>${r.a}:${r.y}</td>
          <td>${r.av}</td>
          <td><span class="badge">${r.p}</span></td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  `;

  if ($(targetId)) $(targetId).innerHTML = html;
}

function renderBracket(targetId, bracket, teamById){
  if (!$(targetId)) return;

  if (!bracket || bracket.length === 0){
    $(targetId).innerHTML = `<div class="muted">Braket verisi yok.</div>`;
    return;
  }

  // stage sırası (istersen değiştir)
  const order = { R128:1, R64:2, R32:3, R16:4, QF:5, SF:6, F:7, FINAL:7, "3RD":8 };
  const stageKey = (sname) => order[String(sname||"").toUpperCase()] ?? 999;

  const grouped = bracket.reduce((acc, m) => {
    const st = String(m.stage || "ROUND").toUpperCase();
    (acc[st] ||= []).push(m);
    return acc;
  }, {});

  const stages = Object.keys(grouped).sort((a,b)=>stageKey(a)-stageKey(b) || a.localeCompare(b,"tr"));

  const html = stages.map(stage => {
    const list = grouped[stage].slice().sort((a,b)=>(Number(a.matchNo)-Number(b.matchNo)));

    const items = list.map(m => {
      const home = m.homeId ? (teamById[m.homeId]?.name || m.homeId) : "—";
      const away = m.awayId ? (teamById[m.awayId]?.name || m.awayId) : "—";
      const score = (m.status === "played") ? `${m.homeScore}-${m.awayScore}` : "-";
      const when = m.date ? String(m.date) : "";

      return `
        <div class="matchRow">
          <div>
            <div class="w">${stage}</div>
            <div class="w">Maç ${m.matchNo ?? ""}</div>
            ${when ? `<div class="w">${when}</div>` : ""}
          </div>
          <div class="t">${home} <span class="muted">vs</span> ${away}</div>
          <div class="s">${score}</div>
        </div>
      `;
    }).join("");

    return `
      <div style="margin-top:10px">
        <span class="pill">${stage}</span>
        <div class="list" style="margin-top:8px">${items}</div>
      </div>
    `;
  }).join("");

  $(targetId).innerHTML = html;
}

function renderFixtures(targetId, matches, teamById, limit=null){
  const list = matches.slice().sort((a,b)=>(a.round-b.round)||s(a.date).localeCompare(s(b.date)));
  const slice = limit ? list.slice(0, limit) : list;

  const html = `<div class="list">
    ${slice.map(m=>{
      const home = teamById[m.homeId]?.name || m.homeId;
      const away = teamById[m.awayId]?.name || m.awayId;
      const score = (m.status === "played") ? `${m.homeScore}-${m.awayScore}` : "-";
      return `
        <div class="matchRow">
          <div>
            <div class="w">Tur/Hafta ${m.round}</div>
            <div class="w">${s(m.date)}</div>
          </div>
          <div class="t">${home} <span class="muted">vs</span> ${away}</div>
          <div class="s">${score}</div>
        </div>`;
    }).join("")}
  </div>`;
  if ($(targetId)) $(targetId).innerHTML = html;
}

function renderScorers(targetId, scorers, teamById, limit=null){
  const rows = scorers.slice().sort((a,b)=>n(b.goals)-n(a.goals)||s(a.player).localeCompare(s(b.player),"tr"));
  const slice = limit ? rows.slice(0, limit) : rows;

  const html = `
  <table>
    <thead><tr><th>#</th><th>Oyuncu</th><th>Takım</th><th>Gol</th></tr></thead>
    <tbody>
      ${slice.map((r,i)=>`
        <tr>
          <td>${i+1}</td>
          <td>${r.player}</td>
          <td>${teamById[r.teamId]?.name || r.teamId}</td>
          <td><span class="badge">${n(r.goals)}</span></td>
        </tr>
      `).join("")}
    </tbody>
  </table>`;
  if ($(targetId)) $(targetId).innerHTML = html;
}

function setText(id, text){
  if ($(id)) $(id).textContent = text;
}

async function init(){
  try{
    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("data.json okunamadı");
    const data = await res.json();

    const teams = data.teams || [];
    const matches = data.matches || [];
    const scorers = data.scorers || [];
    const bracket = data.bracket || [];

    const teamById = Object.fromEntries(teams.map(t=>[t.id, t]));
    renderBracket("bracket", bracket, teamById);
    const standings = computeStandings(teams, matches);

    // meta
    setText("year", new Date().getFullYear());
    setText("modePill", `Mod: ${data.meta?.mode || "league"}`);
    setText("updatedPill", `Güncelleme: ${data.meta?.updatedAt || "-"}`);

    // index mini (varsa)
    renderStandings("standingsMini", standings, 6);
    renderFixtures("fixturesMini", matches, teamById, 6);
    renderScorers("scorersMini", scorers, teamById, 6);

    // full sayfalar (varsa)
    renderStandings("standingsFull", standings);
    renderFixtures("fixturesFull", matches, teamById);
    renderScorers("scorersFull", scorers, teamById);

    // hero next/last (varsa)
    const last = matches.filter(m=>m.status==="played").sort((a,b)=>(b.round-a.round)||s(b.date).localeCompare(s(a.date)))[0];
    const next = matches.filter(m=>m.status!=="played").sort((a,b)=>(a.round-b.round)||s(a.date).localeCompare(s(b.date)))[0];

    const fmt = (m)=> m ? `${teamById[m.homeId]?.name || m.homeId} vs ${teamById[m.awayId]?.name || m.awayId} • ${(m.status==="played")?`${m.homeScore}-${m.awayScore}`:"-"}` : "—";
    setText("lastResult", fmt(last));
    setText("nextMatch", fmt(next));

    // search.js için
    window.__DATA = { teams, matches, scorers, standings, teamById };

  } catch(e){
    console.error(e);
    ["standingsMini","fixturesMini","scorersMini","standingsFull","fixturesFull","scorersFull"]
      .forEach(id=>{ if($(id)) $(id).innerHTML = `<div class="muted">Hata: ${String(e)}</div>`; });
  }
}

init();
