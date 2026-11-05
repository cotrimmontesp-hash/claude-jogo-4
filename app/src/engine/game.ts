/* Motor do jogo "Ilha do Coral" em TypeScript.
   O mesmo motor roda no celular (React Native + Skia) e na web (React Native Web + canvas).
   Ele não conhece telas nem DOM: desenha num contexto 2D que a plataforma entrega,
   recebe toques/teclas pela plataforma e guarda o estado das telas em `ui`,
   que as telas em React Native leem. */
import { CH, PALS, TH, LV, LOBBY, WAVEL, NAMES, SW_BODY, SW_HAIR } from './data';
import { INK, lt, vg, rg, ink, circ, ell, rrp, rr, shadow, txt, eye, gearShape, star, weapon, drawHero, drawBento, drawBot, setFontFn, paintMenuScene, paintMenuBg, paintSkin, paintPortrait, paintHeroCard, paintWeapon, WPAL, ALT } from './draw';
import { Peer } from '../net/peer';
import type { Platform, Ctx2D, OffCanvas, Insets, PtrEv } from './types';

export type Game = ReturnType<typeof createGame>;

export function createGame(pf: Platform) {
const T=48;
const isTouch=pf.isTouch;
const QS=pf.query||'';
let W=800,H=450,DPR=1,SC=1,ROT=false,INS:Insets={t:0,r:0,b:0,l:0},VIG:any=null;
let ctx:any=null;
const F=(size:number,kind?:'display'|'body')=>pf.font(size,kind||'display');
setFontFn(F);
/* personagem com a arma equipada (wi) e, se escolhida, a roupa especial */
function dressed(c:any,id:string,alt:boolean,keepHair:boolean){
  const L=charLvl(id),e=save.wpn&&save.wpn[id];
  const o:any={wi:clamp(e==null?0:e,0,L.u-1)};
  if(alt&&ALT[id]){const A=ALT[id];o.sk='alt';o.body=A.body;o.belt=A.belt;if(A.hair&&!keepHair)o.hair=A.hair;o.full=CH.find(h=>h.id===id).name+' '+A.name;}
  return Object.assign({},c,o);
}

/* ---------- estado das telas (lido pelas telas em React Native) ---------- */
type Shown={[k:string]:boolean};
const ui:any={
  v:0,
  show:{menu:false,lobby:false,mapUI:false,dlg:false,res:false,pause:false,friends:false,heroes:false,skin:false,waitUI:false,arsenal:false,pauseBtn:false,inviteCard:false} as Shown,
  toast:null as null|{s:string,id:number},
  dlg:{name:'',text:'',title:null as null|string[]},
  res:{title:'',sub:'',l1:'',l2:'',lose:false},
  pause:{tip:'',quit:'Sair'},
  invite:{txt:''},
  lobbyIn:{name:'',code:''},
  fidIn:'',addBusy:false,rmAsk:{} as {[k:string]:boolean},invited:{} as {[k:string]:boolean},
  wInfo:''
};
const subs=new Set<()=>void>();
let emitQ=false;
function emit(){if(emitQ)return;emitQ=true;Promise.resolve().then(()=>{emitQ=false;ui.v++;subs.forEach(f=>{try{f();}catch(e){}});});}
function show(id:string,v=true){if(ui.show[id]!==v){ui.show[id]=v;emit();}}
function setLayout(w:number,h:number,dpr:number,ins:Insets,rot:boolean){
  W=w;H=h;DPR=dpr;INS=ins;ROT=rot;
  SC=Math.max(.62,Math.min(1.6,Math.min(W/(16*T),H/(8.2*T))));
  VIG=null;emit();
}

/* ---------- salvar ---------- */
let save:any={unl:1,gears:0,done:[],name:'',ch:0,xp:0,kills:0,wins:0,skin:{},cxp:{},wpn:{},bestWave:0};
try{const s=JSON.parse(pf.storage.load()||'null');if(s&&typeof s==='object')save=Object.assign(save,s);}catch(e){}
function persist(){try{pf.storage.save(JSON.stringify(save));}catch(e){}}

function withSkin(base?:any,b?:any,h?:any){return (b||h)?Object.assign({},base,{body:b||base.body,hair:h||base.hair}):base;}
const HEX=/^#[0-9a-f]{6}$/i;
function myCh(){const base=CH[clamp(save.ch|0,0,CH.length-1)];const sk=save.skin&&save.skin[base.id];const c=sk?withSkin(base,HEX.test(sk.b)?sk.b:null,HEX.test(sk.h)?sk.h:null):base;return dressed(c,base.id,save.outfit&&save.outfit[base.id]==='alt',sk&&HEX.test(sk.h));}
const WV={on:false,wave:0,state:'break',t:0,queue:[],spawnT:0,flash:0};
function curL(){return cur===-2?WAVEL:cur===-1?LOBBY:LV[cur];}
/* ---------- som: o motor só escolhe o som; a plataforma toca ---------- */
const AUL:{[k:string]:number}={};
function can(k:string,ms:number){const n=pf.now();if(AUL[k]&&n-AUL[k]<ms)return false;AUL[k]=n;return true;}
const play=(n:string,v?:number)=>{if(save.sfx===false)return;try{pf.audio.play(n,v==null?1:v);}catch(e){}};
const SFX:any={
  click(){play('click');},
  start(){play('start');},
  rivet(v:number){if(!can('sh',45))return;play('rivet',v);},
  snipe(v:number){if(!can('sn',60))return;play('snipe',v);},
  lob(v:number){if(!can('lb',60))return;play('lob',v);},
  rocket(v:number){if(!can('rk',60))return;play('rocket',v);},
  superFire(v:number){play('superFire',v);},
  reload(){if(!can('rl',90))return;play('reload');},
  dry(){if(!can('dry',160))return;play('dry');},
  ready(){play('ready');},
  hit(){if(!can('hit',50))return;play('hit');},
  boom(big?:boolean){play(big?'boom_big':'boom');},
  splash(){if(!can('sp',50))return;play('splash');},
  hurt(){if(!can('hurt',130))return;play('hurt');},
  down(){play('down');},
  coin(){if(!can('coin',70))return;play('coin');},
  eshot(){if(!can('es',80))return;play('eshot');},
  gate(){play('gate');},
  horn(boss?:boolean){play(boss?'horn_boss':'horn');},
  waveDone(){play('waveDone');},
  win(){play('win');},
  lose(){play('lose');},
  unlock(){play('unlock');},
  beep(hi?:boolean){play(hi?'beep_hi':'beep');},
  blip(){if(!can('blip',70))return;play('blip');}
};
function shotSound(atk:string,k:number,v:number){if(k===1){SFX.superFire(v);return;}(SFX[atk]||SFX.rivet)(v);}
/* música de fundo em loop: o motor diz qual música; a plataforma toca */
function musTick(){
  const mode=save.mus===false?null:(state==='play'||state==='story'||state==='lost')&&cur!==-1?(enemies.some(e=>e.type==='X')?'boss':'play'):'menu';
  try{pf.audio.music(mode);}catch(e){}
}
function updSoundBtns(){try{pf.audio.setVolumes(save.sfx!==false,save.mus!==false);}catch(e){}emit();}
function toggleSfx(){save.sfx=save.sfx===false;persist();updSoundBtns();}
function toggleMus(){save.mus=save.mus===false;persist();updSoundBtns();}
function btnSound(kind?:string){if(kind==='start')SFX.start();else SFX.click();}


/* ---------- estado ---------- */
let state='menu',paused=false,cur=0,grid=[],GW=0,GH=0,theme=TH.beach,groundCv=null,wallCv=null;
let P=null,enemies=[],bullets=[],parts=[],texts=[],drops=[],rings=[];
let cam={x:0,y:0},shake=0,clock=0,winT=0,loseT=0,banner=0,gearsRun=0,tutT=0,eid=1,runId=0,phase='map',diffN=1,dmgMul=1,lastInput=isTouch?'touch':'mouse',superFlash=0,allDeadT=0;

function tileAt(x?:any,y?:any){const tx=Math.floor(x/T),ty=Math.floor(y/T);if(ty<0||ty>=GH||tx<0||tx>=GW)return '#';const c=grid[ty][tx];return c==='G'?'#':c;}
function solidT(tx?:any,ty?:any){if(ty<0||ty>=GH||tx<0||tx>=GW)return true;const c=grid[ty][tx];return c==='#'||c==='W'||c==='G';}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const pick=a=>a[Math.floor(Math.random()*a.length)];

const ED={d:{hp:4000,r:18,spd:0,dmg:0},g:{hp:1600,r:17,spd:118,dmg:520},s:{hp:1300,r:16,spd:96,dmg:430},t:{hp:3800,r:25,spd:62,dmg:330},X:{hp:22000,r:36,spd:72,dmg:460}};
function mkEnemy(type?:any,x?:any,y?:any,id?:any){
  const d=ED[type];
  return <any>{id:id||eid++,type,x,y,tx:x,ty:y,hp:d.hp,max:d.hp,r:d.r,spd:d.spd,dmg:d.dmg,cd:1+Math.random(),fl:0,alert:false,seen:false,face:Math.PI,mv:false,wob:Math.random()*9,say:null,
    st:'idle',stT:1.4,spin:0,hitCD:0,lunge:0,wind:0,avT:0,strafe:Math.random()<.5?1:-1,strT:2,cyc:0,dashA:0,dashHit:false,half:false};
}
function spawnEnemy(type?:any,x?:any,y?:any){const e=mkEnemy(type,x,y);const m=type==='X'?1+.75*(diffN-1):1+.6*(diffN-1);e.hp=e.max=Math.round(ED[type].hp*m);enemies.push(e);return e;}

/* ---------- mundo contínuo: as 5 áreas emendadas ---------- */
const AW=26,AH=13,GATE_ROWS=[5,6,7];
const WORLD={on:false,prog:0,start:0,areas:[],intro:{},capQ:[],capT:0,wallCvs:[]};
function areaOf(x?:any){return clamp(Math.floor(x/(AW*T)),0,LV.length-1);}
function themeAtTx(tx?:any){return WORLD.on?TH[LV[clamp(Math.floor(tx/AW),0,LV.length-1)].theme]:theme;}
function worldRows(){
  const maps=LV.map(L=>{let m=L.map.slice();while(m.length<AH){m=m.length%2?m.concat(['#'.repeat(AW)]):['#'.repeat(AW)].concat(m);}return m.map(r=>(r+'#'.repeat(AW)).slice(0,AW).split(''));});
  for(let a=0;a<maps.length-1;a++)for(const y of GATE_ROWS){maps[a][y][AW-2]='.';maps[a][y][AW-1]='G';maps[a+1][y][0]='G';maps[a+1][y][1]='.';}
  const rows=[];for(let y=0;y<AH;y++)rows.push(maps.map(m=>m[y].join('')).join(''));
  return rows;
}
function loadWorld(start?:any,n?:any,asClient?:any){
  WORLD.on=true;WV.on=false;WORLD.start=start;WORLD.prog=start;WORLD.intro={};WORLD.intro[start]=1;WORLD.capQ=[];WORLD.capT=0;
  cur=start;theme=TH[LV[start].theme];diffN=n||1;dmgMul=1+.14*(diffN-1);
  const rows=worldRows();GH=rows.length;GW=rows[0].length;
  grid=[];enemies=[];bullets=[];parts=[];texts=[];drops=[];rings=[];winT=0;loseT=0;shake=0;gearsRun=0;allDeadT=0;eid=1;
  WORLD.areas=LV.map((L,a)=>({x0:a*AW*T,spawn:[a*AW*T+T*2.5,T*6.5],free:[]}));
  for(let y=0;y<GH;y++){const row=[];for(let x=0;x<GW;x++){let c=rows[y][x];const a=Math.floor(x/AW);
    const cx=x*T+T/2,cy=y*T+T/2;
    if(c==='P'){WORLD.areas[a].spawn=[cx,cy];c='.';}
    else if('gstX'.includes(c)){if(!asClient&&a>=start){const e=spawnEnemy(c,cx,cy);e.area=a;}c='.';}
    else if(c==='G'&&(x%AW===AW-1?a:a-1)<start)c='.';
    if(c==='.')WORLD.areas[a].free.push([cx,cy]);
    row.push(c);}grid.push(row);}
  if(!asClient&&diffN>1)for(let a=start;a<LV.length;a++){if(LV[a].boss)continue;
    const base=enemies.filter(e=>e.area===a).length,extra=Math.round(base*(diffN-1)*.3),sp=WORLD.areas[a].spawn;
    const far=WORLD.areas[a].free.filter(p=>Math.hypot(p[0]-sp[0],p[1]-sp[1])>T*8);
    for(let k=0;k<extra&&far.length;k++){const p=far.splice(Math.floor(Math.random()*far.length),1)[0];const e=spawnEnemy(pick(['g','g','s']),p[0],p[1]);e.area=a;}}
  const sp=WORLD.areas[start].spawn;
  const idx=NET.myIndex||0;const off=[[0,0],[0,-44],[0,44],[-44,-22],[-44,22]][idx%5];
  const hc=myCh();
  P={x:sp[0]+off[0],y:sp[1]+off[1],r:16,hp:hc.hp,max:hc.hp,ammo:3,sup:0,aim:0,lastHit:-9,lastShot:-9,fl:0,mv:false,dead:false,inBush:false,noAmmo:0,respT:0,spawn:[sp[0],sp[1]]};
  collide(P);
  cam.x=P.x;cam.y=P.y-20;tutT=start===0?9:0;
  buildGround();
}
function gateTiles(i?:any){const L=[];for(const y of GATE_ROWS){L.push([i*AW+AW-1,y],[(i+1)*AW,y]);}return L;}
function openGate(i?:any){
  SFX.gate();
  for(const [tx,ty] of gateTiles(i)){if(grid[ty]&&grid[ty][tx]==='G'){grid[ty][tx]='.';burst(tx*T+T/2,ty*T+T/2-10,10,['#ffe14d','#fff','#7ee6ff'],220,5);}}
  ring((i+1)*AW*T,T*6.5,'#ffe14d',140);shake=Math.max(shake,6);
}
function setProg(pg?:any){
  pg=clamp(pg,0,LV.length-1);
  while(WORLD.prog<pg){openGate(WORLD.prog);WORLD.prog++;}
  cur=WORLD.prog;
  const sp=WORLD.areas[cur].spawn;P.spawn=[sp[0],sp[1]];
}
function areaEnemies(a?:any){let n=0;for(const e of enemies)if(areaOf(e.x)===a)n++;return n;}
function storyLines(lines?:any,after?:any){
  if(NET.game){WORLD.capQ=WORLD.capQ.concat(lines.map(l=>[l[0],l[1]==='TUTORIAL'?tutText():l[1]]));WORLD.capT=0;after&&after();return;}
  state='story';touch.move=touch.fire=touch.sup=null;show('pauseBtn',false);
  showDialog(lines,()=>{state='play';show('pauseBtn',true);after&&after();});
}
function heroLine(t?:any){const hn=myCh().name;return hn==='Tita'?t:t.replace(/\bTita\b/g,hn);}
function onAreaClear(){
  const a=WORLD.prog;
  if(a>=LV.length-1){hostWin();return;}
  recordArea(a);setProg(a+1);
  storyLines(LV[a].outro,()=>{toast('O portão abriu! Siga para a direita.');});
}
function recordArea(a?:any){addCharXP(40);save.gears+=gearsRun;gearsRun=0;save.wins=(save.wins|0)+1;addXP(a>=4?300:100);if(!save.done.includes(a))save.done.push(a);if(NET.isHost)save.unl=Math.max(save.unl,Math.min(LV.length,a+2));persist();}
function checkAreaEntry(){
  if(!WORLD.on||!P||P.dead)return;
  const a=areaOf(P.x);
  if(a>WORLD.start&&a<=WORLD.prog&&!WORLD.intro[a]&&P.x>WORLD.areas[a].x0+T*2.5){WORLD.intro[a]=1;banner=2.4;
    storyLines(LV[a].intro.map(l=>[l[0],heroLine(l[1])]));}
}
function loadLevel(i?:any,n?:any,asClient?:any){
  WORLD.on=false;
  cur=i;const L=i===-2?WAVEL:i<0?LOBBY:LV[i];theme=TH[L.theme];diffN=n||1;WV.on=false;dmgMul=1+.14*(diffN-1);
  GH=L.map.length;GW=Math.max(...L.map.map(r=>r.length));
  grid=[];enemies=[];bullets=[];parts=[];texts=[];drops=[];rings=[];winT=0;loseT=0;shake=0;gearsRun=0;allDeadT=0;eid=1;
  let px=T*2,py=T*2;const free=[];
  for(let y=0;y<GH;y++){const row=[];for(let x=0;x<GW;x++){let c=L.map[y][x]||'#';
    const cx=x*T+T/2,cy=y*T+T/2;
    if(c==='P'){px=cx;py=cy;c='.';}
    else if('gstXd'.includes(c)){if(!asClient||c==='d')spawnEnemy(c,cx,cy);c='.';}
    if(c==='.')free.push([cx,cy]);
    row.push(c);}grid.push(row);}
  if(!asClient&&diffN>1&&!L.boss&&!L.lobby&&!L.waves){
    const extra=Math.round(enemies.length*(diffN-1)*.3);
    const far=free.filter(p=>Math.hypot(p[0]-px,p[1]-py)>T*8);
    for(let k=0;k<extra&&far.length;k++){const p=far.splice(Math.floor(Math.random()*far.length),1)[0];spawnEnemy(pick(['g','g','s']),p[0],p[1]);}
  }
  const idx=NET.myIndex||0;const off=[[0,0],[0,-44],[0,44],[-44,-22],[-44,22]][idx%5];
  const hc=myCh();
  P={x:px+off[0],y:py+off[1],r:16,hp:hc.hp,max:hc.hp,ammo:3,sup:0,aim:0,lastHit:-9,lastShot:-9,fl:0,mv:false,dead:false,inBush:false,noAmmo:0,respT:0,spawn:[px,py]};
  collide(P);
  cam.x=P.x;cam.y=P.y-20;tutT=i===0||(i<0&&!NET.waitTut)?9:0;if(i<0)NET.waitTut=1;
  buildGround();
}

/* ---------- pré-render do chão e paredes ---------- */
function hash(x?:any,y?:any){let h=(x*374761393+y*668265263)>>>0;h=Math.imul(h^(h>>>13),1274126177)>>>0;return (h^(h>>>16))>>>0;}
function buildGround(){
  groundCv=pf.createCanvas(GW*T,GH*T);
  const g=groundCv.getContext('2d');
  const theme0=theme;
  for(let ty=0;ty<GH;ty++)for(let tx=0;tx<GW;tx++){
    const X=tx*T,Y=ty*T,c=grid[ty][tx];theme=themeAtTx(tx);
    if(c==='W'){g.fillStyle=lt(theme.water,-.05);g.fillRect(X,Y,T,T);continue;}
    g.fillStyle=((tx+ty)&1)?theme.g1:theme.g2;g.fillRect(X,Y,T,T);
    const h=hash(tx,ty);
    g.fillStyle='rgba(255,255,255,'+((h%7)*.008)+')';g.fillRect(X,Y,T,T);
    if(c==='.'&&h%100<22)drawDeco(g,X+10+hash(ty,tx)%28,Y+10+hash(tx+7,ty)%28,h);
  }
  for(let ty=0;ty<GH;ty++)for(let tx=0;tx<GW;tx++){
    const c=grid[ty][tx];if(c==='#'||c==='W')continue;
    const X=tx*T,Y=ty*T;
    if(ty>0&&grid[ty-1][tx]==='#'){const gr=g.createLinearGradient(0,Y,0,Y+18);gr.addColorStop(0,'rgba(30,15,60,.32)');gr.addColorStop(1,'rgba(30,15,60,0)');g.fillStyle=gr;g.fillRect(X,Y,T,18);}
    if(tx>0&&grid[ty][tx-1]==='#'){const gr=g.createLinearGradient(X,0,X+10,0);gr.addColorStop(0,'rgba(30,15,60,.18)');gr.addColorStop(1,'rgba(30,15,60,0)');g.fillStyle=gr;g.fillRect(X,Y,10,T);}
    if(tx<GW-1&&grid[ty][tx+1]==='#'){const gr=g.createLinearGradient(X+T,0,X+T-10,0);gr.addColorStop(0,'rgba(30,15,60,.18)');gr.addColorStop(1,'rgba(30,15,60,0)');g.fillStyle=gr;g.fillRect(X+T-10,Y,10,T);}
  }
  for(let ty=0;ty<GH;ty++)for(let tx=0;tx<GW;tx++){
    if(grid[ty][tx]!=='W')continue;const X=tx*T,Y=ty*T;theme=themeAtTx(tx);
    const up=ty>0&&grid[ty-1][tx]!=='W',dn=ty<GH-1&&grid[ty+1][tx]!=='W',lf=tx>0&&grid[ty][tx-1]!=='W',rt=tx<GW-1&&grid[ty][tx+1]!=='W';
    if(up){g.fillStyle=lt(theme.g1,-.15);g.fillRect(X,Y,T,8);g.fillStyle='rgba(20,40,90,.28)';g.fillRect(X,Y+8,T,8);}
    if(dn){g.fillStyle='rgba(255,255,255,.5)';g.fillRect(X,Y+T-4,T,4);}
    if(lf){g.fillStyle='rgba(255,255,255,.4)';g.fillRect(X,Y,3,T);}
    if(rt){g.fillStyle='rgba(255,255,255,.4)';g.fillRect(X+T-3,Y,3,T);}
  }
  if(cur===-1){g.save();g.translate(GW*T/2,T*1.55);g.rotate(-.03);ink(g,4);rr(g,-170,-30,340,60,16,'#ff5d73');g.font=F(34);g.textAlign='center';g.textBaseline='middle';g.lineWidth=7;g.strokeStyle=INK;g.strokeText('SALA DE ESPERA',0,2);g.fillStyle='#fff';g.fillText('SALA DE ESPERA',0,2);g.restore();}
  theme=theme0;
  if(WORLD.on){WORLD.wallCvs=LV.map(L=>{const t0=theme;theme=TH[L.theme];const c=makeWall();theme=t0;return c;});wallCv=WORLD.wallCvs[0];
    // trilha pintada nos corredores entre as áreas
    for(let i=0;i<LV.length-1;i++){const x=(i+1)*AW*T;g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x-T*2,T*5,T*4,T*3);}}
  else{wallCv=makeWall();WORLD.wallCvs=[wallCv];}
}
function drawDeco(g?:any,x?:any,y?:any,h?:any){
  const d=theme.deco;
  if(d==='shell'){if(h%3===0){g.fillStyle='#ffb3a7';g.beginPath();g.arc(x,y,5,Math.PI,0);g.fill();g.strokeStyle='rgba(120,60,40,.45)';g.lineWidth=1.5;g.stroke();}
    else{g.fillStyle='rgba(160,110,50,.25)';g.beginPath();g.arc(x,y,2,0,7);g.arc(x+6,y+3,1.5,0,7);g.fill();}}
  else if(d==='tuft'){if(h%4===0){g.fillStyle='#fff';[[0,-4],[4,0],[0,4],[-4,0]].forEach(p=>{g.beginPath();g.arc(x+p[0],y+p[1],2.6,0,7);g.fill();});g.fillStyle='#ffcc2e';g.beginPath();g.arc(x,y,2,0,7);g.fill();}
    else{g.strokeStyle='#56a43a';g.lineWidth=2.5;g.lineCap='round';g.beginPath();g.moveTo(x-4,y+3);g.lineTo(x-6,y-4);g.moveTo(x,y+3);g.lineTo(x,y-7);g.moveTo(x+4,y+3);g.lineTo(x+6,y-4);g.stroke();}}
  else if(d==='plank'){g.strokeStyle='rgba(90,55,25,.28)';g.lineWidth=2;g.beginPath();g.moveTo(x-14,y);g.lineTo(x+14,y);g.stroke();g.fillStyle='rgba(90,55,25,.4)';g.beginPath();g.arc(x-10,y-4,1.6,0,7);g.arc(x+10,y-4,1.6,0,7);g.fill();}
  else if(d==='bolt'){g.fillStyle='rgba(60,64,85,.35)';g.beginPath();g.arc(x,y,3.5,0,7);g.fill();g.strokeStyle='rgba(60,64,85,.25)';g.lineWidth=2;g.strokeRect(x-9,y-9,18,18);}
}
function makeWall(){
  const h=18,c=pf.createCanvas(T+8,T+h+8);const g=c.getContext('2d');g.translate(4,4+h);
  const top=theme.wt,side=lt(theme.wt,-.38);
  ink(g,3.2);
  rr(g,1,-h+1,T-2,T+h-2,8,side);
  rr(g,1,-h+1,T-2,T-2,8,vg(g,-h,T-h,top));
  g.lineWidth=2;g.strokeStyle='rgba(29,20,54,.3)';
  const k=theme.kind,Y=-h;
  if(k==='crate'){g.strokeRect(9,Y+9,T-18,T-20);g.beginPath();g.moveTo(9,Y+9);g.lineTo(T-9,Y+T-11);g.stroke();}
  else if(k==='stone'){g.beginPath();g.moveTo(10,Y+16);g.lineTo(20,Y+24);g.lineTo(18,Y+34);g.moveTo(32,Y+10);g.lineTo(36,Y+20);g.stroke();g.fillStyle='rgba(120,180,90,.6)';g.beginPath();g.arc(36,Y+36,5,0,7);g.arc(30,Y+38,4,0,7);g.fill();}
  else if(k==='metal'){g.fillStyle='rgba(29,20,54,.4)';[[9,9],[T-11,9],[9,T-13],[T-11,T-13]].forEach(p=>{g.beginPath();g.arc(p[0],Y+p[1],2.6,0,7);g.fill();});g.strokeRect(15,Y+15,T-30,T-32);}
  else if(k==='hazard'){g.save();rrp(g,3,T-h-1,T-6,h-2,4);g.clip();g.fillStyle=INK;for(let i=-2;i<6;i++){g.beginPath();g.moveTo(i*12,T);g.lineTo(i*12+6,T);g.lineTo(i*12+18,T-h-2);g.lineTo(i*12+12,T-h-2);g.fill();}g.restore();}
  g.fillStyle='rgba(255,255,255,.35)';rrp(g,7,Y+5,T-14,4,2);g.fill();
  return c;
}

