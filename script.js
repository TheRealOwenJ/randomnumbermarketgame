/* ---------- config ---------- */
const rarities = [
  {name:'common', chance:0.7, color:'#000', max:1000},
  {name:'rare', chance:0.2, color:'#0077ff', max:100000},
  {name:'epic', chance:0.08, color:'#a200ff', max:10000000},
  {name:'legendary', chance:0.02, color:'#ff9900', max:1000000000},
  {name: 'mythic', chance:0.005, color:'#ff0000', max:10000000000},
  {name: 'divine', chance:0.001, color:'#00ff00', max:100000000000},
  {name: 'celestial', chance: 0.0001, color: '#ffff00', max: 1000000000000},
  {name: 'admin', chance:0, color:'#206602', max:Infinity}
];
const maxinventory = 20;

/* ---------- state ---------- */
let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
let cash = localStorage.getItem('cash') ? parseInt(localStorage.getItem('cash')) : 100;
let lastlogin = localStorage.getItem('lastlogin') ? parseInt(localStorage.getItem('lastlogin')) : Date.now();
let totalearned = parseInt(localStorage.getItem('totalearned') || '0');
let boughtcount = parseInt(localStorage.getItem('boughtcount') || '0');
let achstate = JSON.parse(localStorage.getItem('achstate') || '{}');

/* ---------- achievements ---------- */
const achievements = [
  {id:'firstbuy', name:'first buy', desc:'buy your first number', cond: s => s.boughtcount >= 1},
  {id:'collector5', name:'collector 5', desc:'have 5 items in inventory', cond: s => s.inventorycount >= 5},
  {id:'collector10', name:'collector 10', desc:'have 10 items in inventory', cond: s => s.inventorycount >= 10},
  {id:'rich1000', name:'cash 1000', desc:'earn 1000 total cash', cond: s => s.totalearned >= 1000},
  {id:'rich1m', name:'millionaire', desc:'earn 1,000,000 total cash', cond: s => s.totalearned >= 1000000},
  {id:'idle50', name:'idle master', desc:'have 50 idle/sec total', cond: s => s.idlepersec >= 50}
];

/* ---------- ui refs ---------- */
const cashel = document.getElementById('cash');
const invcountel = document.getElementById('invcount');
const inventoryel = document.getElementById('inventory');
const conveyor = document.getElementById('conveyor');

/* ---------- utils ---------- */
function saveall(){
  localStorage.setItem('inventory', JSON.stringify(inventory));
  localStorage.setItem('cash', String(cash));
  localStorage.setItem('lastlogin', String(Date.now()));
  localStorage.setItem('totalearned', String(totalearned));
  localStorage.setItem('boughtcount', String(boughtcount));
  localStorage.setItem('achstate', JSON.stringify(achstate));
}
function randomrarity(){ let r=Math.random(), cum=0; for(let x of rarities){cum+=x.chance;if(r<=cum)return x;} return rarities[0]; }
function getRarityByNumber(n){ for(let i=rarities.length-1;i>=0;i--){ if(n<=rarities[i].max)return rarities[i]; } return rarities[rarities.length-1]; }
function calcprice(n){ return Math.max(Math.floor(n*2),10) }
function calcidle(n){ return Math.max(Math.floor(n*0.1),1) }
function calcsell(n,p){ return n<4?1:Math.floor(p/4) }
function recalcIdle(){ return inventory.reduce((s,i)=>s+(i.idle||0),0) }
function saveearned(amount){ totalearned+=amount; }

/* ---------- offline ---------- */
let secondsOffline = Math.floor((Date.now()-lastlogin)/1000);
let offlineIdleSum = inventory.reduce((s,i)=>s+(i.idle||0),0);
let offlineGain = secondsOffline*offlineIdleSum;
if(offlineGain>0){ cash+=offlineGain; totalearned+=offlineGain; }
localStorage.setItem('lastlogin',Date.now());

/* ---------- render ---------- */
function renderCash(){ cashel.textContent=cash; }
function renderInventory(){
  inventoryel.innerHTML='';
  inventory.forEach((it,idx)=>{
    let sell=calcsell(it.number,it.boughtprice);
    let d=document.createElement('div'); d.className='item';
    d.innerHTML=`<span style="color:${(rarities.find(r=>r.name===it.rarity)||{color:'#000'}).color}">${it.number} (${it.rarity}) - idle:${it.idle}</span>
      <button onclick="sellitem(${idx})">sell (${sell})</button>`;
    inventoryel.appendChild(d);
  });
  invcountel.textContent=inventory.length;
  checkachievements();
}
window.sellitem=function(i){
  if(i<0||i>=inventory.length)return;
  let it=inventory[i];
  let sellAmount=calcsell(it.number,it.boughtprice);
  cash+=sellAmount;
  saveearned(sellAmount);
  inventory.splice(i,1);
  renderInventory(); renderCash(); saveall();
}
function buynumber(number,rarity,price,idle){
  if(!rarity||!rarity.name)return false;
  if(inventory.length>=maxinventory){ alert('inventory full!'); return false; }
  if(cash<price){ alert('not enough cash!'); return false; }
  if(price<0||idle<0)return false;
  cash-=price; saveearned(price); boughtcount++;
  inventory.push({number,rarity:rarity.name,boughtprice:price,idle});
  renderInventory(); renderCash(); saveall();
  return true;
}
function checkachievements(){
  let state={boughtcount,inventorycount:inventory.length,totalearned,idlepersec:recalcIdle()};
  achievements.forEach(a=>{ if(!achstate[a.id]&&a.cond(state)){ achstate[a.id]=true; saveall(); } });
  renderach();
}
function renderach(){
  const list=document.getElementById('achlist'); list.innerHTML='';
  achievements.forEach(a=>{
    let b=document.createElement('div'); b.className='badge '+(achstate[a.id]?'':'locked'); b.textContent=a.name; b.title=a.desc; list.appendChild(b);
  });
}

