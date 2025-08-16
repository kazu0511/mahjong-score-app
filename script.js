const API_URL = "https://script.google.com/macros/s/xxxxxxxxxxx/exec"; // ← GAS URLに置き換え

async function initTopPage() {
  const games = await fetchGames();
  renderHistoryTable(games);
  renderCharts(games);

  const form = document.getElementById("gameForm");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const date = document.getElementById("date").value;
    const players = Array.from(document.querySelectorAll(".player")).map((el,i)=>({
      name: el.value,
      score: Number(document.querySelectorAll(".score")[i].value)
    }));
    await addGame({date, players});
    location.reload();
  });
}

async function initPlayerPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerName = urlParams.get("name");
  document.getElementById("playerName").textContent = playerName;
  const games = await fetchGames();
  const playerGames = games.filter(g => g.players.some(p => p.name === playerName));

  renderPlayerHistory(playerName, playerGames);
  renderPlayerCharts(playerName, playerGames);
}

// --- API通信 ---
async function fetchGames(){
  const res = await fetch(API_URL);
  return await res.json();
}
async function addGame(game){
  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(game)
  });
}

// --- 履歴表示 ---
function renderHistoryTable(games){
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML="";
  games.forEach(g=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${g.date}</td>`+
      g.players.map(p=>`<td><a href="player.html?name=${encodeURIComponent(p.name)}">${p.name}</a></td><td>${p.score}</td>`).join("");
    tbody.appendChild(tr);
  });
}

// --- プレイヤー詳細履歴・統計 ---
function renderPlayerHistory(playerName, games){
  const tbody = document.getElementById("history");
  let total=0, top=0, last=0, rankSum=0;
  tbody.innerHTML="";
  games.forEach((g,i)=>{
    const ranks = calculateRanks(g.players);
    const p = g.players.find(p=>p.name===playerName);
    const tr = document.createElement("tr");
    tr.innerHTML=`<td>${g.date}</td><td>${p.score}</td><td>${ranks[playerName]}</td>`;
    tbody.appendChild(tr);
    total+=p.score; rankSum+=ranks[playerName];
    if(ranks[playerName]===1) top++;
    if(ranks[playerName]===4) last++;
  });
  const statsTbody = document.getElementById("stats");
  statsTbody.innerHTML=`<tr>
    <td>${total}</td>
    <td>${games.length}</td>
    <td>${top}</td>
    <td>${((top/games.length)*100).toFixed(1)}%</td>
    <td>${last}</td>
    <td>${((last/games.length)*100).toFixed(1)}%</td>
    <td>${(rankSum/games.length).toFixed(2)}</td>
  </tr>`;
}

// --- グラフ描画 ---
let scoreChart, rankChart;
function renderCharts(games){
  const playerNames = [...new Set(games.flatMap(g=>g.players.map(p=>p.name)))];
  const labels = games.map((g,i)=>`ゲーム${i+1}`);
  const datasets = playerNames.map(name=>({
    label:name,
    data: games.map(g=>{
      const p=g.players.find(p=>p.name===name);
      return p? p.score : null;
    }),
    borderColor:`hsl(${Math.random()*360},70%,50%)`,
    fill:false,
    tension:0.1
  }));
  if(scoreChart) scoreChart.destroy();
  scoreChart = new Chart(document.getElementById('scoreChart'),{type:'line', data:{labels,datasets}});
  
  // 順位分布
  const rankCounts={};
  playerNames.forEach(n=>rankCounts[n]=[0,0,0,0]);
  games.forEach(g=>{
    const ranks = calculateRanks(g.players);
    g.players.forEach(p=>{
      rankCounts[p.name][ranks[p.name]-1]++;
    });
  });
  const rankDatasets = playerNames.map(n=>({label:n,data:rankCounts[n],backgroundColor:`hsl(${Math.random()*360},70%,50%)`}));
  if(rankChart) rankChart.destroy();
  rankChart = new Chart(document.getElementById('rankChart'),{
    type:'bar',
    data:{labels:['1位','2位','3位','4位'], datasets:rankDatasets},
    options:{scales:{y:{beginAtZero:true}}}
  });
}
function renderPlayerCharts(playerName, games){
  const labels = games.map((g,i)=>`ゲーム${i+1}`);
  const scores = games.map(g=>g.players.find(p=>p.name===playerName).score);
  if(scoreChart) scoreChart.destroy();
  scoreChart = new Chart(document.getElementById('scoreChart'),{type:'line',data:{labels,datasets:[{label:playerName,data:scores,borderColor:'blue',fill:false}]}});

  const rankCounts=[0,0,0,0];
  games.forEach(g=>{
    const r=calculateRanks(g.players)[playerName];
    rankCounts[r-1]++;
  });
  if(rankChart) rankChart.destroy();
  rankChart = new Chart(document.getElementById('rankChart'),{type:'bar',data:{labels:['1位','2位','3位','4位'],datasets:[{label:playerName,data:rankCounts,backgroundColor:'orange'}]}});
}

// --- 順位計算 ---
function calculateRanks(players){
  const sorted = [...players].sort((a,b)=>b.score-a.score);
  const rankMap = {};
  let currentRank=1;
  sorted.forEach((p,i)=>{
    if(i>0 && p.score<sorted[i-1].score) currentRank=i+1;
    rankMap[p.name]=currentRank;
  });
  return rankMap;
}