/* ---------- colisão ---------- */
function collide(e?:any){
  const r=e.r;
  const x0=Math.floor((e.x-r)/T),x1=Math.floor((e.x+r)/T),y0=Math.floor((e.y-r)/T),y1=Math.floor((e.y+r)/T);
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
    if(!solidT(tx,ty))continue;
    const cx=clamp(e.x,tx*T,tx*T+T),cy=clamp(e.y,ty*T,ty*T+T);
    const dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy);
    if(d<r){if(d>0.001){e.x+=dx/d*(r-d);e.y+=dy/d*(r-d);}else{e.y=ty*T+T+r;}}
  }
}
function moveEnt(e?:any,dx?:any,dy?:any){const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/(e.r*.5)));for(let i=0;i<n;i++){e.x+=dx/n;e.y+=dy/n;collide(e);}}
function los(x0?:any,y0?:any,x1?:any,y1?:any){const d=Math.hypot(x1-x0,y1-y0),n=Math.ceil(d/14);for(let i=1;i<n;i++){if(tileAt(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n)==='#')return false;}return true;}

/* ---------- efeitos ---------- */
function burst(x?:any,y?:any,n?:any,cols?:any,spd?:any,sz?:any){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=spd*(.3+Math.random());parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.4+Math.random()*.4,max:.8,c:pick(cols),r:(sz||4)*(.6+Math.random()*.8)});}}
function debris(x?:any,y?:any,n?:any){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=150+Math.random()*220;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.7+Math.random()*.5,max:1.2,c:pick(['#6b6f85','#9aa3b8','#ffcc2e']),r:4,bolt:true,rot:Math.random()*6,vr:(Math.random()-.5)*20});}}
function ring(x?:any,y?:any,c?:any,r?:any){rings.push({x,y,c,r:r||40,life:.35,max:.35});}
function ftext(x?:any,y?:any,s?:any,c?:any,big?:any){texts.push({x:x+(Math.random()-.5)*14,y,s,c,life:.9,big:!!big});}

/* ---------- tiros ---------- */
function addB(team?:any,own?:any,x?:any,y?:any,a?:any,spd?:any,dmg?:any,r?:any,range?:any,kind?:any,o?:any){const b={team,own,x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,a,dmg,r,range,trav:0,spd,kind:kind||0,chg:0};if(o)Object.assign(b,o);bullets.push(b);return b;}
const RANGE={rivet:340,snipe:640,lob:500,rocket:560};
const WNAMES={
 tita:['Rebitadeira','Rebitadeira Turbo','Grampeador Gigante','Pregadeira','Leque de Rebites','Parafusadeira','Rebite Elétrico','Chuva de Pregos','Rebitadeira Dupla','Martelo-Canhão','Rebite de Cobre','Pregadeira Elétrica','Rebitadeira de Ouro','Tempestade de Aço','Rebitadeira Lendária'],
 lia:['Luneta','Luneta Leve','Rifle de Caça','Mira Laser','Luneta Dupla','Atravessadora','Raio Azul','Luneta Tripla','Rifle Estelar','Canhão de Luz','Atravessadora Dupla','Luneta Real','Raio Polar','Rifle Cometa','Luneta Lendária'],
 zeca:['Balão d’Água','Balão Grande','Bexiga de Tinta','Balão Gelado','Granizo','Bomba de Espuma','Balão Duplo','Melancia','Chuva de Balões','Balão Gigante','Bomba de Confete','Tempestade','Balão Trovão','Granizo Triplo','Balão Lendário'],
 rui:['Rojão','Rojão Rápido','Bazuca','Míssil Duplo','Foguetão','Rojão de Festa','Bazuca Dupla','Míssil Triplo','Canhão Vulcão','Super Bazuca','Míssil Quádruplo','Foguete Cometa','Bazuca de Ouro','Chuva de Mísseis','Rojão Lendário']};
const WNUM={tita:[3,3,3,4,5,4,4,5,6,5,5,6,6,7,7],lia:[1,1,1,1,2,1,1,3,2,1,2,2,3,3,3],zeca:[1,1,1,1,3,1,2,1,3,1,2,3,2,4,4],rui:[1,1,1,2,1,2,2,3,1,1,4,2,2,5,4]};
const WPIER={tita:[10,11,12,13,14],lia:[5,6,9,10,12,13,14],zeca:[],rui:[]};
const WBIG={zeca:[7,9,14],rui:[8,9,14],tita:[],lia:[]};
const WCOL=WPAL.map((c,i)=>i?c:'');
function weaponOf(id?:any,t?:any){t=clamp(t|0,0,14);const n=WNUM[id][t],n0=WNUM[id][0];
  return {t,name:WNAMES[id][t],n,dm:(1+.1*t)*Math.sqrt(n0/n),am:(1+.035*t)*(WBIG[id].includes(t)?1.35:1),rl:Math.max(.62,1-.025*t),rg:1+.02*t,pierce:WPIER[id].includes(t),col:WCOL[t]||null,lvl:WUNL[t]};}
const WUNL=(()=>{const a=[1,5];let g=7;while(a.length<15){a.push(a[a.length-1]+g);g+=2;}return a;})();
const LMAX=WUNL[14];
function wUnlocked(l?:any){let n=0;for(const v of WUNL)if(v<=l)n++;return n;}
function charLvl(id?:any){let x=(save.cxp&&save.cxp[id])|0,l=1,need=42;while(x>=need&&l<LMAX){x-=need;l++;need=40+l*2;}return {l,x,need,max:l>=LMAX,u:wUnlocked(l)};}
function myW(){const c=myCh(),u=charLvl(c.id).u;const e=save.wpn&&save.wpn[c.id];return weaponOf(c.id,clamp(e==null?0:e,0,u-1));}
function myRange(){return Math.min(820,RANGE[myCh().atk]*myW().rg);}
function addCharXP(n?:any){const c=myCh();save.cxp=save.cxp||{};const B=charLvl(c.id);save.cxp[c.id]=(save.cxp[c.id]|0)+n;const A=charLvl(c.id);
  if(A.u>B.u){save.newW=save.newW||{};save.newW[c.id]=1;toast(c.full+' chegou ao nível '+A.l+'! Arma liberada: '+WNAMES[c.id][A.u-1]+'. Equipe em Armas.');SFX.unlock();}
  else if(A.l>B.l&&A.l%5===0)toast(c.full+' chegou ao nível '+A.l+'!');
  persist();}
function patternPlayer(own?:any,x?:any,y?:any,a?:any,k?:any,chi?:any,dist?:any,wi?:any){
  const ch=CH[chi|0]||CH[0],atk=ch.atk,Wp=weaponOf(ch.id,wi|0),n=Wp.n,dm=Wp.dm,am=Wp.am,col=Wp.col,R=Math.min(820,RANGE[atk]*Wp.rg);
  const mx=x+Math.cos(a)*24,my=y+Math.sin(a)*24;
  const flash=()=>{burst(mx,my-14,6,[col||'#ffe14d','#fff'],120,3);parts.push({x:mx,y:my-14,vx:0,vy:0,life:.08,max:.08,c:'#fff6b0',r:11});};
  if(own==='me'||Math.hypot(x-(P?P.x:x),y-(P?P.y:y))<900)shotSound(atk,k,own==='me'?1:.35);
  const fan=(cnt,step)=>{const o=[];for(let i=0;i<cnt;i++)o.push((i-(cnt-1)/2)*step);return o;};
  const pc=()=>Wp.pierce?{}:null;
  if(atk==='rivet'){
    if(k===1){for(let i=0;i<20+n;i++)addB('p',own,x,y,i/(20+n)*Math.PI*2,520,Math.round(520*dm),9,280*Wp.rg,1,{col,pierce:pc()});fan(5,.07).forEach(o=>addB('p',own,x,y,a+o,700,Math.round(620*dm),10,430*Wp.rg,1,{col}));
      burst(x,y-14,26,['#ffe14d','#ffcc2e','#fff',col||'#ff7a2f'],320,5);ring(x,y,col||'#ffe14d',120);}
    else{fan(n,Math.min(.11,.5/Math.max(1,n-1))).forEach((o,i)=>addB('p',own,mx,my,a+o,640-(i%3)*12,Math.round(330*dm),7,R,0,{chg:.065*3/n,col,pierce:pc()}));flash();}
  } else if(atk==='snipe'){
    if(k===1){fan(n>=3?5:3,.07).forEach(o=>addB('p',own,mx,my,a+o,1150,Math.round(1300*dm),8,Math.min(860,R+80),3,{pierce:{},col}));ring(x,y,col||'#7ee6ff',90);burst(mx,my-14,18,[col||'#7ee6ff','#fff'],260,4);}
    else{fan(n,.06).forEach(o=>addB('p',own,mx,my,a+o,1100,Math.round(1000*dm),6,R,2,{chg:.2/n,col,pierce:pc()}));flash();}
  } else if(atk==='lob'){
    const d=clamp(dist||R,90,R);
    const tx=x+Math.cos(a)*d,ty=y+Math.sin(a)*d;
    const throwAt=(px,py,dmg,aoe,o?)=>{const dd=Math.max(30,Math.hypot(px-x,py-y)),aa=Math.atan2(py-y,px-x);addB('p',own,x,y,aa,Math.max(140,dd/.68),dmg,9,dd,4,Object.assign({lob:true,aoe,col},o||{}));};
    if(k===1){const cnt=7+(n>=3?3:0);for(let i=0;i<cnt;i++){const ang=i/cnt*Math.PI*2,r2=i?70:0;throwAt(tx+Math.cos(ang)*r2,ty+Math.sin(ang)*r2,Math.round(1000*dm),70*am);}ring(x,y,col||'#4cb7ff',80);}
    else{for(let i=0;i<n;i++){const ang=i/n*Math.PI*2+a,r2=n>1?55:0;throwAt(tx+Math.cos(ang)*r2,ty+Math.sin(ang)*r2,Math.round(1150*dm),72*am,{chg:.14/n});}flash();}
  } else if(atk==='rocket'){
    if(k===1){fan(3+Math.floor(n/2),.16).forEach(o=>addB('p',own,mx,my,a+o,500,Math.round(850*dm),11,R+40,5,{aoe:88*am,col}));ring(x,y,col||'#ff9a2f',90);shake=Math.max(shake,6);}
    else{fan(n,.12).forEach(o=>addB('p',own,mx,my,a+o,520,Math.round(620*dm),9,R,5,{aoe:62*am,chg:.12/n,col}));flash();}
  }
}
function explode(b?:any){
  if(!P||Math.hypot(b.x-P.x,b.y-P.y)<900){if(b.kind===4)SFX.splash();else SFX.boom(false);}
  ring(b.x,b.y,b.kind===4?'#bfe9ff':'#ffb347',b.aoe*1.2);
  burst(b.x,b.y-6,b.kind===4?16:22,b.kind===4?['#4cb7ff','#bfe9ff','#fff']:['#ff9a2f','#ffe14d','#fff','#6b6f85'],b.kind===4?200:260,b.kind===4?5:6);
  if(b.kind===5)shake=Math.max(shake,3);
  let hit=false;
  for(const e of enemies.slice()){if(Math.hypot(e.x-b.x,e.y-b.y)<=b.aoe+e.r){hit=true;
    if(NET.isHost||cur===-1){e.hp-=b.dmg;e.fl=.12;e.alert=true;e.lastHurt=clock;ftext(e.x,e.y-(e.type==='X'?110:58),String(b.dmg),'#fff');if(e.hp<=0)killEnemy(e);}}}
  if(hit&&b.own==='me'&&b.chg&&P.sup<1)P.sup=Math.min(1,P.sup+b.chg);
  if(b.col)ring(b.x,b.y,b.col,b.aoe*.8);
}
let shotSeq=0;const myShots=[];
function playerShoot(a?:any,d?:any){
  if(!P||P.dead||state!=='play'||paused)return;
  if(P.ammo<1){P.noAmmo=.4;SFX.dry();return;}
  if(d==null)d=autoDist();
  P.ammo-=1;P.lastShot=clock;P.aim=a;
  const wi=myW().t;patternPlayer('me',P.x,P.y,a,0,save.ch|0,d,wi);
  myShots.push([++shotSeq,P.x|0,P.y|0,Math.round(a*1000),0,save.ch|0,d|0,wi]);if(myShots.length>10)myShots.shift();
}
function useSuper(a?:any,d?:any){
  if(!P||P.dead||state!=='play'||paused||P.sup<1)return;
  if(a==null)a=autoAim();
  if(d==null)d=autoDist();
  P.sup=0;P.aim=a;P.lastShot=clock;shake=10;superFlash=.25;
  const wi=myW().t;patternPlayer('me',P.x,P.y,a,1,save.ch|0,d,wi);
  ftext(P.x,P.y-80,myCh().sup.split(':')[0].toUpperCase()+'!','#ffe14d',true);
  myShots.push([++shotSeq,P.x|0,P.y|0,Math.round(a*1000),1,save.ch|0,d|0,wi]);if(myShots.length>10)myShots.shift();
}
function autoDist(){
  if(!P)return RANGE.lob;let bd=1e9;const R=myRange()+40;
  for(const e of enemies){const d=Math.hypot(e.x-P.x,e.y-P.y);if(d<R&&d<bd&&!hiddenE(e,d))bd=d;}
  return bd<1e9?bd:myRange();
}
function hiddenE(e?:any,d?:any){return tileAt(e.x,e.y)==='B'&&d>130&&e.fl<=0;}
function autoAim(){
  if(!P)return 0;
  const AR=Math.max(460,myRange()+40);let best=null,bd=AR;
  for(const e of enemies){const d=Math.hypot(e.x-P.x,e.y-P.y);if(d<bd&&!hiddenE(e,d)&&(myCh().atk==='lob'||los(P.x,P.y,e.x,e.y))){bd=d;best=e;}}
  if(!best){bd=AR;for(const e of enemies){const d=Math.hypot(e.x-P.x,e.y-P.y);if(d<bd&&!hiddenE(e,d)){bd=d;best=e;}}}
  return best?Math.atan2(best.y-P.y,best.x-P.x):P.aim;
}
function hurtPlayer(dmg?:any,a?:any){
  if(!P||P.dead||state!=='play')return;
  dmg=Math.round(dmg);P.hp-=dmg;SFX.hurt();P.fl=.15;P.lastHit=clock;shake=Math.max(shake,6);
  ftext(P.x,P.y-64,'-'+dmg,'#ff5d73');
  moveEnt(P,Math.cos(a)*8,Math.sin(a)*8);
  if(P.hp<=0){P.hp=0;P.dead=true;P.respT=5;SFX.down();burst(P.x,P.y-20,40,[myCh().body,myCh().hair,'#fff','#ffe14d'],300,6);debris(P.x,P.y-20,8);shake=14;
    if(!NET.game&&cur!==-1)loseT=1.4;}
}
function deathFx(e?:any,dummy?:any){
  if(!P||Math.hypot(e.x-P.x,e.y-P.y)<900)SFX.boom(e.type==='X');
  const big=e.type==='X';
  if(!dummy&&cur!==-1){save.kills=(save.kills|0)+1;addXP(big?150:5);addCharXP(big?120:6);}
  burst(e.x,e.y-20,big?80:26,['#ffe14d','#ff7a2f','#fff','#8d78e0'],big?420:240,big?8:5);debris(e.x,e.y-20,big?24:7);ring(e.x,e.y,'#fff',big?160:60);
  shake=Math.max(shake,big?20:5);
  const n=dummy?0:big?14:e.type==='t'?4:2;
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2;drops.push({x:e.x,y:e.y,r:6,vx:Math.cos(a)*90,vy:Math.sin(a)*90,z:0,vz:180+Math.random()*80,t:0});}
}
function lvlInfo(){let x=save.xp|0,l=1,need=100;while(x>=need){x-=need;l++;need=100+l*40;}return {l,x,need};}
function addXP(n?:any){save.xp=(save.xp|0)+n;persist();}
function killEnemy(e?:any){if(e.type==='d'){e.hp=e.max;e.fl=.2;deathFx(e,true);return;}enemies.splice(enemies.indexOf(e),1);deathFx(e);}

