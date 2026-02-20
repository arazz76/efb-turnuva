const modal = document.getElementById("searchModal");
const openBtn = document.getElementById("openSearch");
const input = document.getElementById("searchInput");
const results = document.getElementById("searchResults");

function openSearch(){
  if(!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  setTimeout(()=>input?.focus(), 0);
  renderResults("");
}
function closeSearch(){
  if(!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
  if(input) input.value = "";
}

function norm(x){ return String(x||"").toLowerCase().trim(); }

function buildIndex(){
  const SAH = window.__SAH;
  if(!SAH) return [];
  const idx = [];

  SAH.teams.forEach(t=>{
    idx.push({
      type:"Takım",
      title: t.team_name,
      meta: `id: ${t.team_id}`,
      href: "./puan.html"
    });
  });

  SAH.scorers.forEach(s=>{
    idx.push({
      type:"Oyuncu",
      title: s.player_name,
      meta: `Takım: ${SAH.teamNameById[s.team_id] || s.team_id} • Gol: ${s.goals}`,
      href: "./gol.html"
    });
  });

  SAH.matches.forEach(m=>{
    const home = SAH.teamNameById[m.home_id] || m.home_id;
    const away = SAH.teamNameById[m.away_id] || m.away_id;
    idx.push({
      type:"Maç",
      title: `${home} vs ${away}`,
      meta: `Hafta ${m.week} • ${m.date || ""} • ${m.played ? (m.home_goals+"-"+m.away_goals) : "Oynanmadı"}`,
      href: "./fikstur.html"
    });
  });

  return idx;
}

let INDEX = [];
function renderResults(q){
  if(!results) return;
  if(!INDEX.length) INDEX = buildIndex();
  const query = norm(q);

  const items = (!query ? INDEX.slice(0,10) : INDEX.filter(it=>{
    const blob = norm(it.type+" "+it.title+" "+it.meta);
    return blob.includes(query);
  }).slice(0,12));

  results.innerHTML = items.length
    ? items.map((it,i)=>`
      <div class="result" data-href="${it.href}" data-i="${i}">
        <div class="title">${it.title}</div>
        <div class="meta">${it.type} • ${it.meta}</div>
      </div>
    `).join("")
    : `<div class="muted">Sonuç yok.</div>`;
}

openBtn?.addEventListener("click", openSearch);
modal?.addEventListener("click", (e)=>{ if(e.target === modal) closeSearch(); });

document.addEventListener("keydown", (e)=>{
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const cmdk = (isMac && e.metaKey && e.key.toLowerCase() === "k") || (!isMac && e.ctrlKey && e.key.toLowerCase()==="k");
  if(cmdk){ e.preventDefault(); openSearch(); }
  if(e.key === "Escape") closeSearch();
});

input?.addEventListener("input", ()=> renderResults(input.value));
results?.addEventListener("click", (e)=>{
  const card = e.target.closest(".result");
  if(!card) return;
  const href = card.getAttribute("data-href");
  if(href) window.location.href = href;
});
