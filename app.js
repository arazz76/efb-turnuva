document.getElementById("year").textContent = new Date().getFullYear();

// DEMO (Sheets bağlayınca bunu kaldırıp Sheets'ten çekeceğiz)
const demoStandings = [
  { team: "Takım A", o: 3, g: 3, b: 0, m: 0, a: 10, y: 2, av: 8, p: 9 },
  { team: "Takım B", o: 3, g: 2, b: 0, m: 1, a: 6,  y: 4, av: 2, p: 6 },
];

const demoFixtures = [
  { week: 1, home: "Takım A", away: "Takım B", score: "3-1" },
  { week: 2, home: "Takım B", away: "Takım A", score: "-" },
];

const demoScorers = [
  { player: "Arda", team: "Takım A", goals: 4 },
  { player: "Kenan", team: "Takım B", goals: 3 },
];

function renderStandings(rows){
  const html = `
  <table>
    <thead>
      <tr>
        <th>#</th><th>Takım</th><th>O</th><th>G</th><th>B</th><th>M</th>
        <th>A</th><th>Y</th><th>AV</th><th>P</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r,i)=>`
        <tr>
          <td>${i+1}</td><td>${r.team}</td><td>${r.o}</td><td>${r.g}</td><td>${r.b}</td><td>${r.m}</td>
          <td>${r.a}</td><td>${r.y}</td><td>${r.av}</td><td><span class="badge">${r.p}</span></td>
        </tr>`).join("")}
    </tbody>
  </table>`;
  document.getElementById("standings").innerHTML = html;
}

function renderFixtures(rows){
  const byWeek = rows.reduce((acc,m)=>{
    (acc[m.week] ||= []).push(m);
    return acc;
  }, {});
  const html = Object.keys(byWeek).sort((a,b)=>a-b).map(w=>{
    const list = byWeek[w].map(m=>`
      <tr><td>Hafta ${w}</td><td>${m.home} - ${m.away}</td><td>${m.score}</td></tr>
    `).join("");
    return `<table><tbody>${list}</tbody></table>`;
  }).join("");
  document.getElementById("fixtures").innerHTML = html || "<div class='muted'>Fikstür yok.</div>";
}

function renderScorers(rows){
  const html = `
  <table>
    <thead><tr><th>#</th><th>Oyuncu</th><th>Takım</th><th>Gol</th></tr></thead>
    <tbody>
      ${rows.sort((a,b)=>b.goals-a.goals).map((r,i)=>`
        <tr><td>${i+1}</td><td>${r.player}</td><td>${r.team}</td><td><span class="badge">${r.goals}</span></td></tr>
      `).join("")}
    </tbody>
  </table>`;
  document.getElementById("scorers").innerHTML = html;
}

renderStandings(demoStandings);
renderFixtures(demoFixtures);
renderScorers(demoScorers);