/* ---------- alvos (jogador local + remotos) ---------- */
const RP={};
function targets(){
  const L=[];
  if(P)L.push({x:P.x,y:P.y,r:P.r,local:true,dead:P.dead,inBush:P.inBush,lastShot:P.lastShot,lastHit:P.lastHit});
  for(const k in RP){const r=RP[k];if(r.sc==='play'&&r.run===runId)L.push({x:r.x,y:r.y,r:16,local:false,peer:k,dead:r.dead,inBush:tileAt(r.x,r.y)==='B',lastShot:r.lastShot,lastHit:-9});}
  return L;
}
function hurtTarget(t?:any,dmg?:any,a?:any){dmg=Math.round(dmg*dmgMul);if(t.local)hurtPlayer(dmg,a);else NET.pushHit(t.peer,dmg,a);}

/* ---------- IA (só o anfitrião) ---------- */
let TG=[];
function hostShoot(x?:any,y?:any,a?:any,n?:any,spr?:any,spd?:any,dmg?:any,r?:any,rng?:any,kind?:any,ringMode?:any){
  dmg=Math.round(dmg*dmgMul);
  spawnVolley(x,y,a,n,spr,spd,dmg,r,rng,kind,ringMode);
  NET.pushEv([x|0,y|0,Math.round(a*1000),n,Math.round(spr*1000),spd,dmg,r,rng,kind,ringMode]);
}
function spawnVolley(x?:any,y?:any,a?:any,n?:any,spr?:any,spd?:any,dmg?:any,r?:any,rng?:any,kind?:any,ringMode?:any){
  if(P&&Math.hypot(x-P.x,y-P.y)<700)SFX.eshot();
  for(let k=0;k<n;k++){const ang=ringMode?a+k*Math.PI*2/n:a+(k-(n-1)/2)*spr;addB('e',0,x+Math.cos(ang)*(ringMode?30:24),y+Math.sin(ang)*(ringMode?30:24),ang,spd,dmg,r,rng,kind);}
}
function nearestTarget(e?:any){
  let best=null,bd=1e9;
  for(const t of TG){if(t.dead)continue;const d=Math.hypot(t.x-e.x,t.y-e.y);
    const hid=t.inBush&&d>120&&clock-t.lastShot>1.2&&clock-t.lastHit>1;
    if(hid)continue;const score=d*(los(e.x,e.y,t.x,t.y)?1:1.6);if(score<bd){bd=score;best=t;}}
  return best;
}
function updEnemy(e?:any,dt?:any){
  if(e.type==='d'){e.fl=Math.max(0,e.fl-dt);e.mv=false;if(e.hp<e.max&&clock-(e.lastHurt||0)>2)e.hp=Math.min(e.max,e.hp+e.max*.5*dt);return;}
  e.fl=Math.max(0,e.fl-dt);e.cd-=dt;e.hitCD-=dt;e.lunge=Math.max(0,e.lunge-dt);e.avT-=dt;e.strT-=dt;
  if(e.strT<0){e.strT=1.5+Math.random()*2;e.strafe*=-1;}
  if(e.say){e.say.l-=dt;if(e.say.l<=0)e.say=null;}
  const t=nearestTarget(e);
  const range=e.type==='X'?640:440;
  let d=1e9,a=e.face,clear=false;
  if(t){d=Math.hypot(t.x-e.x,t.y-e.y);a=Math.atan2(t.y-e.y,t.x-e.x);clear=los(e.x,e.y,t.x,t.y);}
  e.seen=!!t&&d<range&&(clear||e.alert);
  if(e.seen&&!e.alert){e.alert=true;e.say={t:e.type==='X'?'Arrr! Quem ousa?!':pick(['Bip!','Alvo!','Intrusa!','Bzzt!']),l:e.type==='X'?2:1.1};}
  if(e.type==='X'){bossAI(e,dt,d,a,t);return;}
  let mx=0,my=0,sp=e.spd;
  if(e.seen){
    e.face=a;
    if(e.type==='g'){
      mx=Math.cos(a);my=Math.sin(a);
      if(d<e.r+16+8&&e.hitCD<=0){hurtTarget(t,e.dmg,a);e.hitCD=.8;e.lunge=.18;}
    } else if(e.type==='s'){
      if(e.wind>0){e.wind-=dt;if(e.wind<=0){e.wind=0;hostShoot(e.x,e.y,a+(Math.random()-.5)*.08,1,0,380,e.dmg,8,440,0,0);}}
      else{
        if(!clear||d>270){mx=Math.cos(a);my=Math.sin(a);}
        else if(d<170){mx=-Math.cos(a);my=-Math.sin(a);}
        else{mx=-Math.sin(a)*e.strafe*.8;my=Math.cos(a)*e.strafe*.8;}
        if(e.cd<=0&&clear&&d<440){e.wind=.38;e.cd=1.6+Math.random()*.4;}
      }
    } else if(e.type==='t'){
      if(!clear||d>220){mx=Math.cos(a);my=Math.sin(a);}
      if(e.cd<=0&&clear&&d<430){hostShoot(e.x+Math.cos(a)*6,e.y+Math.sin(a)*6,a,5,.19,320,e.dmg,8,420,0,0);e.cd=2.4;shake=Math.max(shake,2);}
    }
  } else {
    sp=e.spd*.35;mx=Math.cos(clock*.7+e.wob)*.5;my=Math.sin(clock*.5+e.wob*2)*.5;
    if(Math.random()<.002)e.alert=false;
  }
  if(e.avT>0){const ang=Math.atan2(my,mx)+e.strafe*Math.PI/2,m=Math.hypot(mx,my);mx=Math.cos(ang)*m;my=Math.sin(ang)*m;}
  const bx=e.x,by=e.y,m=Math.hypot(mx,my);
  if(m>0.05){moveEnt(e,mx*sp*dt,my*sp*dt);if(Math.hypot(e.x-bx,e.y-by)<m*sp*dt*.3&&e.avT<=0&&e.seen)e.avT=.6;}
  e.mv=Math.hypot(e.x-bx,e.y-by)>sp*dt*.2;
}
function bossAI(e?:any,dt?:any,d?:any,a?:any,t?:any){
  if(!e.alert||!t){e.mv=false;return;}
  e.face=a;e.stT-=dt;
  const ph2=e.hp<e.max*.5;
  if(ph2&&!e.half){e.half=true;e.say={t:'Grrr! Agora eu fiquei bravo!',l:2.2};}
  const sm=(ph2?1.3:1)*(1+.06*(diffN-1));let mv=false;
  switch(e.st){
    case 'idle':
      moveEnt(e,Math.cos(a)*e.spd*dt*sm,Math.sin(a)*e.spd*dt*sm);mv=true;
      if(e.stT<=0){const order=['burst','spray','windup','summon','burst','windup'];e.st=order[e.cyc%order.length];e.cyc++;
        e.stT=e.st==='burst'?1.5:e.st==='spray'?(ph2?3.2:2.6):e.st==='windup'?.7:1;e.cd=0;
        if(e.st==='summon'){const cnt=enemies.filter(q=>q.type!=='X').length;if(cnt>=3+diffN){e.st='burst';e.stT=1.5;}else e.say={t:'Marujos, ataquem!',l:1.6};}}
      break;
    case 'burst':
      if(e.cd<=0){const n=(ph2?7:5)+Math.min(2,diffN-1);hostShoot(e.x+Math.cos(a)*20,e.y+Math.sin(a)*20,a,n,.15,330,e.dmg,9,520,1,0);e.cd=.45;}
      if(e.stT<=0){e.st='idle';e.stT=.9;}
      break;
    case 'spray':
      if(e.cd<=0){const arms=(ph2?5:4)+(diffN>=3?1:0);hostShoot(e.x,e.y,e.spin,arms,0,260,e.dmg*.8,8,480,1,1);e.spin+=.27;e.cd=ph2?.08:.1;}
      if(e.stT<=0){e.st='idle';e.stT=1;}
      break;
    case 'windup':
      e.dashA=a;if(e.stT<=0){e.st='dash';e.stT=.62;e.dashHit=false;}
      break;
    case 'dash':{
      const bx=e.x,by=e.y;moveEnt(e,Math.cos(e.dashA)*560*dt,Math.sin(e.dashA)*560*dt);mv=true;
      if(Math.random()<.6)parts.push({x:e.x,y:e.y,vx:0,vy:0,life:.3,max:.3,c:'rgba(255,255,255,.7)',r:10});
      if(!e.dashHit)for(const q of TG){if(!q.dead&&Math.hypot(q.x-e.x,q.y-e.y)<e.r+16+6){e.dashHit=true;hurtTarget(q,950,e.dashA);}}
      if(e.stT<=0||Math.hypot(e.x-bx,e.y-by)<1){e.st='idle';e.stT=1.1;shake=Math.max(shake,6);}
      break;}
    case 'summon':
      if(e.stT<=0){for(let k=0;k<2;k++){const ang=Math.random()*Math.PI*2;const ne=spawnEnemy('g',e.x+Math.cos(ang)*70,e.y+Math.sin(ang)*70);collide(ne);ne.alert=true;burst(ne.x,ne.y-15,12,['#fff','#8d78e0'],160,4);}e.st='idle';e.stT=1.2;}
      break;
  }
  e.mv=mv;
  if(e.hitCD<=0&&e.st!=='dash')for(const q of TG){if(!q.dead&&Math.hypot(q.x-e.x,q.y-e.y)<e.r+16+4){hurtTarget(q,500,Math.atan2(q.y-e.y,q.x-e.x));e.hitCD=.9;break;}}
}

/* ---------- entrada (a plataforma entrega teclas e toques já em coordenadas do jogo) ---------- */
const keys:{[k:string]:boolean}={};
const touch:any={move:null,fire:null,sup:null};
const mouse={x:0,y:0,on:false};
function keyDown(code:string):boolean{
  keys[code]=true;
  if(state==='play'){
    if(code==='Space'||code==='KeyE'){lastInput='mouse';useSuper(mouseAngle(),mouseDist());return true;}
    if(code==='Escape'||code==='KeyP')setPause(true);
  } else if(state==='story'&&(code==='Space'||code==='Enter')){advance();return true;}
  else if(state==='map'){
    if(code==='ArrowRight'||code==='KeyD')mapStep(1);
    if(code==='ArrowLeft'||code==='KeyA')mapStep(-1);
    if(code==='Enter'||code==='Space'){mapEnter();return true;}
  }
  return false;
}
function keyUp(code:string){keys[code]=false;}
function mouseAngle(){if(!P)return 0;const wx=cam.x+(mouse.x-W/2)/SC,wy=cam.y+(mouse.y-H/2)/SC;return Math.atan2(wy-(P.y-14),wx-P.x);}
function fireBtn(){return {x:W-96-INS.r,y:H-92-INS.b,r:50};}
function superBtn(){const f=fireBtn();return {x:f.x-118,y:f.y+16,r:34};}
/* devolve true quando o toque deve ficar preso ao canvas */
function ptrDown(ev:PtrEv):boolean{
  const p={x:ev.x,y:ev.y};
  if(state==='map'){mapTap(p.x,p.y);return false;}
  if(state!=='play'||paused)return false;
  if(ev.type==='mouse'){lastInput='mouse';mouse.on=true;mouse.x=p.x;mouse.y=p.y;
    if(ev.button===2)useSuper(mouseAngle(),mouseDist());else if(ev.button===0)playerShoot(mouseAngle(),mouseDist());return false;}
  lastInput='touch';
  const f=fireBtn(),s=superBtn();
  const df=Math.hypot(p.x-f.x,p.y-f.y),ds=Math.hypot(p.x-s.x,p.y-s.y);
  if(ds<s.r+14&&!touch.sup){touch.sup={id:ev.id,ox:s.x,oy:s.y,x:p.x,y:p.y,t0:clock,dragged:false,ang:0};return true;}
  if((df<f.r+40||(p.x>W*.55&&p.y>H*.45))&&!touch.fire){touch.fire={id:ev.id,x:p.x,y:p.y,sx:p.x,sy:p.y,t0:clock,dragged:false,ang:autoAim()};return true;}
  if(p.x<W*.5&&!touch.move)touch.move={id:ev.id,ox:p.x,oy:p.y,x:p.x,y:p.y};
  return true;
}
function ptrMove(ev:PtrEv){
  const p={x:ev.x,y:ev.y};
  if(ev.type==='mouse'){mouse.x=p.x;mouse.y=p.y;mouse.on=true;return;}
  for(const k of ['move','fire','sup']){const s=touch[k];if(!s||s.id!==ev.id)continue;
    s.x=p.x;s.y=p.y;
    if(k==='move'){const dx=s.x-s.ox,dy=s.y-s.oy,d=Math.hypot(dx,dy);if(d>60){s.ox=s.x-dx/d*60;s.oy=s.y-dy/d*60;}}
    else{const bx=k==='fire'?s.sx:s.ox,by=k==='fire'?s.sy:s.oy;const dx=s.x-bx,dy=s.y-by;if(Math.hypot(dx,dy)>16){s.dragged=true;s.ang=Math.atan2(dy,dx);}}
  }
}
function ptrUp(ev:PtrEv,cancelled?:boolean){
  if(touch.move&&touch.move.id===ev.id)touch.move=null;
  const up=!cancelled&&state==='play';
  if(touch.fire&&touch.fire.id===ev.id){const s=touch.fire;touch.fire=null;if(up)playerShoot(s.dragged?s.ang:autoAim(),s.dragged?dragDist(s,s.sx,s.sy):autoDist());}
  if(touch.sup&&touch.sup.id===ev.id){const s=touch.sup;touch.sup=null;if(up)useSuper(s.dragged?s.ang:autoAim(),s.dragged?dragDist(s,s.ox,s.oy):autoDist());}
}
function dragDist(s:any,bx:number,by:number){const L=Math.hypot(s.x-bx,s.y-by);return 90+clamp((L-16)/60,0,1)*(myRange()-90);}
function mouseDist(){if(!P)return 300;const wx=cam.x+(mouse.x-W/2)/SC,wy=cam.y+(mouse.y-H/2)/SC;return clamp(Math.hypot(wx-P.x,wy-P.y),90,myRange());}
function aimingNow():any{
  if(touch.fire&&(touch.fire.dragged||clock-touch.fire.t0>.18)){const f=touch.fire;return {a:f.dragged?f.ang:autoAim(),d:f.dragged?dragDist(f,f.sx,f.sy):autoDist(),sup:false};}
  if(touch.sup&&P&&P.sup>=1){const f=touch.sup;return {a:f.dragged?f.ang:autoAim(),d:f.dragged?dragDist(f,f.ox,f.oy):autoDist(),sup:true};}
  if(lastInput==='mouse'&&mouse.on&&P)return {a:mouseAngle(),d:mouseDist(),sup:false};
  return null;
}