/* ---------- conveyor ---------- */
function createnumbercard(opts){
  let rarity=opts?.rarity||randomrarity();
  if(!rarity)rarity=rarities[0];
  let n=opts?.number||Math.floor(Math.random()*Math.min(rarity.max,1000000000))+1;
  let p=opts?.price||calcprice(n);
  let id=opts?.idle||calcidle(n);

  const c=document.createElement('div'); c.className='numbercard'; c.style.color=rarity.color; c.textContent=n;
  const info=document.createElement('div'); info.className='infobox'; info.innerHTML=`price: ${p}<br>idle: ${id}`; c.appendChild(info);
  conveyor.appendChild(c);
  let pos=conveyor.offsetWidth || 400; c.style.left=pos+'px'; c.style.top='20px';
  c.addEventListener('click',()=>{
    if(buynumber(n,rarity,p,id)) c.remove();
  });
  function move(){ pos-=2; c.style.left=pos+'px'; if(pos+120<0){c.remove();return;} requestAnimationFrame(move); }
  requestAnimationFrame(move);
}
setInterval(()=>createnumbercard(),1200);

/* ---------- worker ---------- */
const workerCode=`let tickInterval=1000;let inventory=[];function recalcIdle(){return inventory.reduce((s,i)=>s+(i.idle||0),0);}self.onmessage=e=>{const m=e.data;if(m.type==='init')inventory=m.inventory||[];if(m.type==='update')inventory=m.inventory||[];};setInterval(()=>{self.postMessage({type:'tick',idle:recalcIdle()});},tickInterval);`;
const workerBlob=new Blob([workerCode],{type:'application/javascript'});
const worker=new Worker(URL.createObjectURL(workerBlob));
worker.postMessage({type:'init',inventory});
worker.onmessage=e=>{ const m=e.data; if(m.type==='tick'){ const gain=m.idle; if(gain>0){ cash+=gain; totalearned+=gain; renderCash(); saveall(); } } };
function updateWorkerInventory(){ worker.postMessage({type:'update',inventory}); }

/* ---------- buttons ---------- */
document.getElementById('resetbtn').addEventListener('click',()=>{
  if(!confirm('reset game?')) return;
  inventory=[]; cash=100; totalearned=0; boughtcount=0; achstate={}; saveall(); renderInventory(); renderCash(); renderach(); updateWorkerInventory();
});
document.getElementById('loginbtn').addEventListener('click',()=>{
  const p=document.getElementById('loginpanel'); p.style.display=p.style.display==='block'?'none':'block';
});
document.getElementById('loginsubmit').addEventListener('click',()=>{
  const u=document.getElementById('username').value.trim();
  const p=document.getElementById('password').value.trim();
  if(validateAdmin(u,p)){ openAdmin(u); document.getElementById('loginpanel').style.display='none'; } else { alert('invalid admin credentials'); }
});
function openAdmin(name){ document.getElementById('adminpanel').style.display='block'; document.getElementById('adminname').textContent=name; }
document.getElementById('spawnbtn').addEventListener('click',()=>{
  const n=parseInt(document.getElementById('spawnnumber').value);
  if(isNaN(n)||n<=0){ alert('enter a valid number'); return; }
  const rarity=rarities.find(r=>r.name==='admin');
  const p=calcprice(n);
  const id=calcidle(n);
  createnumbercard({rarity, number:n, price:p, idle:id});
  document.getElementById('spawnnumber').value='';
});
document.getElementById('admingivecash').addEventListener('click',()=>{
  const v=parseInt(document.getElementById('admincashinput').value); if(isNaN(v)||v===0)return; cash+=v; totalearned+=Math.max(0,v); renderCash(); saveall();
});
document.getElementById('clearallbtn').addEventListener('click',()=>{ inventory=[]; renderInventory(); saveall(); updateWorkerInventory(); });
document.getElementById('closeadmin').addEventListener('click',()=>{ document.getElementById('adminpanel').style.display='none'; });

/* sync worker */
const origPush=Array.prototype.push; Array.prototype.push=function(){ const r=origPush.apply(this,arguments); updateWorkerInventory(); return r; };
const origSplice=Array.prototype.splice; Array.prototype.splice=function(){ const r=origSplice.apply(this,arguments); updateWorkerInventory(); return r; };

/* ---------- init ---------- */
function init(){ renderCash(); renderInventory(); renderach(); updateWorkerInventory(); }
init();

window._game={inventory,get cash(){return cash},set cash(v){cash=v;renderCash();saveall();},buynumber,createnumbercard};