/* ---------- atualização da fase ---------- */
function PAL(){return PALS[(NET.myIndex||0)%5];}
function update(dt?:any){
  let mx=0,my=0;
  if(keys.KeyW||keys.ArrowUp)my-=1;if(keys.KeyS||keys.ArrowDown)my+=1;if(keys.KeyA||keys.ArrowLeft)mx-=1;if(keys.KeyD||keys.ArrowRight)mx+=1;
  if(mx||my)lastInput='mouse';
  if(touch.move){const dx=touch.move.x-touch.move.ox,dy=touch.move.y-touch.move.oy;if(Math.hypot(dx,dy)>6){mx=dx/60;my=dy/60;}}
  const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m;}
  if(!P.dead){
    const bx=P.x,by=P.y;moveEnt(P,mx*myCh().spd*dt,my*myCh().spd*dt);P.mv=m>.1;
    if(P.mv&&Math.random()<dt*8)parts.push({x:P.x-mx*10,y:P.y+2,vx:-mx*20,vy:-8,life:.35,max:.35,c:'rgba(255,255,255,.55)',r:4});
    const am=aimingNow();
    if(am)P.aim=am.a;else if(P.mv&&clock-P.lastShot>.6&&Math.hypot(P.x-bx,P.y-by)>.1)P.aim=Math.atan2(my,mx);
    const pa=P.ammo;P.ammo=Math.min(3,P.ammo+dt/(myCh().reload*myW().rl));if(Math.floor(P.ammo)>Math.floor(pa))SFX.reload();
    if(P.sup>=1&&!P.supReady){P.supReady=true;SFX.ready();}else if(P.sup<1)P.supReady=false;
    if(clock-P.lastHit>3&&clock-P.lastShot>2.5&&P.hp<P.max)P.hp=Math.min(P.max,P.hp+P.max*.14*dt);
    P.inBush=tileAt(P.x,P.y)==='B';
  } else if(cur===-1||NET.game&&phase==='play'){
    P.respT-=cur===-1?dt*2.5:dt;
    if(P.respT<=0){const al=targets().filter(t=>!t.local&&!t.dead);const sp=al.length?[al[0].x,al[0].y]:P.spawn;
      P.x=sp[0]+(Math.random()-.5)*30;P.y=sp[1]+(Math.random()-.5)*30;collide(P);P.dead=false;P.hp=P.max;P.ammo=3;P.fl=.3;ring(P.x,P.y,'#5ee04a',70);}
  }
  P.fl=Math.max(0,P.fl-dt);P.noAmmo=Math.max(0,P.noAmmo-dt);
  checkAreaEntry();if(state!=='play')return;
  if(WORLD.capQ.length){WORLD.capT+=dt;if(WORLD.capT>3.6){WORLD.capT=0;WORLD.capQ.shift();}}
  for(const k in RP){const r=RP[k];r.x+=(r.tx-r.x)*Math.min(1,dt*14);r.y+=(r.ty-r.y)*Math.min(1,dt*14);r.fl=Math.max(0,(r.fl||0)-dt);}
  if(NET.isHost){
    TG=targets();
    for(const e of enemies.slice()){if(WORLD.on&&areaOf(e.x)!==WORLD.prog){e.mv=false;continue;}updEnemy(e,dt);}
    for(let i=0;i<enemies.length;i++){const a=enemies[i];
      for(let j=i+1;j<enemies.length;j++){const b=enemies[j];const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),mn=a.r+b.r;
        if(d<mn&&d>0.01){const p=(mn-d)/2;a.x-=dx/d*p;a.y-=dy/d*p;b.x+=dx/d*p;b.y+=dy/d*p;collide(a);collide(b);}}
      for(const t of TG){if(t.dead)continue;const dx=a.x-t.x,dy=a.y-t.y,d=Math.hypot(dx,dy),mn=a.r+16;if(d<mn&&d>0.01){a.x+=dx/d*(mn-d);a.y+=dy/d*(mn-d);collide(a);}}
    }
  } else {
    for(const e of enemies){e.x+=(e.tx-e.x)*Math.min(1,dt*12);e.y+=(e.ty-e.y)*Math.min(1,dt*12);e.fl=Math.max(0,e.fl-dt);e.lunge=Math.max(0,e.lunge-dt);if(e.say){e.say.l-=dt;if(e.say.l<=0)e.say=null;}}
  }
  for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];
    const st=Math.min(b.spd*dt,Math.max(0,b.range-b.trav)+.01);b.x+=Math.cos(b.a)*st;b.y+=Math.sin(b.a)*st;b.trav+=st;let dead=false;
    if(b.kind===5&&Math.random()<.7)parts.push({x:b.x-Math.cos(b.a)*12,y:b.y-14-Math.sin(b.a)*12,vx:(Math.random()-.5)*30,vy:(Math.random()-.5)*30,life:.35,max:.35,c:pick(['#ffcc2e','#ff7a2f','rgba(200,200,210,.8)']),r:4+Math.random()*3});
    if(b.lob){if(b.trav>=b.range){dead=true;explode(b);}}
    else if(b.trav>=b.range){dead=true;if(b.aoe)explode(b);else burst(b.x,b.y-14,3,['#fff'],60,3);}
    else if(tileAt(b.x,b.y)==='#'){dead=true;if(b.aoe)explode(b);else burst(b.x,b.y-14,5,b.team==='p'?['#ffe14d','#fff']:['#ff8a5c','#fff'],110,3);}
    else if(b.team==='p'){for(const e of enemies){if(Math.hypot(e.x-b.x,e.y-b.y)<e.r+b.r){
        if(b.pierce&&b.pierce[e.id])continue;
        if(b.aoe){explode(b);dead=true;break;}
        if(NET.isHost||cur===-1){e.hp-=b.dmg;e.fl=.12;e.alert=true;e.lastHurt=clock;ftext(e.x,e.y-(e.type==='X'?110:58),String(b.dmg),'#fff');}
        if(b.own==='me'){SFX.hit();if(P.sup<1&&b.chg)P.sup=Math.min(1,P.sup+b.chg);}
        burst(b.x,b.y-14,4,b.kind>=2?['#7ee6ff','#fff']:['#ffe14d','#fff'],120,3);
        if((NET.isHost||cur===-1)&&e.hp<=0)killEnemy(e);
        if(b.pierce){b.pierce[e.id]=1;continue;}
        dead=true;break;}}}
    else{
      if(!P.dead&&Math.hypot(P.x-b.x,P.y-b.y)<P.r+b.r){hurtPlayer(b.dmg,Math.atan2(b.vy,b.vx));dead=true;burst(b.x,b.y-14,5,['#ff8a5c','#fff'],120,3);}
      else for(const k in RP){const r=RP[k];if(!r.dead&&r.sc==='play'&&Math.hypot(r.x-b.x,r.y-b.y)<16+b.r){dead=true;burst(b.x,b.y-14,5,['#ff8a5c','#fff'],120,3);break;}}
    }
    if(dead)bullets.splice(i,1);
  }
  updFx(dt);
  for(let i=drops.length-1;i>=0;i--){const g=drops[i];g.t+=dt;
    if(g.z>0||g.vz>0){g.x+=g.vx*dt;g.y+=g.vy*dt;g.vz-=600*dt;g.z+=g.vz*dt;if(g.z<0){g.z=0;g.vz=0;}collide(g);}
    if(!P.dead){const d=Math.hypot(P.x-g.x,P.y-g.y);
      if((d<100||(WORLD.on?areaEnemies(cur)===0:enemies.length===0))&&g.t>.4&&d>1){g.x+=(P.x-g.x)/d*380*dt;g.y+=(P.y-g.y)/d*380*dt;}
      if(d<20&&g.t>.4){drops.splice(i,1);gearsRun++;SFX.coin();burst(P.x,P.y-20,4,['#ffe14d'],80,3);}}
  }
  const fx=P.dead?(targets().find(t=>!t.local&&!t.dead)||P):P;
  cam.x+=(fx.x-cam.x)*Math.min(1,dt*7);cam.y+=(fx.y-20-cam.y)*Math.min(1,dt*7);
  const vw=W/SC,vh=H/SC,mw=GW*T,mh=GH*T;
  cam.x=mw<vw?mw/2:clamp(cam.x,vw/2-T*.4,mw-vw/2+T*.4);
  cam.y=mh<vh?mh/2:clamp(cam.y,vh/2-T*1.4,mh-vh/2+T*1.2);
  shake=Math.max(0,shake-dt*30);superFlash=Math.max(0,superFlash-dt);
  banner=Math.max(0,banner-dt);tutT=Math.max(0,tutT-dt);
  if(cur===-1){const ck=Math.ceil(WAIT.ct);if(ck!==WAIT.lastK){if(ck>0)SFX.beep(false);WAIT.lastK=ck;}
    if(NET.isHost&&phase==='count'){WAIT.ct-=dt;if(WAIT.ct<=0){WAIT.ct=0;if(WAIT.mode==='w')startWavesHost();else startChapterHost(WAIT.sel);return;}}else if(!NET.isHost&&WAIT.ct>0)WAIT.ct=Math.max(0,WAIT.ct-dt);updWaitUI();}
  else if(NET.isHost&&phase==='play'&&WV.on){
    waveTick(dt);
    if(NET.game){const tg=targets();if(tg.length&&tg.every(t=>t.dead)){allDeadT+=dt;if(allDeadT>1.2){allDeadT=0;wavesOver();}}else allDeadT=0;}
    else if(loseT){loseT-=dt;if(loseT<=0){loseT=0;wavesOver();}}
  }
  else if(NET.isHost&&phase==='play'){
    if((WORLD.on?areaEnemies(WORLD.prog)===0:enemies.length===0)&&!winT)winT=1.4;
    if(winT){winT-=dt;if(winT<=0){winT=0;if(WORLD.on)onAreaClear();else hostWin();return;}}
    if(NET.game){const tg=targets();if(tg.length&&tg.every(t=>t.dead)){allDeadT+=dt;if(allDeadT>1.2){allDeadT=0;hostLose();}}else allDeadT=0;}
    else if(loseT){loseT-=dt;if(loseT<=0){loseT=0;hostLose();}}
  }
}
function updFx(dt?:any){
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.9;p.vy*=.9;if(p.bolt)p.rot+=p.vr*dt;p.life-=dt;if(p.life<=0)parts.splice(i,1);}
  for(let i=texts.length-1;i>=0;i--){const t=texts[i];t.y-=40*dt;t.life-=dt;if(t.life<=0)texts.splice(i,1);}
  for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.life-=dt;if(r.life<=0)rings.splice(i,1);}
}

/* ---------- render da fase ---------- */
function drawWater(g?:any,x0?:any,y0?:any,x1?:any,y1?:any){
  g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=2.5;g.lineCap='round';g.beginPath();
  for(let ty=Math.max(0,y0);ty<=Math.min(GH-1,y1);ty++)for(let tx=Math.max(0,x0);tx<=Math.min(GW-1,x1);tx++){
    if(grid[ty][tx]!=='W')continue;const X=tx*T,Y=ty*T,o=Math.sin(clock*2+tx*.9+ty*1.3)*4;
    g.moveTo(X+8,Y+20+o);g.quadraticCurveTo(X+16,Y+14+o,X+24,Y+20+o);g.moveTo(X+26,Y+36-o);g.quadraticCurveTo(X+34,Y+30-o,X+42,Y+36-o);}
  g.stroke();
}
function drawOutside(g?:any,x0?:any,y0?:any,x1?:any,y1?:any){
  g.fillStyle=theme.out;g.fillRect(x0*T,y0*T,(x1-x0+1)*T,(y1-y0+1)*T);
  if(theme.outWater){g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=2.5;g.beginPath();
    for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){if(ty>=0&&ty<GH&&tx>=0&&tx<GW)continue;if(((tx*7+ty*3)%3+3)%3)continue;const X=tx*T,Y=ty*T,o=Math.sin(clock*1.5+tx+ty)*4;g.moveTo(X+10,Y+24+o);g.quadraticCurveTo(X+20,Y+16+o,X+30,Y+24+o);}
    g.stroke();}
  else{g.fillStyle='rgba(0,0,0,.12)';for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){if((tx+ty)&1)g.fillRect(tx*T,ty*T,T,T);}}
}
function drawGate(g?:any,tx?:any,ty?:any){
  const X=tx*T,Y=ty*T,pulse=.6+.4*Math.sin(clock*4+ty);
  g.globalAlpha=.35*pulse;g.fillStyle='#ff5d73';g.fillRect(X+4,Y-14,T-8,T+10);g.globalAlpha=1;
  ink(g,3);rr(g,X+2,Y-18,T-4,8,3,'#6b6f85');
  for(let i=0;i<3;i++){rr(g,X+8+i*13,Y-12,6,T+8,3,vg(g,Y-12,Y+T,'#9aa7bf'));}
  if(ty===GATE_ROWS[1]){circ(g,X+T/2,Y+8,9,'#ffcc2e');rr(g,X+T/2-3,Y+6,6,8,2,INK,true);}
}
function drawBushes(g?:any,x0?:any,y0?:any,x1?:any,y1?:any){
  const tiles=[];
  for(let ty=Math.max(0,y0);ty<=Math.min(GH-1,y1);ty++)for(let tx=Math.max(0,x0);tx<=Math.min(GW-1,x1);tx++)if(grid[ty][tx]==='B')tiles.push([tx,ty]);
  if(!tiles.length)return;
  const blobs=[[12,6,17],[36,4,17],[24,22,19],[8,30,14],[40,30,14],[24,40,13]];
  const alphaFor=(tx,ty)=>{const cx=tx*T+T/2,cy=ty*T+T/2;return (!P.dead&&P.inBush&&Math.hypot(cx-P.x,cy-P.y)<120)?.42:1;};
  for(const pass of [0,1,2,3]){
    for(const [tx,ty] of tiles){
      g.globalAlpha=alphaFor(tx,ty);
      const X=tx*T,Y=ty*T-12,sw=Math.sin(clock*1.6+tx*1.3+ty)*1.3;
      for(const b of blobs){
        g.beginPath();
        if(pass===0){g.fillStyle=INK;g.arc(X+b[0]+sw,Y+b[1],b[2]+3.2,0,7);}
        else if(pass===1){const th=themeAtTx(tx);g.fillStyle=lt(th.bush,-.2);g.arc(X+b[0]+sw,Y+b[1]+2,b[2],0,7);}
        else if(pass===2){g.fillStyle=themeAtTx(tx).bush;g.arc(X+b[0]+sw,Y+b[1]-1,b[2]-2,0,7);}
        else{g.fillStyle=themeAtTx(tx).bushL;g.arc(X+b[0]-5+sw,Y+b[1]-7,b[2]*.36,0,7);}
        g.fill();
      }
    }
  }
  g.globalAlpha=1;
}
function hpBar(g?:any,x?:any,y?:any,w?:any,hp?:any,max?:any,col?:any,num?:any){
  rr(g,x-w/2-2.5,y-6.5,w+5,13,6.5,INK,true);
  const f=Math.max(0,hp/max);
  if(f>0){rr(g,x-w/2,y-4,w*f,8,4,col,true);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x-w/2+2,y-3.5,Math.max(0,w*f-4),2.5);}
  if(num)txt(g,String(Math.ceil(hp)),x,y-15,15,'#fff');
}
function bubble(g?:any,x?:any,y?:any,s?:any){
  g.font=F(14);const w=g.measureText(s).width+18;
  ink(g,2.5);rr(g,x-w/2,y-28,w,24,10,'#fff');
  g.beginPath();g.moveTo(x-5,y-5);g.lineTo(x,y+3);g.lineTo(x+5,y-5);g.fillStyle='#fff';g.fill();
  g.fillStyle=INK;g.textAlign='center';g.textBaseline='middle';g.fillText(s,x,y-16);ink(g);
}
function renderLevel(){
  const sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;
  const ox=W/2-cam.x*SC+sx,oy=H/2-cam.y*SC+sy;
  ctx.setTransform(DPR*SC,0,0,DPR*SC,DPR*ox,DPR*oy);
  const x0=Math.floor((cam.x-W/2/SC)/T)-1,x1=Math.floor((cam.x+W/2/SC)/T)+1,y0=Math.floor((cam.y-H/2/SC)/T)-1,y1=Math.floor((cam.y+H/2/SC)/T)+2;
  if(WORLD.on)theme=themeAtTx(Math.floor(cam.x/T));
  drawOutside(ctx,x0,y0,x1,y1);
  if(groundCv)ctx.drawImage(groundCv,0,0);
  drawWater(ctx,x0,y0,x1,y1);
  if(WORLD.on&&WORLD.prog>0){const gx=WORLD.prog*AW*T;if(gx>cam.x-W/SC&&gx<cam.x+W/SC){ctx.globalAlpha=.55+.35*Math.sin(clock*5);ctx.fillStyle='#fff6b0';
    for(let k=-3;k<3;k++){const x=gx+k*T*.8+((clock*60)%(T*.8));ctx.beginPath();ctx.moveTo(x,T*6.1);ctx.lineTo(x+16,T*6.5);ctx.lineTo(x,T*6.9);ctx.lineTo(x+6,T*6.5);ctx.closePath();ctx.fill();}ctx.globalAlpha=1;}}
  const am=state==='play'&&!P.dead?aimingNow():null;
  if(am){
    ctx.save();ctx.translate(P.x,P.y);ctx.rotate(am.a);
    const atk=myCh().atk,col=am.sup?'rgba(255,204,46,.4)':P.ammo>=1?'rgba(255,255,255,.32)':'rgba(255,93,115,.34)';ctx.fillStyle=col;ctx.strokeStyle=col;
    if(atk==='rivet'){
      if(am.sup){ctx.beginPath();ctx.arc(0,0,280,0,7);ctx.fill();ctx.fillRect(18,-14,412,28);}
      else{const R=myRange();ctx.beginPath();ctx.moveTo(18,-8);ctx.lineTo(R,-30);ctx.lineTo(R,30);ctx.lineTo(18,8);ctx.closePath();ctx.fill();}
    } else if(atk==='snipe'){
      const R=am.sup?myRange()+80:myRange();for(const o of (am.sup?[-.07,0,.07]:[0])){ctx.save();ctx.rotate(o);ctx.fillRect(20,-4,R-20,8);ctx.restore();}
    } else if(atk==='rocket'){
      for(const o of (am.sup?[-.16,0,.16]:[0])){ctx.save();ctx.rotate(o);ctx.fillRect(20,-9,myRange()-20,18);ctx.beginPath();ctx.arc(myRange(),0,(am.sup?88:62)*myW().am,0,7);ctx.lineWidth=3;ctx.stroke();ctx.restore();}
    } else if(atk==='lob'){
      const d=am.d||RANGE.lob;ctx.setLineDash([6,10]);ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(20,0);ctx.quadraticCurveTo(d/2,-d*.35,d,0);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(d,0,(am.sup?135:72+(myW().n>1?40:0))*myW().am,0,7);ctx.fill();
    }
    ctx.restore();
  }
  const ringP=(x,y,c)=>{ctx.beginPath();ctx.ellipse(x,y+2,20,9,0,0,7);ctx.strokeStyle=c;ctx.lineWidth=3;ctx.stroke();};
  if(!P.dead)ringP(P.x,P.y,'#5ee04a');
  for(const k in RP){const r=RP[k];if(r.sc==='play'&&r.run===runId&&!r.dead)ringP(r.x,r.y,'#4cb7ff');}
  for(const g of drops){shadow(ctx,g.x,g.y,7);ink(ctx,2);gearShape(ctx,g.x,g.y-10-g.z-Math.abs(Math.sin(clock*4+g.x))*3,6,'#ffcc2e');}
  ink(ctx);
  const list=[];
  for(let ty=Math.max(0,y0);ty<=Math.min(GH-1,y1);ty++)for(let tx=Math.max(0,x0);tx<=Math.min(GW-1,x1);tx++){const c=grid[ty][tx];if(c==='#')list.push({y:ty*T+T-2,w:[tx,ty]});else if(c==='G')list.push({y:ty*T+T-2,gate:[tx,ty]});}
  for(const e of enemies){const d=Math.hypot(e.x-P.x,e.y-P.y);if(!hiddenE(e,d))list.push({y:e.y,e});}
  if(!P.dead)list.push({y:P.y,p:1});
  for(const k in RP){const r=RP[k];if(r.sc==='play'&&r.run===runId&&!r.dead){const d=Math.hypot(r.x-P.x,r.y-P.y);if(!(tileAt(r.x,r.y)==='B'&&d>130))list.push({y:r.y,r});}}
  list.sort((a,b)=>a.y-b.y);
  for(const o of list){
    if(o.w)ctx.drawImage(WORLD.on?WORLD.wallCvs[clamp(Math.floor(o.w[0]/AW),0,LV.length-1)]:wallCv,o.w[0]*T-4,o.w[1]*T-4-18);
    else if(o.gate)drawGate(ctx,o.gate[0],o.gate[1]);
    else if(o.e){shadow(ctx,o.e.x,o.e.y,o.e.r);
      if(o.e.type==='X'&&o.e.st==='windup'){ctx.save();ctx.translate(o.e.x,o.e.y);ctx.rotate(NET.isHost?o.e.dashA:o.e.face);ctx.fillStyle='rgba(255,59,85,.28)';ctx.fillRect(0,-o.e.r,330,o.e.r*2);ctx.restore();}
      drawBot(ctx,o.e,clock,o.e.face);}
    else if(o.p){shadow(ctx,P.x,P.y,P.r);drawHero(ctx,P.x,P.y,P.aim,clock,P.mv,P.fl,myCh());}
    else if(o.r){shadow(ctx,o.r.x,o.r.y,16);drawHero(ctx,o.r.x,o.r.y,o.r.aim,clock,o.r.mv,o.r.fl,o.r.chObj||CH[o.r.ch]||CH[0]);}
  }
  ctx.globalCompositeOperation='lighter';
  const bz=b=>b.lob?Math.sin(Math.PI*clamp(b.trav/b.range,0,1))*Math.min(150,b.range*.35):0;
  for(const b of bullets){const z=bz(b),c=b.team==='p'?(b.kind===2||b.kind===3?'rgba(126,230,255,.75)':b.kind===4?'rgba(120,200,255,.5)':'rgba(255,220,80,.7)'):(b.kind?'rgba(200,90,255,.7)':'rgba(255,110,70,.7)');
    const gr=ctx.createRadialGradient(b.x,b.y-14-z,0,b.x,b.y-14-z,b.r*2.6);gr.addColorStop(0,c);gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(b.x,b.y-14-z,b.r*2.6,0,7);ctx.fill();}
  ctx.globalCompositeOperation='source-over';
  for(const b of bullets){
    if(b.team==='p'){
      if(b.kind===2||b.kind===3){ctx.save();ctx.translate(b.x,b.y-14);ctx.rotate(b.a);const L=b.kind===3?44:34;ctx.fillStyle='rgba(126,230,255,.45)';ctx.fillRect(-L,-3,L,6);ink(ctx,2.5);rr(ctx,-10,-3.5,22,7,3.5,b.col||'#7ee6ff');ctx.fillStyle='#fff';ctx.fillRect(-4,-1.5,12,3);ctx.restore();}
      else if(b.kind===4){const z=bz(b);shadow(ctx,b.x,b.y-2,7);ink(ctx,2.5);circ(ctx,b.x,b.y-14-z,9,rg(ctx,b.x,b.y-14-z,9,b.col||'#4cb7ff'));ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.arc(b.x-3,b.y-18-z,2.5,0,7);ctx.fill();}
      else if(b.kind===5){ctx.save();ctx.translate(b.x,b.y-14);ctx.rotate(b.a);ink(ctx,2.5);rr(ctx,-12,-5,22,10,5,'#e9ecf5');rr(ctx,8,-5,8,10,4,b.col||'#ff5d73');ctx.fillStyle='#ffcc2e';ctx.beginPath();ctx.moveTo(-12,-4);ctx.lineTo(-20-Math.random()*6,0);ctx.lineTo(-12,4);ctx.fill();ctx.restore();}
      else{ctx.save();ctx.translate(b.x,b.y-14);ctx.rotate(b.a);ink(ctx,2.5);rr(ctx,-10,-4,20,8,4,b.col||(b.kind?'#ff7a2f':'#ffe14d'));ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(-6,-2.5,10,2);ctx.restore();}}
    else{ink(ctx,2.5);circ(ctx,b.x,b.y-14,b.r,b.kind?'#c45cff':'#ff6a4d');circ(ctx,b.x-2,b.y-16,b.r*.35,'#fff',true);}
  }
  ink(ctx);
  drawBushes(ctx,x0,y0,x1,y1);
  for(const p of parts){ctx.globalAlpha=Math.max(0,p.life/p.max);
    if(p.bolt){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.c;ctx.fillRect(-5,-2.5,10,5);ctx.restore();}
    else{ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();}}
  for(const r of rings){const f=1-r.life/r.max;ctx.globalAlpha=1-f;ctx.strokeStyle=r.c;ctx.lineWidth=4*(1-f)+1;ctx.beginPath();ctx.ellipse(r.x,r.y,Math.max(1,r.r*f),Math.max(1,r.r*f*.55),0,0,7);ctx.stroke();}
  ctx.globalAlpha=1;
  for(const e of enemies){const d=Math.hypot(e.x-P.x,e.y-P.y);if(hiddenE(e,d))continue;
    const top=e.type==='X'?126:e.type==='t'?54:52;
    if(e.type!=='X')hpBar(ctx,e.x,e.y-top,46,e.hp,e.max,'#ff4d5e',true);
    if(e.say)bubble(ctx,e.x,e.y-top-(e.type==='X'?0:22),e.say.t);}
  for(const k in RP){const r=RP[k];if(r.sc!=='play'||r.run!==runId||r.dead)continue;hpBar(ctx,r.x,r.y-64,48,r.hp,r.mh||3600,'#4cb7ff',false);txt(ctx,r.nm||'Jogador',r.x,r.y-80,13,'#fff');}
  if(!P.dead){
    hpBar(ctx,P.x,P.y-64,52,P.hp,P.max,'#5ee04a',true);
    txt(ctx,save.name||myCh().name,P.x,P.y-94,13,'#fff');
    for(let i=0;i<3;i++){const f=clamp(P.ammo-i,0,1),bx=P.x-25+i*17;
      rr(ctx,bx,P.y+12,16,7,3,INK,true);if(f>0)rr(ctx,bx+1.5,P.y+13.5,13*f,4,2,P.noAmmo>0?'#ff5d73':'#ff9a2f',true);}
  }
  for(const t of texts){const k=t.life>.75?1+(t.life-.75)*3:1;ctx.globalAlpha=Math.min(1,t.life*2.5);txt(ctx,t.s,t.x,t.y,(t.big?22:16)*k,t.c);}
  ctx.globalAlpha=1;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(!VIG){VIG=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.45,W/2,H/2,Math.max(W,H)*.75);VIG.addColorStop(0,'rgba(20,10,50,0)');VIG.addColorStop(1,'rgba(20,10,50,.38)');}
  ctx.fillStyle=VIG;ctx.fillRect(0,0,W,H);
  if(superFlash>0){ctx.fillStyle='rgba(255,240,180,'+(superFlash*1.4)+')';ctx.fillRect(0,0,W,H);}
  if(state==='play')drawHUD();
}
function drawHUD(){
  const g=ctx;ink(g);
  const top=10+INS.t,L=curL();
  if(cur===-1){if(WAIT.ct>0){const k=Math.ceil(WAIT.ct);txt(g,String(k),W/2,H*.42,90,'#ffe14d');txt(g,'Começando…',W/2,H*.42+60,20,'#fff');}}
  else if(WV.on){txt(g,WV.wave?'Onda '+WV.wave:'Prepare-se!',W/2,top+16,24,'#fff');
    const left=enemies.length+WV.queue.length;txt(g,WV.state==='break'?(WV.wave?'Próxima onda em '+Math.ceil(Math.max(0,WV.t)):'A primeira onda vem aí'):'Robôs: '+left,W/2,top+40,15,WV.state==='break'?'#5ee04a':'#ffcc2e');
    txt(g,'Recorde: '+(save.bestWave|0),W-70-INS.r,top+70,13,'#fff');
    if(WV.flash>0){g.globalAlpha=Math.min(1,WV.flash);txt(g,WV.wave%10===0?'ONDA '+WV.wave+' · CHEFE!':'ONDA '+WV.wave,W/2,H*.36,Math.min(46,W/12),WV.wave%10===0?'#ff5d73':'#ffe14d');g.globalAlpha=1;}}
  else{txt(g,L.name,W/2,top+14,20,'#fff');
  const n=WORLD.on?areaEnemies(cur):enemies.length;
  if(WORLD.on){for(let i=0;i<LV.length;i++){const x=W/2-48+i*24,done=i<WORLD.prog,here=i===areaOf(P.x);ink(g,2.5);circ(g,x,top+60,here?7:5,done?'#5ee04a':here?'#ffcc2e':'rgba(255,255,255,.5)');if(i<LV.length-1){g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=2;g.beginPath();g.moveTo(x+8,top+60);g.lineTo(x+16,top+60);g.stroke();}}ink(g);}
  txt(g,n?('Robôs: '+n):'Área limpa!',W/2,top+38,15,n?'#ffcc2e':'#5ee04a');}
  ink(g,2);gearShape(g,24+INS.l,top+18,8,'#ffcc2e');txt(g,String(gearsRun),40+INS.l,top+19,18,'#fff','left');
  if(NET.game&&cur!==-1)txt(g,'Jogadores: '+NET.count+'  ·  Dificuldade '+'★'.repeat(diffN),24+INS.l,top+44,13,'#fff','left');
  const boss=enemies.find(e=>e.type==='X');
  if(boss){const w=Math.min(W*.4,380),y=top+60;
    txt(g,WV.on?'Capitão Ferrugem · nível '+Math.max(1,Math.floor(WV.wave/10)):'Capitão Ferrugem',W/2,y,15,'#fff');
    rr(g,W/2-w/2-3,y+10,w+6,18,9,INK,true);rr(g,W/2-w/2,y+13,w*Math.max(0,boss.hp/boss.max),12,6,'#c45cff',true);}
  if(WORLD.on&&WORLD.prog>0&&areaOf(P.x)<WORLD.prog&&!P.dead){const a=.6+.4*Math.sin(clock*6);g.globalAlpha=a;txt(g,'Siga  ›››',W-130-INS.r,H*.42,26,'#ffe14d');g.globalAlpha=1;}
  if(WORLD.capQ.length){const [sp,t]=WORLD.capQ[0];const nm=sp==='tita'?myCh().full:NAMES[sp];const w=Math.min(W-40,560),x=W/2-w/2,y=top+76;
    g.font=F(14,'body');const words=String(t).split(' ');const lines=[];let ln='';for(const wd of words){const tt=ln?ln+' '+wd:wd;if(g.measureText(tt).width>w-24){lines.push(ln);ln=wd;}else ln=tt;}lines.push(ln);
    ink(g,3);rr(g,x,y,w,30+lines.length*18,12,'rgba(255,255,255,.95)');txt(g,nm,x+12,y+13,14,'#ff5d73','left');
    g.fillStyle=INK;g.font=F(14,'body');g.textAlign='left';g.textBaseline='middle';lines.forEach((l,i)=>g.fillText(l,x+12,y+31+i*18));}
  if(banner>0&&cur!==-1&&!WV.on){g.globalAlpha=Math.min(1,banner);if(WORLD.on)txt(g,'Capítulo '+(cur+1),W/2,H*.29,18,'#ffe14d');txt(g,L.boss?'Derrote o Capitão!':'Derrote todos os robôs!',W/2,H*.34,Math.min(34,W/16),'#fff');g.globalAlpha=1;}
  if(P.dead&&(cur===-1||NET.game&&phase==='play'))txt(g,'Voltando em '+Math.ceil(Math.max(0,P.respT))+'…',W/2,H*.45,28,'#fff');
  if(lastInput==='touch'){
    if(touch.move){const s=touch.move;g.lineWidth=3;g.strokeStyle='rgba(255,255,255,.6)';g.fillStyle='rgba(29,20,54,.25)';g.beginPath();g.arc(s.ox,s.oy,58,0,7);g.fill();g.stroke();
      const dx=s.x-s.ox,dy=s.y-s.oy,d=Math.hypot(dx,dy),mm=Math.min(d,58);ink(g);const kx=s.ox+(d?dx/d*mm:0),ky=s.oy+(d?dy/d*mm:0);circ(g,kx,ky,26,rg(g,kx,ky,26,'#22c7c7'));}
    const f=fireBtn(),fa=touch.fire;
    ink(g);
    circ(g,f.x,f.y,f.r,fa?'rgba(255,93,115,.55)':'rgba(29,20,54,.45)');
    for(let i=0;i<3;i++){const fr=clamp(P.ammo-i,0,1);if(fr<=0)continue;g.beginPath();g.arc(f.x,f.y,f.r-6,-Math.PI/2+i*2.094+.1,-Math.PI/2+i*2.094+.1+1.89*fr);g.strokeStyle='#ff9a2f';g.lineWidth=6;g.stroke();}
    ink(g);
    let kx=f.x,ky=f.y;
    if(fa&&fa.dragged){const dx=fa.x-fa.sx,dy=fa.y-fa.sy,d=Math.hypot(dx,dy)||1,mm=Math.min(d,f.r*.7);kx=f.x+dx/d*mm;ky=f.y+dy/d*mm;}
    circ(g,kx,ky,f.r*.5,rg(g,kx,ky,f.r*.5,P.ammo>=1?'#ff5d73':'#8a7a9a'));
    g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(kx,ky,9,0,7);g.moveTo(kx-15,ky);g.lineTo(kx-5,ky);g.moveTo(kx+5,ky);g.lineTo(kx+15,ky);g.moveTo(kx,ky-15);g.lineTo(kx,ky-5);g.moveTo(kx,ky+5);g.lineTo(kx,ky+15);g.stroke();ink(g);
    const s=superBtn(),ready=P.sup>=1;
    if(ready){g.globalAlpha=.35+.25*Math.sin(clock*6);circ(g,s.x,s.y,s.r+10,'#ffe14d',true);g.globalAlpha=1;}
    circ(g,s.x,s.y,s.r,ready?rg(g,s.x,s.y,s.r,'#ffcc2e'):'rgba(29,20,54,.55)');
    if(!ready&&P.sup>0){g.beginPath();g.moveTo(s.x,s.y);g.arc(s.x,s.y,s.r-4,-Math.PI/2,-Math.PI/2+Math.PI*2*P.sup);g.closePath();g.fillStyle='rgba(255,204,46,.75)';g.fill();}
    star(g,s.x,s.y,14,ready?'#fff':'rgba(255,255,255,.7)');
    txt(g,'SUPER',s.x,s.y+s.r+13,12,ready?'#ffe14d':'#fff');
  } else {
    const ready=P.sup>=1,x=W-100-INS.r,y=H-40-INS.b;
    ink(g);rr(g,x-70,y-16,140,32,10,'rgba(29,20,54,.6)');
    if(P.sup>0)rr(g,x-66,y-12,132*P.sup,24,8,ready?'#ffcc2e':'#b08a1f',true);
    txt(g,ready?'SUPER: Espaço':'Super',x,y,14,'#fff');
  }
  if(tutT>0){g.globalAlpha=Math.min(1,tutT);
    if(lastInput==='touch'){
      txt(g,'Arraste aqui para andar',W*.24,H-70-INS.b,17,'#fff');
      const f=fireBtn();txt(g,'Toque: tiro rápido',f.x-30,f.y-f.r-40,15,'#fff');txt(g,'Segure: mirar',f.x-30,f.y-f.r-20,15,'#ffe14d');
    } else txt(g,'WASD para andar · mouse para mirar · clique para atirar',W/2,H-80-INS.b,16,'#fff');
    g.globalAlpha=1;}
}

/* ---------- mapa da ilha ---------- */
const MW=1000,MH=560;
const WP=[[120,430,0],[200,470],[300,420],[340,350,1],[300,280],[400,220],[500,250,2],[600,300],[680,360,3],[780,320],[820,230],[870,150,4]];
const MS=[],NODE_S=[];
(function buildPath(){
  const pts=WP.map(p=>[p[0],p[1]]);let len=0;
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    if(WP[i][2]!==undefined)NODE_S[WP[i][2]]=len;
    for(let k=0;k<16;k++){const t=k/16,t2=t*t,t3=t2*t;
      const x=.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3);
      const y=.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3);
      if(MS.length){const q=MS[MS.length-1];len+=Math.hypot(x-q[0],y-q[1]);}MS.push([x,y,len]);}
  }
  const last=pts[pts.length-1],q=MS[MS.length-1];len+=Math.hypot(last[0]-q[0],last[1]-q[1]);MS.push([last[0],last[1],len]);NODE_S[4]=len;
})();
function pathAt(s?:any){s=clamp(s,0,MS[MS.length-1][2]);let i=1;while(i<MS.length-1&&MS[i][2]<s)i++;const a=MS[i-1],b=MS[i];const f=b[2]>a[2]?(s-a[2])/(b[2]-a[2]):0;return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,Math.atan2(b[1]-a[1],b[0]-a[0])];}
const MAP={s:0,target:0,node:0,walking:false,hostS:null,hostNode:0,ul:1,done:[],dir:1};
let mapView={k:1,ox:0,oy:0};
function nodeXY(i?:any){const w=WP.find(p=>p[2]===i);return [w[0],w[1]];}
function unlockedCount(){return NET.isHost?save.unl:MAP.ul;}
function doneList(){return NET.isHost?save.done:MAP.done;}
function mapTap(lx?:any,ly?:any){
  const mx=(lx-mapView.ox)/mapView.k,my=(ly-mapView.oy)/mapView.k;
  for(let i=0;i<5;i++){const [x,y]=nodeXY(i);if(Math.hypot(mx-x,my-(y-24))<52){
    if(!NET.isHost){toast('Quem escolhe a fase é o anfitrião da sala.');return;}
    if(i>=unlockedCount()){toast('Termine o capítulo anterior para liberar este.');return;}
    if(i===MAP.node&&!MAP.walking){mapEnter();return;}
    MAP.target=i;MAP.walking=true;updateMapCard();return;}}
}
function mapStep(d?:any){if(!NET.isHost)return;const t=clamp((MAP.walking?MAP.target:MAP.node)+d,0,unlockedCount()-1);MAP.target=t;MAP.walking=true;updateMapCard();}
function mapEnter(){if(!NET.isHost||MAP.walking||state!=='map')return;startChapterHost(MAP.node);}
function updMap(dt?:any){
  if(NET.isHost){
    if(MAP.walking){const ts=NODE_S[MAP.target],d=ts-MAP.s,st=260*dt;MAP.dir=Math.sign(d)||MAP.dir;
      if(Math.abs(d)<=st){MAP.s=ts;MAP.walking=false;MAP.node=MAP.target;updateMapCard();}else MAP.s+=Math.sign(d)*st;}
  } else if(MAP.hostS!=null){const d=MAP.hostS-MAP.s;if(Math.abs(d)>1)MAP.dir=Math.sign(d);MAP.s+=d*Math.min(1,dt*6);MAP.node=MAP.hostNode;}
  updFx(dt);
}
function drawNodeIcon(g?:any,i?:any,x?:any,y?:any,lock?:any,t?:any){
  ink(g,3);
  if(i===0){const lit=doneList().length>=5;rr(g,x-8,y-46,16,40,4,'#fff');g.fillStyle='#ff5d73';g.fillRect(x-6.5,y-36,13,7);g.fillRect(x-6.5,y-20,13,7);rr(g,x-11,y-56,22,12,5,lit?'#ffe14d':'#9aa3b8');
    if(lit){g.globalAlpha=.25+.15*Math.sin(t*3);g.fillStyle='#fff6b0';g.beginPath();g.moveTo(x,y-50);g.lineTo(x+140,y-90);g.lineTo(x+140,y-10);g.fill();g.globalAlpha=1;}}
  else if(i===1){ell(g,x,y-12,6,10,'#7a4f2a');circ(g,x-10,y-34,14,'#3fbf55');circ(g,x+10,y-34,14,'#3fbf55');circ(g,x,y-46,15,'#5fd35f');}
  else if(i===2){rr(g,x-4,y-50,8,46,3,'#ffcc2e');g.beginPath();g.moveTo(x,y-48);g.lineTo(x+28,y-48);g.stroke();g.beginPath();g.moveTo(x+24,y-48);g.lineTo(x+24,y-30);g.lineWidth=2;g.stroke();ink(g);rr(g,x+18,y-30,12,8,2,'#ef5350');}
  else if(i===3){rr(g,x-20,y-30,40,26,4,'#a9b1c2');rr(g,x+6,y-54,10,28,2,'#6b6f85');g.fillStyle='#ffcc2e';g.fillRect(x-16,y-22,8,8);g.fillRect(x-4,y-22,8,8);
    g.globalAlpha=.6;circ(g,x+11+Math.sin(t*2)*3,y-64-(t*12%14),6,'#e8eaf2',true);g.globalAlpha=1;}
  else{g.beginPath();g.moveTo(x-30,y-16);g.lineTo(x+30,y-16);g.lineTo(x+20,y-2);g.lineTo(x-20,y-2);g.closePath();g.fillStyle='#8b643f';g.fill();g.stroke();
    g.beginPath();g.moveTo(x,y-16);g.lineTo(x,y-62);g.stroke();g.beginPath();g.moveTo(x+2,y-60);g.lineTo(x+26,y-40);g.lineTo(x+2,y-24);g.closePath();g.fillStyle='#fff';g.fill();g.stroke();
    g.fillStyle='#231a3a';g.fillRect(x-12,y-64,12,8);}
  if(lock){g.globalAlpha=.55;circ(g,x,y-28,26,'#2d1d70',true);g.globalAlpha=1;ink(g,3);rr(g,x-9,y-30,18,14,3,'#ffcc2e');g.beginPath();g.arc(x,y-30,6,Math.PI,0);g.stroke();}
}
const ISLE=[[160,430,150,95],[320,350,120,110],[480,250,150,100],[650,330,150,95],[830,200,130,110],[560,380,110,70],[260,470,110,60],[760,280,110,80]];
function renderMap(){
  const g=ctx;g.setTransform(DPR,0,0,DPR,0,0);
  const sea=g.createLinearGradient(0,0,0,H);sea.addColorStop(0,'#4fd0f0');sea.addColorStop(1,'#2a8fc8');g.fillStyle=sea;g.fillRect(0,0,W,H);
  const k=Math.min(W/MW,(H-40)/MH)*1.02;mapView={k,ox:(W-MW*k)/2,oy:(H-MH*k)/2+12};
  g.setTransform(DPR*k,0,0,DPR*k,DPR*mapView.ox,DPR*mapView.oy);
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=3;g.lineCap='round';g.beginPath();
  for(let i=0;i<26;i++){const x=(i*173)%1100-50,y=(i*97)%600-20+Math.sin(clock+i)*6;g.moveTo(x,y);g.quadraticCurveTo(x+14,y-8,x+28,y);}g.stroke();
  for(const pass of [0,1,2]){for(const b of ISLE){g.beginPath();g.ellipse(b[0],b[1]+(pass===0?14:0),b[2]+(pass===0?14:pass===1?8:-6),b[3]+(pass===0?10:pass===1?6:-8),0,0,7);
    g.fillStyle=pass===0?'rgba(255,255,255,.45)':pass===1?'#f7d98f':'#8ad960';g.fill();}}
  g.fillStyle='rgba(60,140,50,.35)';for(let i=0;i<40;i++){const b=ISLE[i%ISLE.length];const x=b[0]+Math.cos(i*2.3)*b[2]*.6,y=b[1]+Math.sin(i*1.7)*b[3]*.5;g.beginPath();g.arc(x,y,3,0,7);g.fill();}
  [[90,380],[230,500],[580,200],[720,400],[930,250]].forEach(([x,y],i)=>{g.lineCap='round';g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+4,y-18,x+2,y-34);g.lineWidth=6;g.strokeStyle='#7a4f2a';g.stroke();
    for(let j=0;j<5;j++){const a=-Math.PI/2+(j-2)*.6+Math.sin(clock*1.5+i)*.05;g.beginPath();g.moveTo(x+2,y-34);g.quadraticCurveTo(x+2+Math.cos(a)*14,y-40+Math.sin(a)*14,x+2+Math.cos(a)*24,y-30+Math.sin(a)*24);g.lineWidth=5;g.strokeStyle='#2fae4c';g.stroke();}});
  const ul=unlockedCount();
  g.lineCap='round';g.lineWidth=14;g.strokeStyle='rgba(120,70,30,.35)';g.beginPath();MS.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();
  g.lineWidth=6;g.strokeStyle='#fff6dc';g.setLineDash([10,12]);g.beginPath();
  const maxS=NODE_S[Math.min(4,ul-1)];let started=false;for(const p of MS){if(p[2]>maxS+1)break;if(!started){g.moveTo(p[0],p[1]);started=true;}else g.lineTo(p[0],p[1]);}g.stroke();g.setLineDash([]);
  const dn=doneList();
  for(let i=0;i<5;i++){const [x,y]=nodeXY(i),lock=i>=ul;
    ink(g,3.5);ell(g,x,y+4,34,14,INK,true);ell(g,x,y,32,13,lock?'#9a90c4':dn.includes(i)?'#5ee04a':'#ffcc2e');
    drawNodeIcon(g,i,x,y,lock,clock);
    txt(g,String(i+1),x-36,y-6,18,'#fff');
    if(dn.includes(i))star(g,x+36,y-8,10,'#ffe14d');
  }
  const [px,py]=pathAt(MAP.s);
  const walking=NET.isHost?MAP.walking:(MAP.hostS!=null&&Math.abs(MAP.hostS-MAP.s)>2);
  const crew=[myCh()];if(NET.game)for(const k in RP)crew.push(RP[k].chObj||CH[RP[k].ch]||CH[0]);const n=Math.min(5,crew.length);
  for(let j=n-1;j>=0;j--){const [qx,qy]=j?pathAt(MAP.s-j*26*MAP.dir):[px,py];
    g.save();g.translate(qx,qy);g.scale(1.25,1.25);shadow(g,0,0,14);drawHero(g,0,0,MAP.dir>=0?0:Math.PI,clock+j*.3,walking,0,crew[j]);g.restore();}
  if(walking&&Math.random()<.3)parts.push({x:px+(Math.random()-.5)*10,y:py+2,vx:0,vy:-10,life:.4,max:.4,c:'rgba(255,255,255,.6)',r:4});
  for(const p of parts){g.globalAlpha=Math.max(0,p.life/p.max);g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill();}g.globalAlpha=1;
  g.globalAlpha=.85;for(let i=0;i<4;i++){const x=((clock*14+i*290)%1300)-150,y=60+(i*120)%300;ell(g,x,y,40,16,'#fff',true);ell(g,x+26,y-8,28,14,'#fff',true);ell(g,x-24,y-4,22,12,'#fff',true);}g.globalAlpha=1;
  g.setTransform(DPR,0,0,DPR,0,0);
}
function updateMapCard(){emit();}
function mapCardInfo(){
  const i=MAP.walking?MAP.target:MAP.node,L=LV[i];
  const done=doneList().includes(i);
  return {n:'Capítulo '+(i+1),t:L.name,s:!NET.isHost?'O anfitrião escolhe a fase':MAP.walking?'Andando…':done?'Concluído':'Disponível',
    go:NET.isHost,goOff:MAP.walking,gears:'Engrenagens: '+save.gears,invite:!!NET.game,friends:friendsOn(),friendsLabel:friendsLabel(),
    room:NET.game&&NET.code?'Sala '+NET.code.toUpperCase()+' · '+NET.count+'/5':null};
}
function showMap(autoNext:boolean){
  hideAll();state='map';phase='map';show('mapUI');bullets=[];parts=[];
  if(NET.isHost){MAP.node=clamp(MAP.node,0,save.unl-1);MAP.s=NODE_S[MAP.node];MAP.walking=false;
    if(autoNext&&MAP.node+1<save.unl&&MAP.node<4){MAP.target=MAP.node+1;MAP.walking=true;}}
  updateMapCard();
}
const SITE='https://claude-jogo-4.vercel.app/';
function shareText(t:string,okMsg:string,failMsg:string){
  pf.share(t).then(r=>{if(r==='copied')toast(okMsg);else if(r==='fail')toast(failMsg);},()=>toast(failMsg));
}
function inviteRoom(){if(!NET.code)return;const C=NET.code.toUpperCase();
  shareText('Bora jogar Ilha do Coral comigo! Código da sala: '+C+'\n'+SITE+'?sala='+C,'Convite copiado! Código: '+C,'Código da sala: '+C);}

/* ---------- menu ---------- */
const HOME:any={face:.35,drag:null,hop:0,vel:0};
function homeDown(x:number,y:number){HOME.drag={x,y,f:HOME.face,t:clock};}
function homeMove(x:number,y:number){if(!HOME.drag)return;const d=ROT?(y-HOME.drag.y):(x-HOME.drag.x);const nf=HOME.drag.f+d*.02;HOME.vel=nf-HOME.face;HOME.face=nf;}
function homeUp(){if(HOME.drag&&clock-HOME.drag.t<.25&&Math.abs(HOME.face-HOME.drag.f)<.05)HOME.hop=.5;HOME.drag=null;}
function homeCancel(){HOME.drag=null;}
function drawMenuScene(g:Ctx2D){paintMenuScene(g,HOME,clock,myCh());}
function drawMenuBg(g:Ctx2D,w:number,h:number){paintMenuBg(g,w,h);}
function friendsLabel(){const n=FR.reqs.length;return 'Amigos'+(n?' ('+n+')':'');}
function menuInfo(){
  const hc=myCh(),L=charLvl(hc.id);
  return {lvl:L.l,name:save.name||'Jogador',xp:L.max?100:Math.round(L.x/L.need*100),
    xpT:'Nível '+L.l+' de '+hc.name+' · '+(L.max?'máximo':L.x+' / '+L.need+' XP')+' · '+L.u+'/15 armas',
    arms:(save.newW&&save.newW[hc.id])?'Armas (nova!)':'Armas',
    wins:save.done.length,kills:save.kills|0,gears:save.gears|0,wave:save.bestWave|0,
    hero:hc.full,role:hc.role,friends:friendsOn(),friendsLabel:friendsLabel(),
    sfx:save.sfx!==false,mus:save.mus!==false,
    hint:isTouch?'Polegar esquerdo anda. Botão vermelho atira: toque rápido acerta sozinho, segure e arraste para mirar.':'WASD para andar, mouse para mirar, clique para atirar, Espaço para o super, Esc para pausar.'};
}
function showMenu(){updSoundBtns();state='menu';hideAll();show('menu');emit();}
function hideAll(){['menu','lobby','mapUI','dlg','res','pause','friends','heroes','skin','waitUI','arsenal'].forEach(id=>show(id,false));show('pauseBtn',false);paused=false;clearInterval(typing);typing=null;dcb=null;}
function playSolo(){NET.leave();const fin=save.done.includes(LV.length-1);startChapterHost(fin?0:clamp(save.unl-1,0,LV.length-1));}
function playWaves(){NET.leave();startWavesHost();}
function openSkin(){hideAll();state='skin';show('skin');emit();}
function skinInfo(){
  const base=CH[save.ch|0],cur2=myCh();
  return {who:base.full+': escolha as cores',body:SW_BODY,hair:SW_HAIR,b:String(cur2.body).toLowerCase(),h:String(cur2.hair).toLowerCase(),
    outfit:cur2.sk==='alt'?'alt':'normal',altName:ALT[base.id].name,id:base.id};
}
function pickOutfit(k:string){const base=CH[save.ch|0];save.outfit=save.outfit||{};save.outfit[base.id]=k==='alt'?'alt':'normal';persist();toast(k==='alt'?base.name+' '+ALT[base.id].name+' equipada!':'Roupa normal equipada.');emit();}
function pickSkin(key:'b'|'h',c:string){const base=CH[save.ch|0];save.skin=save.skin||{};const sk=save.skin[base.id]=save.skin[base.id]||{};sk[key]=c;persist();emit();}
function skinReset(){if(save.skin)delete save.skin[CH[save.ch|0].id];persist();emit();}
function drawSkinPreview(g:Ctx2D){paintSkin(g,clock,myCh());}
let toastT:any=null,toastN=0;
function toast(s:string){ui.toast={s,id:++toastN};emit();clearTimeout(toastT);toastT=setTimeout(()=>{ui.toast=null;emit();},2800);}

/* ---------- diálogos ---------- */
let dq:any[]=[],di=0,dcb:any=null,typing:any=null,full='',curSpk='tita';
function drawPortrait(pg:Ctx2D){paintPortrait(pg,curSpk,clock,myCh());}
function tutText(){const ex=myCh().atk==='lob'?' Com o Zeca, quanto mais você arrasta, mais longe o balão cai.':'';return (isTouch?'O polegar esquerdo anda. O botão vermelho atira: toque rápido e o tiro vai sozinho no robô mais perto; segure e arraste para mirar.':'Use WASD pra andar, o mouse pra mirar e clique pra atirar. A munição acaba: espere a barra laranja encher.')+ex;}
function showDialog(lines:any[],cb:any,title?:string[]){
  dq=lines;di=0;dcb=cb;show('dlg');
  ui.dlg.title=title||null;
  showLine();
}
function showLine(){
  SFX.blip();
  const [spk,raw]=dq[di];curSpk=spk;full=raw==='TUTORIAL'?tutText():raw;
  const hn=myCh().name;if(hn!=='Tita')full=full.replace(/\bTita\b/g,hn).replace(/A Rebitadeira tá carregada\./,'Tô pronto pra briga.');
  ui.dlg.name=spk==='tita'?myCh().full:NAMES[spk];ui.dlg.text='';emit();
  let i=0;clearInterval(typing);
  typing=setInterval(()=>{i+=2;ui.dlg.text=full.slice(0,i);emit();if(i>=full.length){clearInterval(typing);typing=null;}},22);
}
function closeDialog(){clearInterval(typing);typing=null;show('dlg',false);const c=dcb;dcb=null;c&&c();}
function advance(){
  if(!ui.show.dlg)return;
  if(typing){clearInterval(typing);typing=null;ui.dlg.text=full;emit();return;}
  di++;if(di>=dq.length)closeDialog();else showLine();
}

/* ---------- fluxo (anfitrião ou solo) ---------- */
let runCounter=0;
function startChapterHost(i:number){
  hideAll();runId=++runCounter;WAIT.ct=0;loadWorld(i,NET.game?NET.count:1,false);state='story';phase='story';MAP.node=i;
  showDialog(LV[i].intro,()=>beginPlay(),['Capítulo '+(i+1),LV[i].name]);
}
const WAIT:any={sel:0,ct:0,mode:'s'};
function enterWait(){
  hideAll();runId=-1;phase='lobby';WAIT.ct=0;
  if(NET.isHost)WAIT.sel=clamp(WAIT.sel,0,save.unl-1);
  loadLevel(-1,1,false);state='play';show('waitUI');updWaitUI();
}
function updWaitUI(){if(!ui.show.waitUI)return;emit();}
function waitInfo(){
  const i=clamp(WAIT.sel,0,4),wv=WAIT.mode==='w',h=NET.isHost;
  return {code:NET.code?'Sala '+NET.code.toUpperCase():'',count:NET.count+'/5 jogadores',
    chN:wv?'Modo Ondas':'Começar na área '+(i+1),chT:wv?'Ondas infinitas':LV[i].name,
    mode:wv?'Ondas':'História',host:h,arrows:h&&!wv,startOff:WAIT.ct>0,start:WAIT.ct>0?'Começando…':'Começar',
    wait:h?'Treine nos alvos. Quando todo mundo chegar, toque em Começar.':'Treine nos alvos enquanto o anfitrião escolhe a fase.',
    friends:friendsOn(),friendsLabel:friendsLabel()};
}
function wPrev(){if(!NET.isHost||WAIT.ct>0)return;WAIT.sel=(WAIT.sel+save.unl-1)%save.unl;updWaitUI();}
function wNext(){if(!NET.isHost||WAIT.ct>0)return;WAIT.sel=(WAIT.sel+1)%save.unl;updWaitUI();}
function wMode(){if(!NET.isHost||WAIT.ct>0)return;WAIT.mode=WAIT.mode==='w'?'s':'w';updWaitUI();}
function wStart(){if(!NET.isHost||WAIT.ct>0)return;phase='count';WAIT.ct=3.2;updWaitUI();}
function leaveToMenu(){NET.leave();showMenu();}

/* ---------- tela de armas ---------- */
const AR={ch:0,back:'menu'};
function openArsenal(){
  AR.ch=save.ch|0;AR.back=state==='play'&&cur===-1?'wait':'menu';
  if(AR.back==='wait')show('arsenal');else{hideAll();state='arsenal';show('arsenal');}
  seenArsenal();
}
function seenArsenal(){const c=CH[AR.ch];if(save.newW&&save.newW[c.id]){delete save.newW[c.id];persist();}emit();}
function arTab(i:number){AR.ch=clamp(i,0,CH.length-1);seenArsenal();}
const totalTo=(lv:number)=>{let x=0;for(let l=1;l<lv;l++)x+=l===1?42:40+l*2;return x;};
function arsenalInfo(){
  const c=CH[AR.ch],L=charLvl(c.id);
  const e=save.wpn&&save.wpn[c.id]!=null?clamp(save.wpn[c.id],0,L.u-1):0;
  const myXp=(save.cxp&&save.cxp[c.id])|0;
  const rows=[];
  for(let i=0;i<15;i++){const w=weaponOf(c.id,i),lock=i>=L.u;
    rows.push({i,name:w.name,col:!lock&&w.col?w.col:null,lock,eq:i===e,
      info:(w.n>1?w.n+' tiros':'1 tiro')+' · dano '+Math.round(w.dm*100)+'%'+(w.pierce?' · atravessa':'')+' · alcance '+Math.round(w.rg*100)+'%'+(c.atk==='lob'||c.atk==='rocket'?' · explosão '+Math.round(w.am*100)+'%':''),
      pct:lock?Math.round(clamp(myXp/Math.max(1,totalTo(WUNL[i])),0,1)*100):0,
      btn:lock?'Nível '+WUNL[i]:i===e?'Equipada':'Equipar'});}
  return {id:c.id,sel:AR.ch,tabs:CH.map(h=>h.name+' · '+charLvl(h.id).l),
    head:c.full+' · nível '+L.l+(L.max?' (máximo)':'')+' · '+L.u+' de 15 armas liberadas'+(AR.ch!==(save.ch|0)?' · você está jogando com '+CH[save.ch|0].name:''),
    xp:L.max?100:Math.round(L.x/L.need*100),
    sub:L.max?'Nível máximo':'Faltam '+(L.need-L.x)+' XP para o nível '+(L.l+1)+'. Ganhe XP jogando com '+c.name+'.',rows};
}
function arEquip(i:number){const c=CH[AR.ch],L=charLvl(c.id);if(i>=L.u)return;const w=weaponOf(c.id,i);save.wpn=save.wpn||{};save.wpn[c.id]=i;persist();toast(w.name+' equipada em '+c.name+'!');emit();}
function arBack(){show('arsenal',false);if(AR.back==='menu')showMenu();else updWaitUI();}
function startWavesHost(){
  hideAll();runId=++runCounter;WAIT.ct=0;loadLevel(-2,NET.game?NET.count:1,false);
  WV.on=true;WV.wave=0;WV.state='break';WV.t=3;WV.queue=[];WV.spawnT=0;WV.flash=0;
  state='play';phase='play';banner=0;show('pauseBtn');SFX.beep(true);
}
function waveFree(){const out=[];for(let y=1;y<GH-1;y++)for(let x=1;x<GW-1;x++)if(grid[y][x]==='.'&&(x<4||x>GW-5||y<3||y>GH-4))out.push([x*T+T/2,y*T+T/2]);return out;}
function startWave(){
  WV.wave++;WV.state='fight';WV.flash=2.2;const w=WV.wave,boss=w%10===0;SFX.horn(boss);
  dmgMul=(1+.14*(diffN-1))*(1+.035*(w-1));
  const q=[];
  if(boss){q.push('X');for(let i=0;i<4+w/5;i++)q.push(i%3?'g':'s');}
  else{const cnt=Math.round((4+w*1.6)*(1+.35*(diffN-1)));for(let i=0;i<cnt;i++){const r=Math.random();q.push(w>=6&&r<.12+w*.004?'t':w>=3&&r<.42?'s':'g');}}
  WV.queue=q;WV.spawnT=.4;
}
function spawnWaveEnemy(type:string){
  const TGs=targets().filter(t=>!t.dead);const fr=waveFree();let best:any=null,bd=-1;
  for(let k=0;k<12;k++){const p=pick(fr);const d=Math.min(...TGs.map(t=>Math.hypot(t.x-p[0],t.y-p[1])),1e9);if(d>bd){bd=d;best=p;}if(d>T*7)break;}
  const e=spawnEnemy(type,best[0],best[1]);e.alert=true;
  if(type==='X'){const kb=WV.wave/10;e.hp=e.max=Math.round(22000*(1+.75*(diffN-1))*(1+.7*(kb-1)));e.say={t:kb>1?'Voltei mais forte! Nível '+kb+'!':'Arrr! A arena é minha!',l:2.2};}
  else{e.hp=e.max=Math.round(e.max*(1+.08*(WV.wave-1)));}
  ring(e.x,e.y,'#ff5d73',70);burst(e.x,e.y-20,14,['#ff5d73','#fff','#8d78e0'],200,4);
}
function waveCleared(){
  SFX.waveDone();
  WV.state='break';WV.t=4.5;
  if(P&&!P.dead)P.hp=Math.min(P.max,P.hp+P.max*.35);
  addCharXP(15+WV.wave);addXP(10);
  if(WV.wave>(save.bestWave|0)){save.bestWave=WV.wave;}persist();
  toast('Onda '+WV.wave+' vencida!'+(WV.wave%10===9?' Cuidado: a próxima tem chefe!':''));
}
function waveTick(dt:number){
  WV.flash=Math.max(0,WV.flash-dt);
  if(WV.state==='break'){WV.t-=dt;if(WV.t<=0)startWave();return;}
  WV.spawnT-=dt;
  if(WV.queue.length&&WV.spawnT<=0&&enemies.length<14+diffN*3){spawnWaveEnemy(WV.queue.shift());WV.spawnT=Math.max(.25,.85-WV.wave*.02);}
  if(!WV.queue.length&&enemies.length===0)waveCleared();
}
function wavesOver(){
  SFX.lose();
  phase='lose';state='lost';show('pauseBtn',false);touch.move=touch.fire=touch.sup=null;
  const got=Math.max(0,WV.wave-1);if(got>(save.bestWave|0))save.bestWave=got;persist();
  showResult('Fim das ondas','Você sobreviveu a '+got+(got===1?' onda':' ondas')+'. Seu recorde: '+(save.bestWave|0)+'.','Jogar de novo',()=>startWavesHost(),NET.game?'Voltar pra sala':'Menu',()=>{if(NET.game)enterWait();else showMenu();},true);
}
function beginPlay(){SFX.beep(true);state='play';phase='play';banner=2.4;show('pauseBtn');show('dlg',false);}
function recordWin(){recordArea(cur);}
function hostWin(){
  SFX.win();
  phase='win';state='story';show('pauseBtn',false);touch.move=touch.fire=touch.sup=null;recordWin();WORLD.capQ=[];
  showDialog(LV[cur].outro,()=>{
    const last=cur>=LV.length-1;
    showResult(last?'Fim!':'Vitória!','O Coral Brilhante voltou para o farol e a ilha acendeu de novo. Total: '+save.gears+' engrenagens.',
      NET.game?'Voltar pra sala':'Menu',()=>{if(NET.game){WAIT.sel=0;enterWait();}else showMenu();},'Jogar do começo',()=>startChapterHost(0),false);
  });
}
function hostLose(){
  if(!WV.on)SFX.lose();
  if(WV.on){wavesOver();return;}
  phase='lose';state='lost';show('pauseBtn',false);touch.move=touch.fire=touch.sup=null;
  const tips=['Entre numa moita para sumir da vista dos robôs.','Recue e pare de atirar: a vida enche sozinha depois de alguns segundos.','Guarde o SUPER para quando estiver cercada.','Os tiros dos inimigos não atravessam paredes. Use as caixas!'];
  showResult('Derrota',pick(tips)+' Você volta no começo da área '+(cur+1)+'.','Tentar de novo',()=>startChapterHost(cur),NET.game?'Voltar pra sala':'Menu',()=>{if(NET.game){WAIT.sel=cur;enterWait();}else showMenu();},true);
}
let resF:any[]=[null,null];
function showResult(title:string,sub:string,l1:any,f1:any,l2:any,f2:any,lose:boolean){
  ui.res={title,sub,l1:l1||'',l2:l2||'',lose:!!lose};resF=[f1,f2];show('res');emit();
}
function resPick(i:number){show('res',false);const f=resF[i];f&&f();}
function setPause(v:boolean){
  if(state!=='play'||cur===-1)return;
  if(!v){show('pause',false);paused=false;return;}paused=NET.game?false:v;show('pause',!!v);
  ui.pause.tip=NET.game?'O jogo online continua rodando enquanto este menu está aberto.':WV.on?'Modo Ondas · onda '+WV.wave+'. Se sair, a partida acaba.':('Área '+(cur+1)+': '+LV[cur].name+'. Se sair, você volta no começo desta área.');
  ui.pause.quit=NET.game?'Sair da sala':'Sair';emit();
  touch.move=touch.fire=touch.sup=null;
}
function pauseContinue(){show('pause',false);paused=false;}
function pauseQuit(){paused=false;NET.leave();showMenu();}
function onHide(){persist();if(state==='play'&&!paused&&!NET.game)setPause(true);}

/* ---------- online ---------- */
const NET:any={
  lobby:null,game:null,user:null,code:null,isHost:true,myPeer:null,count:1,myIndex:0,
  evSeq:0,ev:[],hitSeq:0,hits:[],lastEv:-1,lastHit:-1,lastShot:{},hostGoneT:0,sendT:0,joinedAt:0,clientRun:-1,clientPhase:'',
  pushEv(a){if(!this.game)return;this.ev.push([++this.evSeq].concat(a));if(this.ev.length>28)this.ev.shift();},
  pushHit(peer,dmg,a){this.hits.push([++this.hitSeq,peer,dmg,Math.round(a*100)]);if(this.hits.length>12)this.hits.shift();},
  leave(){
    if(this.game){try{this.game.leave().catch(()=>{});}catch(e){}}
    this.game=null;this.code=null;this.isHost=true;this.count=1;this.myIndex=0;
    for(const k in RP)delete RP[k];
    if(this.lobby)this.lobby.presence({app:'tita',nm:save.name||'',game:null,host:false,gn:0}).catch(()=>{});
  }
};
/* conexão direta entre celulares (fora do Claude): imita a API de sala usada acima */
const P2P_PREFIX='titacoral-v1-';
function peerLobby(){
  return {p2p:true,
    presence(){return Promise.resolve();},peers(){return [];},onPeers(){return ()=>{};},
    join(name,asHost){
      return new Promise((resolve,reject)=>{
        if(typeof Peer==='undefined'){reject({code:'nolib'});return;}
        const code=name.replace(/^tita-/,'');
        const ps={};let myPres={},you=asHost?'h':null,errFn=null,closed=false,iv=null,peer=null,hostConn=null,settled=false;
        const fail=c=>{if(closed)return;if(!settled){settled=true;reject({code:c});cleanup();return;}errFn&&errFn({code:c,message:c});cleanup();};
        function cleanup(){closed=true;clearInterval(iv);try{peer&&peer.destroy();}catch(e){}}
        const api={name,
          presence(o){Object.assign(myPres,JSON.parse(JSON.stringify(o)));if(!asHost&&hostConn&&hostConn.open){try{hostConn.send({t:'p',o:myPres});}catch(e){}}return Promise.resolve();},
          peers(){const L=[{peer:you||'me',by:null,isMe:true,sameTab:true,kind:'viewer',guest:false,presence:myPres,updatedAt:0}];
            for(const k in ps)if(k!==you)L.push({peer:k,by:null,isMe:false,sameTab:false,kind:'viewer',guest:false,presence:ps[k].presence||{},updatedAt:0});return L;},
          onPeers(fn,onErr){errFn=onErr||null;return ()=>{};},
          connected(){return !closed;},
          leave(){cleanup();return Promise.resolve();}
        };
        if(asHost){
          peer=new Peer(P2P_PREFIX+code);let n=0;
          peer.on('open',()=>{settled=true;resolve(api);
            iv=setInterval(()=>{const all={h:myPres};for(const k in ps)all[k]=ps[k].presence||{};
              for(const k in ps){const c=ps[k].conn;try{if(c.open)c.send({t:'s',you:k,ps:all});}catch(e){}}},50);});
          peer.on('connection',c=>{c.on('open',()=>{
            if(Object.keys(ps).length>=4){try{c.send({t:'full'});}catch(e){}setTimeout(()=>{try{c.close();}catch(e){}},400);return;}
            const k='c'+(++n);ps[k]={conn:c,presence:{}};
            c.on('data',d=>{if(d&&d.t==='p'&&d.o&&typeof d.o==='object')ps[k].presence=d.o;});
            const drop=()=>{delete ps[k];};c.on('close',drop);c.on('error',drop);});});
          peer.on('error',e=>fail(e.type==='unavailable-id'?'taken':e.type));
          peer.on('disconnected',()=>{try{if(!peer.destroyed)peer.reconnect();}catch(e){}});
        } else {
          peer=new Peer();
          const to=setTimeout(()=>fail('timeout'),15000);
          peer.on('open',()=>{const c=peer.connect(P2P_PREFIX+code,{reliable:true});hostConn=c;
            c.on('open',()=>{clearTimeout(to);settled=true;resolve(api);c.send({t:'p',o:myPres});});
            c.on('data',d=>{if(!d)return;if(d.t==='full'){fail('full');return;}
              if(d.t==='s'&&d.ps&&typeof d.ps==='object'){you=String(d.you);for(const k in ps)if(!(k in d.ps))delete ps[k];for(const k in d.ps){if(k===you)continue;ps[k]={presence:d.ps[k]};}}});
            const gone=()=>fail('host-left');c.on('close',gone);c.on('error',gone);
            const chk=setInterval(()=>{if(closed){clearInterval(chk);return;}const pc=c.peerConnection;if(pc&&['failed','closed'].includes(pc.iceConnectionState)){clearInterval(chk);gone();}},2000);});
          peer.on('error',e=>{clearTimeout(to);fail(e.type);});
        }
      });
    }
  };
}
/* ---------- amigos (conexão direta pelo código fixo de cada jogador) ---------- */
const FA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const FR:any={me:null,ready:false,status:{},reqs:[],pollT:0,inv:null,backTo:'menu',tries:0,invT:null};
if(!save.fid){save.fid=Array.from({length:6},()=>FA[Math.floor(Math.random()*FA.length)]).join('');persist();}
if(!Array.isArray(save.friends))save.friends=[];
function cleanFid(v:any){return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);}
function friendsOn(){return !!(NET.lobby&&NET.lobby.p2p);}
function startFriends(){
  if(FR.me)return;
  let pr:any;try{pr=new Peer(P2P_PREFIX+'u-'+save.fid);}catch(e){return;}
  FR.me=pr;
  pr.on('open',()=>{FR.ready=true;FR.tries=0;pollFriends();renderFriends();});
  pr.on('connection',(c:any)=>{c.on('data',(d:any)=>onFriendMsg(c,d));setTimeout(()=>{try{c.close();}catch(e){}},8000);});
  pr.on('disconnected',()=>{try{if(!pr.destroyed)pr.reconnect();}catch(e){}});
  pr.on('error',(e:any)=>{if(e.type==='unavailable-id'||e.type==='network'||e.type==='server-error'||e.type==='socket-error'){FR.ready=false;try{pr.destroy();}catch(x){}FR.me=null;++FR.tries;FR.retryAt=clock+Math.min(60,4*FR.tries);}});
}
function myStatus(){return {t:'pong',id:save.fid,name:save.name||'Jogador',room:NET.game&&NET.code&&NET.count<5?NET.code:null};}
function onFriendMsg(c:any,d:any){
  if(!d||typeof d!=='object')return;
  const id=cleanFid(d.id),name=String(d.name||'Jogador').slice(0,12);if(id.length!==6||id===save.fid)return;
  const isF=save.friends.some((f:any)=>f.id===id);
  const reply=(o:any)=>{try{c.send(o);}catch(e){}};
  if(d.t==='ping'){if(isF){reply(myStatus());const f=save.friends.find((f:any)=>f.id===id);if(f&&f.name!==name){f.name=name;persist();}}else reply({t:'nf',id:save.fid});}
  else if(d.t==='req'){
    if(isF){reply({t:'acc',id:save.fid,name:save.name||'Jogador'});return;}
    if(!FR.reqs.some((r:any)=>r.id===id))FR.reqs.push({id,name});
    reply({t:'got'});toast(name+' quer ser seu amigo. Abra Amigos para aceitar.');renderFriends();updFriendsBadge();}
  else if(d.t==='acc'){addFriendLocal(id,name);toast(name+' agora é seu amigo!');}
  else if(d.t==='inv'&&isF){const room=String(d.room||'').toLowerCase().replace(/[^a-z]/g,'').slice(0,4);if(room.length===4)showInvite(name,room);reply({t:'got'});}
}
function addFriendLocal(id:string,name:string){if(!save.friends.some((f:any)=>f.id===id)){save.friends.push({id,name});persist();}FR.reqs=FR.reqs.filter((r:any)=>r.id!==id);renderFriends();updFriendsBadge();}
function sendTo(fid:string,msg:any,onReply:any,ms?:number){
  if(!FR.me||!FR.ready){onReply&&onReply(null);return;}
  let done=false;let c:any;const fin=(v:any)=>{if(done)return;done=true;try{c&&c.close();}catch(e){}onReply&&onReply(v);};
  try{c=FR.me.connect(P2P_PREFIX+'u-'+fid,{reliable:true});}catch(e){onReply&&onReply(null);return;}
  c.on('open',()=>{try{c.send(msg);}catch(e){}});c.on('data',(d:any)=>fin(d));c.on('error',()=>fin(null));
  setTimeout(()=>fin(null),ms||5000);
}
function pollFriends(){
  if(!FR.ready)return;
  for(const f of save.friends){sendTo(f.id,{t:'ping',id:save.fid,name:save.name||'Jogador'},(d:any)=>{
    if(d&&d.t==='pong'){FR.status[f.id]={on:true,room:d.room?String(d.room).toLowerCase().replace(/[^a-z]/g,'').slice(0,4):null,at:clock};if(d.name&&d.name!==f.name){f.name=String(d.name).slice(0,12);persist();}}
    else FR.status[f.id]={on:false,room:null,at:clock};
    renderFriends();},4500);}
}
function friendsTick(dt:number){
  if(!friendsOn())return;
  if(!FR.me&&clock>=(FR.retryAt||0))startFriends();
  FR.pollT-=dt;if(FR.pollT<=0){FR.pollT=!ui.show.friends?20:6;pollFriends();}
}
function updFriendsBadge(){emit();}
function openFriends(){
  FR.backTo=state==='map'||(state==='play'&&cur===-1)?'map':'menu';
  if(FR.backTo==='map'){show('friends');}else{hideAll();state='friends';show('friends');}
  const q=(QS.match(/[?&]amigo=([A-Za-z0-9]{6})/)||[])[1];if(q&&!ui.fidIn&&cleanFid(q)!==save.fid)ui.fidIn=cleanFid(q);
  ui.rmAsk={};ui.invited={};
  FR.pollT=0;renderFriends();
}
function renderFriends(){if(ui.show.friends)emit();}
function friendsInfo(){
  const msg=!FR.ready?'Conectando…':save.friends.length?'Amigos aparecem online quando estão com o jogo aberto.':'Passe seu código para um amigo ou digite o código dele acima.';
  const list=save.friends.slice().sort((a:any,b:any)=>((FR.status[b.id]||{}).on?1:0)-((FR.status[a.id]||{}).on?1:0));
  return {fid:save.fid,input:ui.fidIn,busy:ui.addBusy,msg,
    reqs:FR.reqs.map((r:any)=>({id:r.id,name:r.name,sub:'Quer ser seu amigo · '+r.id})),
    list:list.map((f:any)=>{const st=FR.status[f.id]||{};
      const canJoin=!!(st.room&&!(NET.game&&NET.code===st.room));
      const canInv=!canJoin&&!!(st.on&&NET.game&&NET.code);
      return {id:f.id,name:f.name||f.id,dot:st.room?'room':st.on?'on':'',
        sub:st.room?'Numa sala · dá para entrar':st.on?'Online':st.at!=null?'Offline':'Verificando…',
        join:canJoin?st.room:null,invite:canInv,invited:!!ui.invited[f.id],rmAsk:!!ui.rmAsk[f.id]};})};
}
function friendAccept(id:string){const r=FR.reqs.find((x:any)=>x.id===id);if(!r)return;addFriendLocal(r.id,r.name);sendTo(r.id,{t:'acc',id:save.fid,name:save.name||'Jogador'},null,5000);FR.pollT=0;}
function friendReject(id:string){FR.reqs=FR.reqs.filter((x:any)=>x.id!==id);renderFriends();updFriendsBadge();}
function friendJoin(room:string){show('friends',false);joinRoom(room,false);}
function friendInvite(id:string){const f=save.friends.find((x:any)=>x.id===id);if(!f||!NET.code)return;ui.invited[id]=true;emit();
  sendTo(f.id,{t:'inv',id:save.fid,name:save.name||'Jogador',room:NET.code},(d:any)=>{if(!d)toast('Não deu para chamar '+(f.name||'o amigo')+'. Ele pode ter fechado o jogo.');},5000);}
function friendRemove(id:string){if(ui.rmAsk[id]){save.friends=save.friends.filter((x:any)=>x.id!==id);persist();delete ui.rmAsk[id];renderFriends();}else{ui.rmAsk[id]=true;emit();}}
function setFidIn(v:string){ui.fidIn=cleanFid(v);emit();}
function addFriend(){
  const id=cleanFid(ui.fidIn);
  if(id.length!==6){toast('O código do amigo tem 6 letras e números.');return;}
  if(id===save.fid){toast('Esse é o seu código. Digite o do amigo.');return;}
  if(save.friends.some((f:any)=>f.id===id)){toast('Vocês já são amigos.');return;}
  ui.addBusy=true;emit();
  sendTo(id,{t:'req',id:save.fid,name:save.name||'Jogador'},(d:any)=>{ui.addBusy=false;emit();
    if(d&&d.t==='acc'){addFriendLocal(id,String(d.name||'Jogador').slice(0,12));toast('Amigo adicionado!');}
    else if(d){toast('Pedido enviado! Quando ele aceitar, aparece aqui.');ui.fidIn='';emit();}
    else toast('Não achei esse jogador agora. Ele precisa estar com o jogo aberto.');},6000);
}
function shareFid(){
  shareText('Me adiciona na Ilha do Coral! Meu código: '+save.fid+'\n'+SITE+'?amigo='+save.fid,'Código copiado!','Seu código: '+save.fid);
}
function friendsBack(){show('friends',false);if(FR.backTo==='menu')showMenu();else if(state==='map')updateMapCard();else updWaitUI();}
function showInvite(name:string,room:string){
  if(NET.game&&NET.code===room)return;
  FR.inv=room;ui.invite.txt=name+' te chamou para jogar na sala '+room.toUpperCase()+'.';show('inviteCard');emit();
  clearTimeout(FR.invT);FR.invT=setTimeout(()=>{show('inviteCard',false);},20000);
}
function inviteGo(){show('inviteCard',false);const r=FR.inv;if(!r)return;if(state==='play'&&!NET.game){toast('Saindo da fase para entrar na sala…');}hideAll();state='lobby';joinRoom(r,false);}
function inviteNo(){show('inviteCard',false);}

/* ---------- escolha de personagem ---------- */
const HV={sel:0,backTo:'menu'};
function weaponText(w:any){return w.name+' · '+(w.n>1?w.n+' tiros':'1 tiro')+' · dano '+Math.round(w.dm*100)+'%'+(w.pierce?' · atravessa robôs':'')+' · alcance '+Math.round(w.rg*100)+'%';}
function heroDefaultInfo(){const c=CH[HV.sel],L=charLvl(c.id);const eq=save.wpn&&save.wpn[c.id]!=null?clamp(save.wpn[c.id],0,L.u-1):0;const ew=weaponOf(c.id,eq);
  return 'Toque numa arma liberada para equipar (ou use o botão Armas). Equipada: '+ew.name+' · '+(ew.n>1?ew.n+' tiros':'1 tiro')+' · dano '+Math.round(ew.dm*100)+'%'+(ew.pierce?' · atravessa robôs':'');}
function heroInfo(){
  const c=CH[HV.sel],L=charLvl(c.id);
  const eq=save.wpn&&save.wpn[c.id]!=null?clamp(save.wpn[c.id],0,L.u-1):0;
  const ws=[];for(let t=0;t<15;t++){const w=weaponOf(c.id,t),lock=t>=L.u;ws.push({t,lock,eq:t===eq,b:lock?'🔒':String(t+1),col:!lock&&w.col?w.col:null,name:lock?'Nível '+WUNL[t]:w.name});}
  return {sel:HV.sel,cards:CH.map(h=>({full:h.full,tag:h.role.split(' · ')[1]})),
    name:c.full,role:c.role,desc:c.desc,sup:'Super: '+c.sup,stats:[['Vida',c.st[0]],['Alcance',c.st[1]],['Dano',c.st[2]]],
    lvl:'Nível '+L.l+(L.max?' (máximo)':'')+' · '+L.u+'/15 armas',xp:L.max?100:Math.round(L.x/L.need*100),xpT:L.max?'':L.x+'/'+L.need+' XP',
    ws,wInfo:ui.wInfo||heroDefaultInfo(),pick:HV.sel===(save.ch|0)?'Escolhido':'Jogar com '+c.name,pickOff:HV.sel===(save.ch|0)};
}
function drawHeroCard(g:Ctx2D,i:number){paintHeroCard(g,i,HV.sel,clock);}
function openHeroes(){
  HV.backTo=state==='map'||(state==='play'&&cur===-1)?'map':'menu';HV.sel=save.ch|0;ui.wInfo='';
  if(HV.backTo==='map')show('heroes');else{hideAll();state='heroes';show('heroes');}
  emit();
}
function heroSel(i:number){HV.sel=clamp(i,0,CH.length-1);ui.wInfo='';emit();}
function heroWeapon(t:number){const c=CH[HV.sel],L=charLvl(c.id),w=weaponOf(c.id,t);
  if(t>=L.u){ui.wInfo=weaponText(w)+' · libera no nível '+WUNL[t];emit();return;}
  save.wpn=save.wpn||{};save.wpn[c.id]=t;persist();ui.wInfo='Equipada: '+weaponText(w);emit();}
function heroPick(){save.ch=HV.sel;persist();toast(CH[HV.sel].full+' escolhido!');if(state==='play'&&cur===-1&&P){const c=myCh();P.max=c.hp;P.hp=c.hp;}emit();}
function heroBack(){show('heroes',false);if(HV.backTo==='menu')showMenu();else updWaitUI();}

function netErrText(c?:any){return c==='full'?'Sala cheia (5 jogadores).':c==='peer-unavailable'?'Não achei essa sala. Confira o código.':c==='taken'?'Esse código já está em uso. Tente de novo.':c==='host-left'?'O anfitrião saiu ou a conexão caiu.':c==='timeout'?'Demorou demais para conectar. Tente de novo.':c==='nolib'?'O online precisa de internet.':'Sem conexão com o servidor online. Veja sua internet.';}
function initNet(){
  NET.lobby=peerLobby();
  if(ui.show.lobby)openLobby();
  if(state==='menu')showMenu();
  if(/[?&]amigo=/.test(QS)&&state==='menu')openFriends();else if(/[?&]sala=/.test(QS)&&state==='menu')openLobby();
}
function openLobby(){
  hideAll();state='lobby';show('lobby');
  ui.lobbyIn.name=save.name||'';
  const q=(QS.match(/[?&]sala=([a-zA-Z]{4})/)||[])[1];if(q&&!ui.lobbyIn.code)ui.lobbyIn.code=q.toUpperCase();
  emit();
}
function lobbyInfo(){
  const ok=!!NET.lobby,p2p=!!(NET.lobby&&NET.lobby.p2p);
  const list=NET.lobby?NET.lobby.peers().filter((p:any)=>!p.sameTab&&p.presence&&p.presence.app==='tita'&&p.presence.game&&p.presence.host):[];
  return {ok,p2p,name:ui.lobbyIn.name,code:ui.lobbyIn.code,
    msg:!ok?'O online não conectou. Veja se a internet está ligada e abra de novo.':p2p?'Crie uma sala e passe o código de 4 letras. Até 5 jogadores, e quanto mais gente, mais fortes ficam os robôs.':'Até 5 jogadores na mesma sala. Quanto mais gente, mais fortes e numerosos ficam os robôs.',
    empty:NET.lobby?'Nenhuma sala aberta agora. Crie uma e passe o código.':'Sem conexão.',
    rooms:list.map((p:any)=>{const pr=p.presence;return {code:String(pr.game).toUpperCase().slice(0,4),label:String(pr.nm||'Jogador').slice(0,12)+' · '+(pr.gn|0)+'/5',full:(pr.gn|0)>=5,join:String(pr.game).toLowerCase().replace(/[^a-z]/g,'').slice(0,4)};})};
}
function setLobbyName(v:string){ui.lobbyIn.name=String(v).slice(0,12);save.name=ui.lobbyIn.name.trim().slice(0,12);persist();emit();}
function setLobbyCode(v:string){ui.lobbyIn.code=String(v).slice(0,4);emit();}
function createRoom(){const abc='abcdefghjkmnpqrstuvwxyz';let c='';for(let i=0;i<4;i++)c+=abc[Math.floor(Math.random()*abc.length)];joinRoom(c,true);}
function joinCode(){const c=String(ui.lobbyIn.code).trim().toLowerCase().replace(/[^a-z]/g,'');if(c.length!==4){toast('O código tem 4 letras.');return;}joinRoom(c,false);}
async function joinRoom(code?:any,asHost?:any){
  if(!NET.lobby||!code)return;
  if(!save.name){save.name='Jogador '+String(save.fid||'').slice(0,3);persist();}
  try{
    NET.leave();
    const g=await NET.lobby.join('tita-'+code,!!asHost);
    NET.game=g;NET.code=code;NET.isHost=!!asHost;NET.joinedAt=clock;NET.lastEv=-1;NET.lastHit=-1;NET.lastShot={};NET.clientRun=-1;NET.clientPhase='';NET.hostGoneT=0;NET.ev=[];NET.hits=[];
    g.onPeers(()=>{},err=>{if(NET.game===g){toast(err&&err.code&&NET.lobby.p2p?netErrText(err.code):'A conexão com a sala caiu.');NET.leave();showMenu();}});
    sendPresence(true);
    if(asHost){WAIT.sel=clamp(MAP.node,0,save.unl-1);enterWait();toast('Sala '+code.toUpperCase()+' criada. Passe o código para os amigos.');}
    else{
      toast('Entrando na sala '+code.toUpperCase()+'…');
      setTimeout(()=>{if(NET.game!==g)return;const others=g.peers().filter(p=>!p.sameTab&&p.presence&&p.presence.app==='tita');
        if(!others.some(p=>p.presence.role==='host')){toast('Não achei essa sala.');NET.leave();openLobby();return;}
        if(others.length>=5){toast('Sala cheia (5 jogadores).');NET.leave();openLobby();return;}
      },2200);
    }
  }catch(e){if(e&&e.code==='taken'&&asHost){createRoom();return;}toast(e&&e.code&&NET.lobby&&NET.lobby.p2p?netErrText(e.code):'Não deu para entrar na sala agora.');if(state!=='lobby')openLobby();}
}
function sendPresence(force?:any){
  if(!NET.game)return;
  const o:any={app:'tita',role:NET.isHost?'host':'pl',nm:save.name||'Jogador',sc:state==='play'?'play':state==='map'?'map':'wait',run:NET.isHost?runId:NET.clientRun,
    x:P?P.x|0:0,y:P?P.y|0:0,a:P?Math.round(P.aim*100):0,hp:P?P.hp|0:0,mh:P?P.max:3600,dd:P&&P.dead?1:0,mv:P&&P.mv?1:0,ch:save.ch|0,cb:myCh().body,chh:myCh().hair,sk:myCh().sk?1:0,wi:myCh().wi|0,sh:myShots.slice(-8)};
  if(NET.isHost){
    o.ph=phase;o.lv=cur===-1?WAIT.sel:WORLD.start;o.md=WV.on?'w':'s';o.wm=WAIT.mode;o.wv=WV.wave;o.ws=WV.state==='break'?1:0;o.wt=Math.round(WV.t*10)/10;o.wq=WV.queue.length;o.pg=WORLD.prog;o.ct=Math.round(WAIT.ct*10)/10;o.ms=Math.round(MAP.s);o.mn=MAP.node;o.ul=save.unl;o.dn=save.done.slice(0,5);o.n=diffN;
    if(phase==='play'||phase==='win'){
      o.en=enemies.filter(e=>!WORLD.on||areaOf(e.x)<=WORLD.prog+1).sort((a,b)=>(areaOf(a.x)===WORLD.prog?0:1)-(areaOf(b.x)===WORLD.prog?0:1)).slice(0,26).map(e=>{const f=(e.alert?1:0)|(e.wind>0?2:0)|(e.st==='windup'?4:0)|(e.lunge>0?8:0)|(e.mv?16:0);const r=[e.id,e.type,e.x|0,e.y|0,Math.max(0,e.hp|0),e.max,Math.round((e.st==='windup'?e.dashA:e.face)*100),f];if(e.say)r.push(e.say.t);return r;});
      o.ev=NET.ev.slice();o.hi=NET.hits.slice();
    }
    let js=JSON.stringify(o);
    while(js.length>3800&&o.ev&&o.ev.length>6){o.ev=o.ev.slice(-Math.floor(o.ev.length*.7));js=JSON.stringify(o);}
    if(js.length>3800&&o.en){o.en=o.en.slice(0,16);o.en.forEach(r=>{r.length=8;});}
  }
  NET.game.presence(o).catch(()=>{});
  if(NET.lobby&&(force||Math.random()<.04))NET.lobby.presence({app:'tita',nm:save.name||'',game:NET.code,host:NET.isHost,gn:NET.count}).catch(()=>{});
}
function netTick(dt?:any){
  if(!NET.game)return;
  const ps=NET.game.peers();
  const mine=ps.find(p=>p.sameTab);if(mine)NET.myPeer=mine.peer;
  const others=ps.filter(p=>!p.sameTab&&p.kind==='viewer'&&p.presence&&p.presence.app==='tita');
  const prevCount=NET.count;NET.count=Math.min(5,1+others.length);
  if(prevCount!==NET.count){if(state==='map')updateMapCard();updWaitUI();}
  const all=[{peer:NET.myPeer||'',host:NET.isHost?1:0}].concat(others.map(p=>({peer:p.peer,host:p.presence.role==='host'?1:0})));
  all.sort((a,b)=>(b.host-a.host)||(a.peer<b.peer?-1:a.peer>b.peer?1:0));
  NET.myIndex=Math.max(0,all.findIndex(a=>a.peer===(NET.myPeer||'')));
  const seen={};
  for(const p of others){
    const pr=p.presence;seen[p.peer]=1;
    let r=RP[p.peer];
    if(!r){r=RP[p.peer]={x:+pr.x||0,y:+pr.y||0,tx:0,ty:0,lastShot:-9,fl:0,dead:null,hp:null,ch:0};NET.lastShot[p.peer]=Infinity;}
    r.tx=+pr.x||0;r.ty=+pr.y||0;r.aim=(+pr.a||0)/100;const nhp=+pr.hp||0;if(r.hp!=null&&nhp<r.hp)r.fl=.15;r.hp=nhp;r.mh=+pr.mh||3600;
    if(r.dead===false&&pr.dd&&state==='play')burst(r.x,r.y-20,24,['#4cb7ff','#fff'],260,5);
    r.dead=!!pr.dd;r.mv=!!pr.mv;r.nm=String(pr.nm||'Jogador').slice(0,12);r.sc=String(pr.sc||'');r.run=+pr.run;
    r.ci=Math.max(0,all.findIndex(a=>a.peer===p.peer));r.ch=clamp(+pr.ch|0,0,CH.length-1);r.chObj=Object.assign({},withSkin(CH[r.ch],HEX.test(pr.cb)?pr.cb:null,HEX.test(pr.chh)?pr.chh:null),{wi:clamp(+pr.wi|0,0,14)},pr.sk?{sk:'alt'}:{});
    if(Math.hypot(r.tx-r.x,r.ty-r.y)>200){r.x=r.tx;r.y=r.ty;}
    const sh=Array.isArray(pr.sh)?pr.sh:[];
    let mx=NET.lastShot[p.peer];
    if(mx===Infinity){mx=sh.reduce((m,s)=>Math.max(m,+s[0]||0),0);}
    else for(const s of sh){const sq=+s[0]||0;if(sq>mx){mx=sq;
      if(state==='play'&&r.sc==='play'&&r.run===runId){patternPlayer('r',+s[1]||0,+s[2]||0,(+s[3]||0)/1000,s[4]===1?1:0,clamp(+s[5]|0,0,CH.length-1),clamp(+s[6]||300,60,820),clamp(+s[7]|0,0,14));r.lastShot=clock;}}}
    NET.lastShot[p.peer]=mx;
  }
  for(const k in RP)if(!seen[k])delete RP[k];
  NET.sendT-=dt;if(NET.sendT<=0){NET.sendT=.05;sendPresence(false);}
  if(!NET.isHost){
    const hp=others.find(p=>p.presence.role==='host');
    if(!hp){NET.hostGoneT+=dt;if(NET.hostGoneT>4&&clock-NET.joinedAt>4){toast('O anfitrião saiu da sala.');NET.leave();showMenu();}return;}
    NET.hostGoneT=0;followHost(hp.presence);
  }
}
function followHost(h?:any){
  MAP.ul=clamp(+h.ul||1,1,5);MAP.done=Array.isArray(h.dn)?h.dn.map(Number).filter(v=>v>=0&&v<5):[];
  const ph=String(h.ph||'map'),run=+h.run||0,lv=clamp(+h.lv||0,0,4);
  if(ph==='lobby'||ph==='count'){
    WAIT.sel=lv;WAIT.mode=h.wm==='w'?'w':'s';
    if(cur!==-1||state!=='play'||(NET.clientPhase!=='lobby'&&NET.clientPhase!=='count')){if(state!=='lobby'||clock-NET.joinedAt>.6){NET.clientRun=-1;enterWait();}}
    const ct=+h.ct||0;if(ph==='count'){if(Math.abs(ct-WAIT.ct)>.4)WAIT.ct=ct;}else WAIT.ct=0;
    updWaitUI();NET.clientPhase=ph;return;}
  if(ph==='map'){
    MAP.hostS=+h.ms||0;MAP.hostNode=clamp(+h.mn||0,0,4);
    if(state!=='map'&&(state==='lobby'?clock-NET.joinedAt>1.2:!ui.show.res||NET.clientPhase!=='map')){MAP.s=MAP.hostS;showMap(false);}
    if(state==='map')updateMapCard();
    NET.clientPhase='map';return;}
  if(run!==NET.clientRun&&(ph==='story'||ph==='play')){
    NET.clientRun=run;runId=run;NET.lastEv=-1;NET.lastHit=-1;NET.clientPhase='';
    hideAll();if(h.md==='w'){loadLevel(-2,+h.n||1,true);WV.on=true;WV.wave=0;WV.queue=[];WV.state='break';}else loadWorld(lv,+h.n||1,true);
    if(ph==='story'&&h.md!=='w'){state='story';showDialog(LV[lv].intro,()=>{if(NET.clientPhase!=='play')toast('Aguardando o anfitrião começar…');},['Capítulo '+(lv+1),LV[lv].name]);}
  }
  if(ph==='play'&&run===NET.clientRun&&state!=='play'){hideAll();beginPlay();}
  if(WV.on&&run===NET.clientRun&&ph==='play'){const wv=+h.wv|0;if(wv>WV.wave){if(WV.wave>0){if(P&&!P.dead)P.hp=Math.min(P.max,P.hp+P.max*.35);addCharXP(15+WV.wave);addXP(10);if(WV.wave>(save.bestWave|0))save.bestWave=WV.wave;persist();}WV.wave=wv;WV.flash=2.2;}
    WV.state=+h.ws?'break':'fight';WV.t=+h.wt||0;WV.queue.length=clamp(+h.wq|0,0,200);}
  if(WORLD.on&&run===NET.clientRun&&(ph==='play'||ph==='win')){const pg=clamp(+h.pg|0,0,LV.length-1);if(pg>WORLD.prog){const was=WORLD.prog;setProg(pg);if(state==='play')storyLines(LV[was].outro);recordArea(was);toast('O portão abriu! Siga para a direita.');}}
  if((ph==='win'||ph==='lose')&&NET.clientPhase!==ph&&run===NET.clientRun){
    touch.move=touch.fire=touch.sup=null;show('pauseBtn',false);
    if(ph==='win'){SFX.win();state='story';phase='win';recordArea(LV.length-1);WORLD.capQ=[];showDialog(LV[LV.length-1].outro,()=>showResult('Fim!','O Coral Brilhante voltou para o farol. Aguardando o anfitrião…',null,null,'Sair da sala',()=>{NET.leave();showMenu();},false));}
    else{SFX.lose();state='lost';phase='lose';hideAll();const got=Math.max(0,WV.wave-1);if(WV.on&&got>(save.bestWave|0)){save.bestWave=got;persist();}showResult(WV.on?'Fim das ondas':'Derrota',WV.on?'O time sobreviveu a '+got+' ondas. Aguardando o anfitrião…':'O time caiu. Aguardando o anfitrião tentar de novo…',null,null,'Sair da sala',()=>{NET.leave();showMenu();},true);}
  }
  NET.clientPhase=ph;
  if(ph==='play')phase='play';
  if(state!=='play'&&state!=='story'&&state!=='lost')return;
  const en=Array.isArray(h.en)?h.en:[];const byId={};enemies.forEach(e=>{byId[e.id]=e;});const next=[];
  for(const r of en){if(!Array.isArray(r))continue;const id=+r[0];const type='gstX'.includes(r[1])&&r[1].length===1?r[1]:'g';let e=byId[id];
    if(!e)e=mkEnemy(type,+r[2]||0,+r[3]||0,id);
    e.tx=+r[2]||0;e.ty=+r[3]||0;const hp=+r[4]||0;if(hp<e.hp){e.fl=.12;ftext(e.x,e.y-(type==='X'?110:58),String(Math.round(e.hp-hp)),'#fff');}
    e.hp=hp;e.max=+r[5]||e.max;e.face=(+r[6]||0)/100;const f=+r[7]||0;e.alert=!!(f&1);e.wind=f&2?1:0;e.st=f&4?'windup':'idle';if(f&8)e.lunge=.15;e.mv=!!(f&16);
    if(r[8]&&(!e.say||e.say.t!==r[8]))e.say={t:String(r[8]).slice(0,40),l:1.5};
    next.push(e);delete byId[id];}
  for(const id in byId)if(phase==='play'||phase==='win')deathFx(byId[id]);
  enemies=next;
  const ev=Array.isArray(h.ev)?h.ev:[];
  if(NET.lastEv<0)NET.lastEv=ev.reduce((m,v)=>Math.max(m,+v[0]||0),0);
  else for(const v of ev){if(Array.isArray(v)&&(+v[0]||0)>NET.lastEv){NET.lastEv=+v[0];if(state==='play')spawnVolley(+v[1]||0,+v[2]||0,(+v[3]||0)/1000,clamp(+v[4]|0,1,12),(+v[5]||0)/1000,clamp(+v[6]||300,50,900),clamp(+v[7]||0,0,3000),clamp(+v[8]||8,3,14),clamp(+v[9]||400,50,700),+v[10]?1:0,+v[11]?1:0);}}
  const hi=Array.isArray(h.hi)?h.hi:[];
  if(NET.lastHit<0)NET.lastHit=hi.reduce((m,v)=>Math.max(m,+v[0]||0),0);
  else for(const v of hi){if(Array.isArray(v)&&(+v[0]||0)>NET.lastHit){NET.lastHit=+v[0];if(v[1]===NET.myPeer)hurtPlayer(clamp(+v[2]||0,0,3000),(+v[3]||0)/100);}}
}
/* ---------- laço: a plataforma chama tick() e depois draw() a cada quadro ---------- */
let last=pf.now();
function tick(now:number){
  const dt=Math.min(.033,Math.max(0,(now-last)/1000));last=now;clock+=dt;
  try{
    if(state==='play'&&!paused)update(dt);
    else if(state==='story'||state==='lost')updFx(dt);
    else if(state==='map')updMap(dt);
    netTick(dt);friendsTick(dt);musTick();
  }catch(err){console.error(err);}
}
function draw(g:Ctx2D){
  ctx=g;
  try{
    ctx.setTransform(DPR,0,0,DPR,0,0);
    if(state==='map')renderMap();
    else if((state==='play'||state==='story'||state==='lost')&&P)renderLevel();
    else{ctx.fillStyle='#2d1d70';ctx.fillRect(0,0,W,H);}
  }catch(err){console.error(err);}
}
showMenu();
initNet();

/* botão "voltar" do Android: fecha a tela de cima; no início, deixa sair do app */
function back():boolean{
  const S=ui.show;
  if(S.inviteCard){inviteNo();return true;}
  if(S.pause){pauseContinue();return true;}
  if(S.res){return true;}
  if(S.arsenal){arBack();return true;}
  if(S.heroes){heroBack();return true;}
  if(S.friends){friendsBack();return true;}
  if(S.skin||S.lobby){showMenu();return true;}
  if(S.dlg){advance();return true;}
  if(S.waitUI||S.mapUI){leaveToMenu();return true;}
  if(state==='play'){setPause(true);return true;}
  return false;
}
const game={
  ui,
  subscribe(f:()=>void){subs.add(f);return ()=>{subs.delete(f);};},
  setLayout,tick,draw,
  input:{keyDown,keyUp,ptrDown,ptrMove,ptrUp,homeDown,homeMove,homeUp,homeCancel},
  paint:{weapon:(g:Ctx2D,id:string,wi:number,lock:boolean)=>paintWeapon(g,id,wi,lock),menuScene:drawMenuScene,menuBg:drawMenuBg,skin:drawSkinPreview,portrait:drawPortrait,heroCard:drawHeroCard},
  info:{menu:menuInfo,skin:skinInfo,wait:waitInfo,arsenal:arsenalInfo,friends:friendsInfo,heroes:heroInfo,lobby:lobbyInfo,map:mapCardInfo,
    layout:()=>({W,H,INS,ROT,narrow:W<700,xnarrow:W<520,short:H<460}),isTouch:()=>isTouch,
    mini:()=>({ch:myCh(),sel:HV.sel,spk:curSpk}),state:()=>state},
  act:{
    btnSound,playSolo,playWaves,openLobby,openFriends,openHeroes,openArsenal,openSkin,toggleSfx,toggleMus,
    pickSkin,pickOutfit,skinReset,skinBack:showMenu,
    lobbyName:setLobbyName,lobbyCode:setLobbyCode,createRoom,joinCode,joinListed:(c:string)=>joinRoom(c,false),lobbyBack:showMenu,
    mapEnter,mapBack:leaveToMenu,inviteRoom,
    waitLeave:leaveToMenu,wPrev,wNext,wMode,wStart,
    dlgTap:advance,dlgSkip:closeDialog,
    resPick,pause:()=>setPause(true),pauseContinue,pauseQuit,
    friendAccept,friendReject,friendJoin,friendInvite,friendRemove,setFidIn,addFriend,shareFid,friendsBack,inviteGo,inviteNo,
    heroSel,heroWeapon,heroPick,heroBack,
    arTab,arEquip,arBack,
    onHide,persist,back
  }
};
return game;
}
