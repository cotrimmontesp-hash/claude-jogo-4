/* Desenhos do jogo: cores, formas básicas e os personagens (Tita, Lia, Zeca, Rui, Seu Bento e os robôs).
   Usado pelo motor e pelas telas (prévias dos personagens). */
import { CH } from './data';
export const INK='#1d1436';
let FONTF:(size:number,kind?:'display'|'body')=>string=(s)=>s+'px "Lilita One","Arial Black",sans-serif';
export function setFontFn(f:(size:number,kind?:'display'|'body')=>string){FONTF=f;}
export const SHC={};
export function lt(hex?:any,a?:any){const k=hex+a;if(SHC[k])return SHC[k];const c=parseInt(hex.slice(1),16);const f=v=>Math.max(0,Math.min(255,Math.round(a>0?v+(255-v)*a:v*(1+a))));return SHC[k]='rgb('+f(c>>16)+','+f(c>>8&255)+','+f(c&255)+')';}
export function vg(g?:any,y0?:any,y1?:any,b?:any){const gr=g.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,lt(b,.38));gr.addColorStop(.5,b);gr.addColorStop(1,lt(b,-.28));return gr;}
export function rg(g?:any,x?:any,y?:any,r?:any,b?:any){const gr=g.createRadialGradient(x-r*.35,y-r*.45,r*.08,x,y,r*1.05);gr.addColorStop(0,lt(b,.45));gr.addColorStop(.55,b);gr.addColorStop(1,lt(b,-.25));return gr;}
/* ---------- primitivas ---------- */
export function ink(g?:any,w?:any){g.lineWidth=w||3.2;g.strokeStyle=INK;g.lineJoin='round';g.lineCap='round';}
export function circ(g?:any,x?:any,y?:any,r?:any,c?:any,ns?:any){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=c;g.fill();if(!ns)g.stroke();}
export function ell(g?:any,x?:any,y?:any,rx?:any,ry?:any,c?:any,ns?:any){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=c;g.fill();if(!ns)g.stroke();}
export function rrp(g?:any,x?:any,y?:any,w?:any,h?:any,r?:any){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);}
export function rr(g?:any,x?:any,y?:any,w?:any,h?:any,r?:any,c?:any,ns?:any){rrp(g,x,y,w,h,r);g.fillStyle=c;g.fill();if(!ns)g.stroke();}
export function shadow(g?:any,x?:any,y?:any,r?:any){g.beginPath();g.ellipse(x,y+2,r*1.1,r*.45,0,0,Math.PI*2);g.fillStyle='rgba(30,15,60,.26)';g.fill();}
export function txt(g?:any,s?:any,x?:any,y?:any,size?:any,col?:any,align?:any){g.font=FONTF(size);g.textAlign=align||'center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=Math.max(3,size/3.2);g.strokeStyle=INK;g.strokeText(s,x,y);g.fillStyle=col;g.fillText(s,x,y);}
export function eye(g?:any,x?:any,y?:any,s?:any){s=s||1;ell(g,x,y,3.3*s,4.4*s,INK,true);circ(g,x+1.1*s,y-1.6*s,1.3*s,'#fff',true);}
export function gearShape(g?:any,x?:any,y?:any,r?:any,c?:any){g.beginPath();for(let i=0;i<16;i++){const a=i/16*Math.PI*2,R=i%2?r:r*1.35;g.lineTo(x+Math.cos(a)*R,y+Math.sin(a)*R);}g.closePath();g.fillStyle=c;g.fill();g.stroke();circ(g,x,y,r*.4,INK,true);}
export function star(g?:any,x?:any,y?:any,r?:any,c?:any){g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,R=i%2?r*.45:r;g.lineTo(x+Math.cos(a)*R,y+Math.sin(a)*R);}g.closePath();g.fillStyle=c;g.fill();g.lineWidth=2.5;g.stroke();ink(g);}

/* ---------- personagens ---------- */
/* ---------- armas: cada uma das 15 de cada personagem tem um visual próprio ----------
   ch.wi = número da arma equipada (0 a 14). Muda a cor, o tamanho e as peças. */
export const WPAL=['#9aa3b8','#d9b45a','#7ccf5a','#4cc3e8','#ff9f43','#7ee6ff','#6c8cff','#2fd1c5','#ff6b9a','#c45cff','#d9783f','#a259ff','#ffc21a','#b8c4d6','#ff5d73'];
export const WACC=['#ff7a2f','#8a5a32','#2e7d32','#1d6fa5','#c0392b','#ffffff','#ffe14d','#0b8f87','#ffe14d','#7ee6ff','#5a2d12','#ffe14d','#fff3b0','#4b4f6e','#ffe14d'];
function zig(g:any,x0:number,x1:number,y:number,col:string){g.beginPath();g.moveTo(x0,y);for(let x=x0;x<x1;x+=5){g.lineTo(x+2.5,y+((x/5)%2?-3:3));}g.lineTo(x1,y);g.lineWidth=2.2;g.strokeStyle=col;g.stroke();ink(g);}
export function weapon(g?:any,ch?:any,x?:any,y?:any,a?:any,t?:any){
  const w=Math.max(0,Math.min(14,(ch&&ch.wi)|0));
  const C=WPAL[w],A=WACC[w],L=w*1.1,glow=w>=7,gold=w===12,leg=w===14;
  g.save();g.translate(x,y);g.rotate(a);
  if(leg){g.globalAlpha=.35+.2*Math.sin((t||0)*6);circ(g,22,0,22,'#ffe14d',true);g.globalAlpha=1;}
  else if(glow){g.globalAlpha=.22;circ(g,22,0,17,A,true);g.globalAlpha=1;}
  if(ch.atk==='snipe'){
    /* rifle de luneta: cano mais longo a cada arma, luneta maior, cano duplo nas melhores */
    const len=46+L*1.4;
    rr(g,-2,-5,len,10,4,vg(g,-5,5,C));
    if(w>=4)rr(g,-2,2,len-6,5,2,lt(C,-.3));
    rr(g,len-6,-6,9,12,2,w>=9?A:'#2a2e45');
    const sw=18+Math.min(10,w);rr(g,8,-13-(w>=6?2:0),sw,8+(w>=6?2:0),3,vg(g,-13,-5,'#2a2e45'));circ(g,8+sw,-9,3.5+(w>=6?1:0),glow?A:'#7ee6ff');
    rr(g,4,-3,10,9,3,gold?'#ffb800':'#8a5a32');
    if(w>=2&&w<9){g.fillStyle=A;g.fillRect(len*.55,-5,3,10);}
    if(w>=9)zig(g,14,len-8,0,'#fff');
    if(w>=11){g.beginPath();g.moveTo(len+3,-6);g.lineTo(len+12,0);g.lineTo(len+3,6);g.closePath();g.fillStyle=A;g.fill();g.stroke();}
  } else if(ch.atk==='lob'){
    /* estilingue/lançador de balões: forquilha, balão de cor diferente e enfeites */
    const sz=8+Math.min(6,w*.45);
    g.beginPath();g.moveTo(4,0);g.lineTo(20,0);g.moveTo(20,0);g.lineTo(30,-9-w*.3);g.moveTo(20,0);g.lineTo(30,9+w*.3);g.lineWidth=7;g.strokeStyle=INK;g.stroke();g.lineWidth=4;g.strokeStyle=gold?'#ffb800':w>=5?lt(C,-.35):'#8a5a32';g.stroke();ink(g);
    if(w===7){circ(g,33+sz*.4,0,sz+1,'#2fae4c');g.beginPath();g.arc(33+sz*.4,0,sz*.65,0,7);g.fillStyle='#ff5d73';g.fill();}
    else circ(g,33+sz*.4,0,sz,rg(g,33+sz*.4,0,sz,C));
    if(w===2||w===10){for(let i=0;i<3;i++)circ(g,30+i*4,-sz+2+i*3,1.6,['#ff5d73','#ffe14d','#4cb7ff'][i],true);}
    if(w===3||w===4||w===13){g.fillStyle='#fff';g.beginPath();g.arc(33+sz*.4-2,-sz*.35,sz*.28,0,7);g.fill();}
    if(w>=11)zig(g,22,40,-sz-3,A);
    if(w>=8&&w!==11)rr(g,6,-4,10,8,3,A);
  } else if(ch.atk==='rocket'){
    /* bazuca: tubo maior, mais bocas e aletas a cada arma */
    const len=46+L*1.2,hh=18+Math.min(8,w*.6);
    rr(g,-12,-hh/2,len,hh,7,vg(g,-hh/2,hh/2,w===0?'#4f8a4a':C));
    rr(g,len-16,-hh/2-1,8,hh+2,3,A==='#ffffff'?'#ff9a2f':A);
    rr(g,-14,-hh/2+2,6,hh-4,2,'#2a2e45');
    g.fillStyle=gold?'#fff3b0':'#ffcc2e';g.fillRect(6,-hh/2,4,hh);
    const n=w>=10?4:w>=7?3:w>=3?2:1;
    for(let i=0;i<n;i++){const yy=-hh/2+hh*(i+.5)/n;circ(g,len-8,yy,Math.max(2,hh/(n*2.6)),'#2a2e45',true);}
    if(w>=5){g.beginPath();g.moveTo(0,-hh/2);g.lineTo(-6,-hh/2-7);g.lineTo(8,-hh/2);g.closePath();g.fillStyle=A;g.fill();g.stroke();g.beginPath();g.moveTo(0,hh/2);g.lineTo(-6,hh/2+7);g.lineTo(8,hh/2);g.closePath();g.fill();g.stroke();}
    if(w===8){g.fillStyle='#ff5a36';g.beginPath();g.moveTo(len-4,-5);g.lineTo(len+8,0);g.lineTo(len-4,5);g.fill();}
  } else if(ch.atk==='net'){
    /* lança-redes do Seu Bento: vara mais longa, rede maior e mais boias a cada arma */
    const len=30+L*1.1,nr=8+Math.min(6,w*.45);
    rr(g,0,-3.5,len,7,3,vg(g,-3.5,3.5,w===0?'#8a5a32':lt(C,-.15)));
    if(w>=3)rr(g,6,-6,8,12,3,A==='#ffffff'?'#ff7a2f':A);
    g.globalAlpha=.95;g.lineWidth=2;g.strokeStyle=w>=9?'#fff':'#f4f1ff';g.beginPath();
    for(let i=-1;i<=1;i++){g.moveTo(len+nr*.2,i*nr*.55);g.lineTo(len+nr*2,i*nr*.55);g.moveTo(len+nr*(1.1+i*.55),-nr);g.lineTo(len+nr*(1.1+i*.55),nr);}g.stroke();g.globalAlpha=1;ink(g,2.5);
    g.beginPath();g.ellipse(len+nr*1.1,0,nr*.95,nr,0,0,7);g.stroke();ink(g);
    const fl=w>=10?3:w>=5?2:1;for(let i=0;i<fl;i++)circ(g,len+nr*1.1+(i-(fl-1)/2)*nr*.7,-nr-2,2.6,i%2?'#fff':'#ff5d73');
    if(w===12)rr(g,0,-3.5,len,3,1.5,'#fff3b0');
  } else {
    /* rebitadeira: mais comprida, cano duplo/triplo, bobina elétrica e cobre/ouro */
    const len=30+L;
    rr(g,0,-6.5,len,13,5,vg(g,-6.5,6.5,C));
    rr(g,13,-7.5,6,15,2,A);
    const nb=w>=8?3:w>=3?2:1;
    for(let i=0;i<nb;i++){const yy=(i-(nb-1)/2)*6;rr(g,len-4,yy-4.2,8+(w>=5?3:0),8.4,3,vg(g,yy-4,yy+4,w>=12?'#ffcc2e':'#5b6378'));}
    if(w===6||w===11)zig(g,4,len-6,0,'#7ee6ff');
    if(w>=4&&w!==6&&w!==11){g.fillStyle='rgba(255,255,255,.45)';g.fillRect(4,-5,len-10,2.5);}
    if(w===7||w===13){for(let i=0;i<3;i++){g.beginPath();g.moveTo(6+i*7,-6.5);g.lineTo(9+i*7,-12);g.lineTo(12+i*7,-6.5);g.closePath();g.fillStyle='#d0d6e2';g.fill();g.stroke();}}
    if(w===9){rr(g,-8,-9,10,18,4,'#8a5a32');}
  }
  circ(g,3,0,5.5,'#ffd2a6');
  if(leg){for(let i=0;i<3;i++){const ang=(t||0)*3+i*2.1;star(g,22+Math.cos(ang)*20,Math.sin(ang)*14,4,'#fff');}}
  g.restore();
}
/* ---------- roupas do nível 20 (liberadas quando o personagem chega no nível 20) ---------- */
export const LV20=20;
export const ALT2:{[k:string]:{name:string,body:string,belt:string,hair?:string}}={
  tita:{name:'Pirata',body:'#b3262f',belt:'#ffcc2e'},
  lia:{name:'Cavaleira',body:'#8a93a8',belt:'#ffcc2e'},
  zeca:{name:'Rei',body:'#6b3fa0',belt:'#ffcc2e'},
  rui:{name:'Ciborgue',body:'#4b4f6e',belt:'#7ee6ff'},
  bento:{name:'Capitão',body:'#9be07a',belt:'#ffcc2e'},
};
/* ---------- roupas da Loja (compradas com engrenagens) ---------- */
export const SHOPO:{[k:string]:{name:string,body:string,belt:string,hair?:string}}={
  tita:{name:'Surfista',body:'#ff9f43',belt:'#22c7c7'},
  lia:{name:'Bruxa',body:'#5b2a86',belt:'#2fd1c5'},
  zeca:{name:'Cowboy',body:'#8a5a32',belt:'#ffcc2e'},
  rui:{name:'Cozinheiro',body:'#f4f1ff',belt:'#ef5350'},
  bento:{name:'Havaiano',body:'#9be07a',belt:'#ff5d8f'},
};
/* ---------- roupas especiais (uma para cada personagem) ---------- */
export const ALT:{[k:string]:{name:string,body:string,belt:string,hair?:string}}={
  tita:{name:'Astronauta',body:'#e9ecf5',belt:'#4cb7ff'},
  lia:{name:'Ninja',body:'#2d2a40',belt:'#e8474f',hair:'#1d1436'},
  zeca:{name:'Pirata',body:'#c0392b',belt:'#ffcc2e'},
  rui:{name:'Bombeiro',body:'#ef5350',belt:'#ffcc2e'},
  bento:{name:'Pescador',body:'#9be07a',belt:'#ffcc2e'},
};
/** personagem já vestido com uma roupa (para as prévias) */
export function dressCh(id:string,sk?:string){const c:any=CH.find((h:any)=>h.id===id)||CH[0];const A=sk==='alt'?ALT[id]:sk==='lv20'?ALT2[id]:sk==='shop'?SHOPO[id]:null;if(!A)return c;return Object.assign({},c,{body:A.body,belt:A.belt,hair:A.hair||c.hair,sk});}
/* acessórios da roupa especial, desenhados por cima da cabeça */
export function altGear(g:any,ch:any,x:number,by:number,fx:number,t:number){
  const id=ch.id;ink(g);
  if(ch.sk==='lv20'){lv20Gear(g,ch,x,by,fx,t);return;}
  if(ch.sk==='shop'){shopGear(g,ch,x,by,fx,t);return;}
  if(id==='bento'){g.beginPath();g.arc(x,by-40,17,Math.PI,0);g.closePath();g.fillStyle=vg(g,by-57,by-40,'#ffcc2e');g.fill();g.stroke();ell(g,x,by-40,25,5,'#e6a300');return;}
  if(id==='tita'){
    g.globalAlpha=.25;circ(g,x,by-36,23,'#bfe9ff',true);g.globalAlpha=1;
    g.lineWidth=3;g.strokeStyle=INK;g.beginPath();g.arc(x,by-36,23,0,7);g.stroke();
    g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=3;g.beginPath();g.arc(x,by-36,17,-2.6,-1.7);g.stroke();ink(g);
    g.beginPath();g.moveTo(x+fx*14,by-55);g.lineTo(x+fx*19,by-66);g.lineWidth=2.5;g.stroke();ink(g);
    circ(g,x+fx*19,by-67,3.5,(Math.sin(t*6)>0)?'#ff5d73':'#ffe14d');
    rr(g,x-14,by-15,28,5,2,'#4cb7ff');
  } else if(id==='lia'){
    g.lineCap='round';
    for(const dy of [0,9]){g.beginPath();g.moveTo(x-fx*15,by-44);g.quadraticCurveTo(x-fx*24,by-46+dy,x-fx*30,by-40+dy+Math.sin(t*5+dy)*2);g.lineWidth=7;g.strokeStyle=INK;g.stroke();g.lineWidth=4;g.strokeStyle='#e8474f';g.stroke();}
    ink(g);rr(g,x-17,by-47,34,7,3,'#e8474f');circ(g,x,by-43.5,2.5,'#fff',true);
  } else if(id==='zeca'){
    g.beginPath();g.arc(x,by-37,17,Math.PI,0);g.closePath();g.fillStyle=vg(g,by-54,by-37,'#e8474f');g.fill();g.stroke();
    for(const [dx,dy] of [[-8,-43],[0,-48],[8,-43],[-2,-40]])circ(g,x+dx,by+dy,1.8,'#fff',true);
    g.beginPath();g.moveTo(x-fx*15,by-40);g.lineTo(x-fx*25,by-46);g.lineTo(x-fx*24,by-36);g.closePath();g.fillStyle='#e8474f';g.fill();g.stroke();
    circ(g,x+fx*14,by-27,2.8,'#ffcc2e');
  } else if(id==='rui'){
    g.beginPath();g.arc(x,by-39,18,Math.PI,0);g.closePath();g.fillStyle=vg(g,by-57,by-39,'#ffcc2e');g.fill();g.stroke();
    ell(g,x+fx*3,by-39,24,5,'#e6a300');
    g.beginPath();g.moveTo(x,by-57);g.lineTo(x,by-42);g.lineWidth=3;g.stroke();ink(g);
    circ(g,x,by-48,4.5,'#ef5350');
  }
}
/* acessórios das roupas do nível 20 */
function lv20Gear(g:any,ch:any,x:number,by:number,fx:number,t:number){
  const id=ch.id;ink(g);
  if(id==='bento'){rr(g,x-18,by-50,36,11,4,'#1d3d7a');rr(g,x-20,by-42,40,5,2,'#14295a');g.fillStyle='#ffcc2e';g.fillRect(x-18,by-46,36,2.5);circ(g,x,by-48,3.5,'#ffcc2e');return;}
  if(id==='tita'){
    /* chapéu de pirata com caveira */
    g.beginPath();g.moveTo(x-26,by-44);g.quadraticCurveTo(x-14,by-50,x-10,by-64);g.quadraticCurveTo(x,by-58,x+10,by-64);g.quadraticCurveTo(x+14,by-50,x+26,by-44);g.quadraticCurveTo(x,by-52,x-26,by-44);g.closePath();
    g.fillStyle=vg(g,by-64,by-44,'#2d2a40');g.fill();g.stroke();
    g.beginPath();g.moveTo(x-22,by-46);g.quadraticCurveTo(x,by-53,x+22,by-46);g.lineWidth=2.5;g.strokeStyle='#ffcc2e';g.stroke();ink(g);
    circ(g,x,by-56,4.5,'#fff');circ(g,x-1.6,by-56.5,1,INK,true);circ(g,x+1.6,by-56.5,1,INK,true);
    g.beginPath();g.moveTo(x-5,by-50);g.lineTo(x+5,by-53);g.moveTo(x+5,by-50);g.lineTo(x-5,by-53);g.lineWidth=1.8;g.strokeStyle='#fff';g.stroke();ink(g);
    circ(g,x+fx*15,by-27,2.8,'#ffcc2e');
  } else if(id==='lia'){
    /* elmo de cavaleira com pluma */
    g.lineCap='round';g.beginPath();g.moveTo(x,by-54);g.quadraticCurveTo(x-fx*12,by-72+Math.sin(t*4)*2,x-fx*26,by-62);g.lineWidth=9;g.strokeStyle=INK;g.stroke();g.lineWidth=5.5;g.strokeStyle='#e8474f';g.stroke();ink(g);
    g.beginPath();g.arc(x,by-38,18,Math.PI,0);g.closePath();g.fillStyle=vg(g,by-56,by-38,'#d5dbe6');g.fill();g.stroke();
    rr(g,x-18,by-44,36,6,3,'#9aa3b8');
    g.beginPath();g.moveTo(x,by-56);g.lineTo(x,by-44);g.lineWidth=2.5;g.stroke();ink(g);
    rr(g,x-16,by-15,32,6,2,'#c5ccd8');
  } else if(id==='zeca'){
    /* coroa e capa de rei */
    g.beginPath();g.moveTo(x-14,by-20);g.lineTo(x-fx*22-fx*2,by+2);g.lineTo(x-fx*6,by-4);g.closePath();g.fillStyle='#4b2a80';g.fill();g.stroke();
    g.beginPath();g.moveTo(x-14,by-50);g.lineTo(x-14,by-62);g.lineTo(x-7,by-55);g.lineTo(x,by-66);g.lineTo(x+7,by-55);g.lineTo(x+14,by-62);g.lineTo(x+14,by-50);g.closePath();g.fillStyle=vg(g,by-66,by-50,'#ffcc2e');g.fill();g.stroke();
    circ(g,x,by-56,2.6,'#e8474f',true);circ(g,x-8,by-53,2,'#4cb7ff',true);circ(g,x+8,by-53,2,'#4cd964',true);
    rr(g,x-14,by-16,28,4,2,'#fff');
  } else if(id==='rui'){
    /* capacete de ciborgue com visor */
    g.beginPath();g.arc(x,by-38,18,Math.PI,0);g.closePath();g.fillStyle=vg(g,by-56,by-38,'#6b6f85');g.fill();g.stroke();
    g.globalAlpha=.55+.25*Math.sin(t*5);rr(g,x-15,by-36,30,7,3,'#ff3b55');g.globalAlpha=1;
    g.lineWidth=2.5;g.strokeStyle=INK;g.beginPath();g.moveTo(x+fx*10,by-55);g.lineTo(x+fx*14,by-66);g.stroke();ink(g);
    circ(g,x+fx*14,by-67,3,'#7ee6ff');
    circ(g,x-fx*16,by-40,4,'#9aa3b8');
  }
}
/* acessórios das roupas da Loja */
function lei(g:any,x:number,y:number){for(let i=0;i<7;i++){const a=Math.PI*(.15+i*.7/6);circ(g,x+Math.cos(a)*13,y+Math.sin(a)*5,3.2,['#ff5d8f','#ffe14d','#fff','#ff9f43'][i%4]);}}
function shopGear(g:any,ch:any,x:number,by:number,fx:number,t:number){
  const id=ch.id;ink(g);
  if(id==='tita'){lei(g,x,by-18);circ(g,x-fx*13,by-46,5,'#ff5d8f');circ(g,x-fx*13,by-46,2,'#ffe14d',true);}
  else if(id==='lia'){
    ell(g,x,by-47,25,6,'#3a1d5e');
    g.beginPath();g.moveTo(x-14,by-48);g.lineTo(x+fx*8,by-82);g.lineTo(x+14,by-48);g.closePath();g.fillStyle=vg(g,by-82,by-48,'#5b2a86');g.fill();g.stroke();
    rr(g,x-13,by-54,26,5,2,'#2fd1c5');star(g,x+fx*3,by-64,4,'#ffe14d');
  } else if(id==='zeca'){
    ell(g,x,by-46,27,7,'#8a5a32');
    g.beginPath();g.moveTo(x-13,by-46);g.quadraticCurveTo(x-14,by-66,x,by-60);g.quadraticCurveTo(x+14,by-66,x+13,by-46);g.closePath();g.fillStyle=vg(g,by-66,by-46,'#a0703f');g.fill();g.stroke();
    rr(g,x-13,by-51,26,4,2,'#5a3418');
  } else if(id==='rui'){
    rr(g,x-14,by-52,28,10,3,'#fff');
    for(const dx of [-10,0,10])circ(g,x+dx,by-60,9,'#fff');
    rr(g,x-14,by-52,28,4,2,'#e4def5');
  } else if(id==='bento'){
    ell(g,x,by-42,26,7,'#e6c46a');
    g.beginPath();g.arc(x,by-44,15,Math.PI,0);g.closePath();g.fillStyle=vg(g,by-59,by-44,'#f2d27a');g.fill();g.stroke();
    rr(g,x-15,by-47,30,4,2,'#ff5d8f');lei(g,x,by-16);
  }
}
/* rede presa num robô (fica lento) */
export function netOver(g:any,x:number,y:number,r:number){
  g.save();g.globalAlpha=.75;g.lineWidth=2;g.strokeStyle='#f4f1ff';g.beginPath();
  for(let i=-2;i<=2;i++){g.moveTo(x-r,y+i*r*.35);g.lineTo(x+r,y+i*r*.35);g.moveTo(x+i*r*.35,y-r);g.lineTo(x+i*r*.35,y+r);}
  g.stroke();g.globalAlpha=1;g.restore();ink(g,2.5);g.beginPath();g.ellipse(x,y,r,r*.9,0,0,7);g.stroke();ink(g);
}
/* Seu Bento como personagem jogável (tartaruga pescadora) */
export function drawBentoHero(g:any,x:number,y:number,a:number,t:number,mv:boolean,fl:number,ch:any){
  ink(g);
  const st=mv?Math.sin(t*13):0,b=mv?-Math.abs(Math.sin(t*13))*3:Math.sin(t*3)*1.2,fx=Math.cos(a)>=0?1:-1;
  ell(g,x-9,y-1+st*2,7,4.5,'#3d7f35');ell(g,x+9,y-1-st*2,7,4.5,'#3d7f35');
  const by=y+b,behind=Math.sin(a)<-0.25;
  if(behind)weapon(g,ch,x,by-12,a,t);
  ell(g,x,by-12,21,15,rg(g,x,by-12,21,'#4d9a43'));
  g.fillStyle='#3d7f35';[[-9,-14],[0,-18],[9,-14],[-5,-6],[5,-6]].forEach(p=>{g.beginPath();g.arc(x+p[0],by+p[1],4,0,7);g.fill();});
  g.fillStyle=ch.belt||'#fff';g.fillRect(x-15,by-6,30,3.5);
  ell(g,x,by-33,16,14,rg(g,x,by-33,16,ch.body||'#9be07a'));
  if(!ch.sk){rr(g,x-12,by-50,24,7,3,'#fff');rr(g,x-4,by-53,8,4,2,ch.hair||'#2c76d1');}
  const ex=Math.cos(a)*2.5,ey=Math.sin(a)*1.4;
  g.lineWidth=2.2;g.beginPath();g.arc(x-5.5+ex,by-34+ey,4.6,0,7);g.stroke();g.beginPath();g.arc(x+5.5+ex,by-34+ey,4.6,0,7);g.stroke();
  g.beginPath();g.moveTo(x-1+ex,by-34+ey);g.lineTo(x+1+ex,by-34+ey);g.stroke();ink(g);
  eye(g,x-5.5+ex,by-34+ey,.6);eye(g,x+5.5+ex,by-34+ey,.6);
  g.beginPath();g.arc(x+ex,by-27+ey,4,0.15*Math.PI,0.85*Math.PI);g.lineWidth=2;g.stroke();ink(g);
  if(ch.sk)altGear(g,ch,x,by+4,fx,t);
  if(!behind)weapon(g,ch,x,by-12,a,t);
  if(fl>0){g.globalAlpha=Math.min(1,fl*6)*.75;circ(g,x,by-22,21,'#fff',true);g.globalAlpha=1;}
}

export function drawHero(g?:any,x?:any,y?:any,a?:any,t?:any,mv?:any,fl?:any,ch?:any){
  ch=ch||CH[0];if(ch.id==='bento'){drawBentoHero(g,x,y,a,t,mv,fl,ch);return;}ink(g);
  const st=mv?Math.sin(t*13):0;
  const b=mv?-Math.abs(Math.sin(t*13))*3:Math.sin(t*3)*1.2;
  const fx=Math.cos(a)>=0?1:-1;
  ell(g,x-7,y-1+st*2,6.5,4.5,'#3a2b5c');ell(g,x+7,y-1-st*2,6.5,4.5,'#3a2b5c');
  const by=y+b,behind=Math.sin(a)<-0.25,wy=ch.atk==='rocket'?by-18:by-12;
  if(behind)weapon(g,ch,x,wy,a,t);
  rr(g,x-13,by-24,26,22,9,vg(g,by-24,by-2,ch.body));
  g.fillStyle=ch.belt;g.fillRect(x-11.5,by-11,23,4);
  g.fillStyle=lt(ch.body,-.25);g.fillRect(x-3,by-22,6,8);
  const id=ch.id;
  if(id==='tita')circ(g,x-fx*15,by-38,7.5,rg(g,x-fx*15,by-38,7.5,ch.hair));
  if(id==='lia')ell(g,x,by-32,19,17,vg(g,by-49,by-15,ch.hair));
  circ(g,x,by-35,15,rg(g,x,by-35,15,'#ffd2a6'));
  if(id==='tita'){
    g.beginPath();g.arc(x,by-36,16.5,Math.PI,0);g.lineTo(x+16.5,by-33);
    g.quadraticCurveTo(x+8,by-41,x+1,by-34);g.quadraticCurveTo(x-7,by-41,x-16.5,by-33);g.closePath();
    g.fillStyle=vg(g,by-53,by-33,ch.hair);g.fill();g.stroke();
    rr(g,x-12,by-50,24,7,3,'#3a2b5c');circ(g,x-6,by-47,4,'#7ee6ff');circ(g,x+6,by-47,4,'#7ee6ff');
  } else if(id==='lia'){
    g.beginPath();g.arc(x,by-36,17,Math.PI,0);g.lineTo(x+17,by-38);g.lineTo(x-17,by-38);g.closePath();g.fillStyle=vg(g,by-53,by-36,ch.hair);g.fill();g.stroke();
    if(!ch.sk){ell(g,x+fx*3,by-51,15,6,'#e8474f');circ(g,x+fx*3,by-57,3,'#e8474f');}
  } else if(id==='zeca'){
    if(!ch.sk){g.beginPath();g.arc(x,by-37,16.5,Math.PI,0);g.closePath();g.fillStyle=vg(g,by-54,by-37,'#3fbf55');g.fill();g.stroke();
    ell(g,x+fx*16,by-38,12,4.5,'#2e9a43');
    g.fillStyle='#fff';g.beginPath();g.arc(x-fx*2,by-46,4,0,7);g.fill();}
    g.fillStyle=ch.hair;g.fillRect(x-14,by-38,4,6);g.fillRect(x+10,by-38,4,6);
  } else if(id==='rui'){
    if(!ch.sk){g.beginPath();g.moveTo(x-16,by-38);
    for(let i=0;i<6;i++){const px=x-16+i*6.4;g.lineTo(px+3.2,by-60+(i%2)*4);g.lineTo(px+6.4,by-44);}
    g.lineTo(x+16,by-38);g.closePath();g.fillStyle=vg(g,by-60,by-38,ch.hair);g.fill();g.stroke();
    rr(g,x-16,by-44,32,6,3,'#ffcc2e');}
  }
  const ex=Math.cos(a)*3,ey=Math.sin(a)*1.6;
  eye(g,x-5+ex,by-31+ey);eye(g,x+5+ex,by-31+ey);
  if(id==='rui'){g.beginPath();g.moveTo(x-10+ex,by-38);g.lineTo(x-2+ex,by-36);g.moveTo(x+10+ex,by-38);g.lineTo(x+2+ex,by-36);g.lineWidth=2.5;g.stroke();ink(g);}
  g.fillStyle='rgba(255,120,120,.35)';g.beginPath();g.ellipse(x-10+ex*.5,by-26,3.5,2,0,0,7);g.ellipse(x+10+ex*.5,by-26,3.5,2,0,0,7);g.fill();
  g.beginPath();g.arc(x+ex,by-25+ey,3,0.15*Math.PI,0.85*Math.PI);g.lineWidth=2;g.stroke();ink(g);
  if(ch.sk)altGear(g,ch,x,by,fx,t);
  if(!behind)weapon(g,ch,x,wy,a,t);
  if(fl>0){g.globalAlpha=Math.min(1,fl*6)*.75;circ(g,x,by-25,21,'#fff',true);g.globalAlpha=1;}
}
export function drawBento(g?:any,x?:any,y?:any,t?:any){
  ink(g);const b=Math.sin(t*2.5)*1.5;
  ell(g,x,y+4,34,24,rg(g,x,y+4,34,'#4d9a43'));
  g.fillStyle='#3d7f35';[[-14,0],[0,-6],[14,0],[-7,12],[7,12]].forEach(p=>{g.beginPath();g.arc(x+p[0],y+4+p[1],6,0,7);g.fill();});
  ell(g,x,y-24+b,23,20,rg(g,x,y-24+b,23,'#9be07a'));
  rr(g,x-17,y-48+b,34,10,4,'#fff');rr(g,x-6,y-52+b,12,6,3,'#2c76d1');
  g.beginPath();g.arc(x-8,y-26+b,6.5,0,7);g.stroke();g.beginPath();g.arc(x+8,y-26+b,6.5,0,7);g.stroke();
  g.beginPath();g.moveTo(x-2,y-26+b);g.lineTo(x+2,y-26+b);g.stroke();
  eye(g,x-8,y-26+b,.8);eye(g,x+8,y-26+b,.8);
  g.beginPath();g.arc(x,y-17+b,6,0.15*Math.PI,0.85*Math.PI);g.lineWidth=2.5;g.stroke();ink(g);
}
export function drawBot(g?:any,e?:any,t?:any,a?:any){
  ink(g);
  const x=e.x,y=e.y,mv=e.mv;
  const b=mv?-Math.abs(Math.sin(t*11+e.wob))*3:Math.sin(t*3+e.wob)*1.2;
  const by=y+b,ex=Math.cos(a)*3,ey=Math.sin(a)*2;
  if(e.type==='d'){
    const w=Math.sin(t*3+e.wob)*.08+(e.fl>0?Math.sin(t*50)*.25:0);
    rr(g,x-5,y-30,10,30,3,'#8a5a32');ell(g,x,y-1,16,6,'#6b6f85');
    g.save();g.translate(x,y-40);g.rotate(w);
    circ(g,0,0,20,'#fff');circ(g,0,0,14,'#ff5d73');circ(g,0,0,8,'#fff');circ(g,0,0,3.5,'#ff5d73');
    g.restore();
  } else if(e.type==='g'||e.type==='f'){const F=e.type==='f';
    const st=mv?Math.sin(t*11+e.wob)*2:0;
    rr(g,x-12,y-6+st,7,8,3,F?'#7a2a14':'#4b3f80');rr(g,x+5,y-6-st,7,8,3,F?'#7a2a14':'#4b3f80');
    if(F){const fh=8+Math.sin(t*18+e.wob)*3;g.beginPath();g.moveTo(x-9,by-30);g.quadraticCurveTo(x-6,by-38-fh,x,by-44-fh);g.quadraticCurveTo(x+6,by-38-fh,x+9,by-30);g.closePath();g.fillStyle='#ffcc2e';g.fill();g.stroke();g.beginPath();g.moveTo(x-4,by-30);g.quadraticCurveTo(x,by-38-fh*.6,x+4,by-30);g.closePath();g.fillStyle='#ff5a36';g.fill();}
    else{g.beginPath();g.moveTo(x,by-30);g.lineTo(x+3,by-40);g.stroke();
    circ(g,x+3,by-42,4,(Math.sin(t*6+e.wob)>0||e.alert)?'#ff5d73':'#ffb3bf');}
    rr(g,x-17,by-32,34,28,11,vg(g,by-32,by-4,F?'#ff7a2f':'#8d78e0'));
    g.fillStyle=F?'#d9481f':'#6a57c2';g.fillRect(x-15.5,by-13,31,5);
    circ(g,x+ex*.6,by-20+ey*.4,9,'#fff');
    circ(g,x+ex*1.4,by-20+ey,4.2,e.alert?'#ff3b55':'#5b4aa8',true);
    if(e.alert){g.beginPath();g.moveTo(x-9,by-32);g.lineTo(x+1,by-28);g.moveTo(x+9,by-32);g.lineTo(x+1,by-28);g.stroke();}
    if(e.lunge>0){g.globalAlpha=.6;circ(g,x+Math.cos(a)*22,by-14+Math.sin(a)*14,8,'#fff',true);g.globalAlpha=1;}
  } else if(e.type==='s'){
    ell(g,x-7,y-2,6,4,'#5a4a1e');ell(g,x+7,y-2,6,4,'#5a4a1e');
    const behind=Math.sin(a)<-0.25;
    const arm=()=>{g.save();g.translate(x,by-14);g.rotate(a);rr(g,4,-5,26,10,4,vg(g,-5,5,'#6b6f85'));rr(g,24,-6,7,12,2,e.wind?'#ff5d73':'#3a3e55');g.restore();};
    if(behind)arm();
    g.beginPath();g.moveTo(x-17,by-6);g.lineTo(x-15,by-26);g.quadraticCurveTo(x,by-46,x+15,by-26);g.lineTo(x+17,by-6);g.closePath();g.fillStyle=vg(g,by-42,by-6,'#ffc93c');g.fill();g.stroke();
    rr(g,x-12,by-28,24,10,5,'#2c2550');
    g.fillStyle=e.wind?'#ff5d73':'#59f0ff';g.fillRect(x-7+ex*1.2,by-25,8,4);
    g.fillStyle='#e9a925';g.fillRect(x-15,by-12,30,4);
    if(!behind)arm();
    if(e.wind){g.globalAlpha=.5+.5*Math.sin(t*40);circ(g,x+Math.cos(a)*32,by-14+Math.sin(a)*32,6,'#ff5d73',true);g.globalAlpha=1;}
  } else if(e.type==='t'){
    rr(g,x-27,by-10,54,14,7,'#3a3e55');
    for(let i=0;i<5;i++){g.fillStyle='#62667e';g.beginPath();g.arc(x-20+i*10,by-3,3,0,7);g.fill();}
    rr(g,x-24,by-34,48,28,12,vg(g,by-34,by-6,'#ef5350'));
    g.fillStyle='#c93c3a';g.fillRect(x-22.5,by-15,45,4);
    g.save();g.translate(x,by-28);g.rotate(a);rr(g,4,-6,30,12,4,vg(g,-6,6,'#4a4e66'));rr(g,30,-7,7,14,2,'#2a2e45');g.restore();
    circ(g,x,by-30,13,rg(g,x,by-30,13,'#ff7a6f'));
    circ(g,x+ex,by-31+ey*.5,4,'#ffe14d');
  } else if(e.type==='X'){if(e.mega){g.save();g.translate(x,y);g.scale(1.35,1.35);g.translate(-x,-y);}
    const ch=e.st==='windup';
    const X=x+(ch?(Math.random()-.5)*4:0);
    ell(g,X-14,y-2,11,6,'#2c2140');ell(g,X+14,y-2,11,6,'#2c2140');
    g.save();g.translate(X+(Math.cos(a)>=0?-30:30),by-30);
    rr(g,-6,-6,12,26,6,'#3a2b5c');
    g.beginPath();g.arc(0,26,8,0,Math.PI*1.3);g.lineWidth=6;g.strokeStyle=INK;g.stroke();g.lineWidth=3;g.strokeStyle='#c5cbe0';g.stroke();ink(g);
    g.restore();
    rr(g,X-34,by-56,68,54,24,vg(g,by-56,by-2,'#3a2b5c'));
    rr(g,X-26,by-50,52,40,18,vg(g,by-50,by-10,'#c0623a'));
    g.fillStyle='#ffcc2e';[[-10,-30],[-10,-18],[10,-30],[10,-18]].forEach(p=>{g.beginPath();g.arc(X+p[0],by+p[1],2.5,0,7);g.fill();});
    rr(g,X-24,by-86,48,36,14,vg(g,by-86,by-50,'#d97b4c'));
    rr(g,X-14,by-62,28,9,3,'#2c2140');
    g.fillStyle='#ffcc2e';for(let i=0;i<4;i++)g.fillRect(X-11+i*7,by-61,3,7);
    circ(g,X+9+ex*.6,by-73,6.5,ch?'#ff3b55':'#ffe14d');
    if(!ch){g.globalAlpha=.35;circ(g,X+9+ex*.6,by-73,11,'#ffe14d',true);g.globalAlpha=1;}
    rr(g,X-17,by-79,13,11,4,'#2c2140');g.beginPath();g.moveTo(X-24,by-84);g.lineTo(X+24,by-70);g.lineWidth=2.5;g.stroke();ink(g);
    g.beginPath();g.moveTo(X-36,by-84);g.quadraticCurveTo(X,by-80,X+36,by-84);g.quadraticCurveTo(X+20,by-118,X,by-112);g.quadraticCurveTo(X-20,by-118,X-36,by-84);g.closePath();g.fillStyle=vg(g,by-116,by-82,'#2f2450');g.fill();g.stroke();
    g.fillStyle='#ffcc2e';g.fillRect(X-33,by-88,66,3);
    gearShape(g,X,by-98,7,'#fff');
    g.save();g.translate(X,by-30);g.rotate(a);rr(g,18,-8,30,16,5,vg(g,-8,8,'#4a4e66'));rr(g,44,-10,9,20,3,'#2a2e45');g.restore();
    if(e.mega){g.restore();g.globalAlpha=.22+.12*Math.sin(t*6);circ(g,x,by-60,70,'#ff5a36',true);g.globalAlpha=1;}
  }
  if(e.slowT>0)netOver(g,x,by-(e.type==='X'?50:18),e.r+6);
  if(e.fl>0){g.globalAlpha=Math.min(1,e.fl*6)*.7;circ(g,x,by-(e.type==='X'?50:20),e.r+5,'#fff',true);g.globalAlpha=1;}
}

/* ---------- desenhos das telas (personagem do início, prévia, retratos, cartões) ---------- */
const clampD=(v:number,a:number,b:number)=>v<a?a:v>b?b:v;
export interface HomeState { face:number; drag:any; hop:number; vel:number }
export function paintMenuScene(g:any,HOME:HomeState,clock:number,ch:any){
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,520,520);
  if(!HOME.drag){HOME.face+=HOME.vel;HOME.vel*=.92;}
  HOME.hop=Math.max(0,HOME.hop-1/60);
  const cx=260,cy=400;
  const glow=g.createRadialGradient(cx,cy-120,10,cx,cy-120,260);glow.addColorStop(0,'rgba(255,214,90,.45)');glow.addColorStop(1,'rgba(255,214,90,0)');g.fillStyle=glow;g.fillRect(0,0,520,520);
  g.save();g.translate(cx,cy-60);g.globalAlpha=.12;g.fillStyle='#fff';for(let i=0;i<8;i++){g.rotate(Math.PI/4+clock*.02);g.beginPath();g.moveTo(0,0);g.lineTo(-30,-260);g.lineTo(30,-260);g.closePath();g.fill();}g.restore();g.globalAlpha=1;
  ink(g,5);ell(g,cx,cy+18,200,52,'#2a1b5e');ell(g,cx,cy,200,52,vg(g,cy-52,cy+52,'#6b4fd6'));
  g.lineWidth=6;g.strokeStyle='#ffb800';g.beginPath();g.ellipse(cx,cy,176,44,0,0,7);g.stroke();
  g.lineWidth=2;g.strokeStyle='rgba(255,240,180,'+(.5+.3*Math.sin(clock*3))+')';g.beginPath();g.ellipse(cx,cy,186,48,0,0,7);g.stroke();
  for(let i=0;i<6;i++){const a=clock*.8+i*Math.PI/3,x=cx+Math.cos(a)*215,y=cy-70+Math.sin(a)*40-Math.sin(clock*2+i)*8;
    g.save();g.translate(x,y);g.rotate(clock*1.5+i);ink(g,2.5);rr(g,-7,-7,14,14,3,i%2?'#ffcc2e':'#22c7c7');g.restore();}
  const hopY=-Math.sin(Math.PI*clampD(HOME.hop/.5,0,1))*40;
  g.save();g.translate(cx,cy-6+hopY);g.scale(4.4,4.4);shadow(g,0,6-hopY/4.4,15);drawHero(g,0,0,HOME.face,clock,false,0,ch);g.restore();
}
export function paintMenuBg(g:any,w:number,h:number){
  g.setTransform(1,0,0,1,0,0);
  g.fillStyle='#2d1d70';g.fillRect(0,0,w,h);
  const R=Math.hypot(w*1.2,h*.9);
  const gr=g.createRadialGradient(w*.3,0,0,w*.3,0,R*.75);gr.addColorStop(0,'#4b2fb3');gr.addColorStop(1,'#2d1d70');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(255,255,255,.05)';
  const step=52*Math.SQRT2,band=26*Math.SQRT2;
  for(let x=-h;x<w+h;x+=step){g.beginPath();g.moveTo(x,0);g.lineTo(x+band,0);g.lineTo(x+band-h,h);g.lineTo(x-h,h);g.closePath();g.fill();}
}
export function paintSkin(g:any,clock:number,ch:any){g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,240,240);g.fillStyle='rgba(75,47,179,.12)';g.beginPath();g.arc(120,140,95,0,7);g.fill();
  g.save();g.translate(120,214);g.scale(3,3);shadow(g,0,0,16);drawHero(g,0,0,Math.sin(clock)*.5+.3,clock,false,0,ch);g.restore();}
export function paintPortrait(pg:any,spk:string,clock:number,ch:any){
  pg.setTransform(1,0,0,1,0,0);pg.clearRect(0,0,240,240);
  pg.fillStyle=spk==='ferrugem'?'#ffd9c9':spk==='bento'?'#dff7d2':'#d4f6f6';pg.fillRect(0,0,240,240);
  pg.save();
  if(spk==='tita'){pg.translate(120,236);pg.scale(3.4,3.4);drawHero(pg,0,0,.4,clock,false,0,ch);}
  else if(spk==='bento'){pg.translate(120,188);pg.scale(3.2,3.2);drawBento(pg,0,0,clock);}
  else{pg.translate(120,262);pg.scale(1.9,1.9);drawBot(pg,{type:'X',x:0,y:0,wob:0,mv:false,fl:0,r:36,st:'idle'},clock,.5);}
  pg.restore();
}
export function paintHeroCard(g:any,i:number,sel:number,clock:number){
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,220,220);
  g.fillStyle=i===sel?'rgba(255,255,255,.55)':'rgba(45,29,112,.08)';g.beginPath();g.arc(110,128,84,0,7);g.fill();
  g.save();g.translate(110,196);g.scale(2.7,2.7);shadow(g,0,0,16);drawHero(g,0,0,i===sel?Math.sin(clock*1.5)*.4:.3,clock+i,false,0,CH[i]);g.restore();
}

/* prévia de uma arma (tela de Armas) */
export function paintWeapon(g:any,id:string,wi:number,lock:boolean){
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,120,60);
  const ch=Object.assign({},CH.find((h:any)=>h.id===id)||CH[0],{wi});
  if(lock)g.globalAlpha=.3;
  g.save();g.translate(20,30);g.scale(1.5,1.5);weapon(g,ch,0,0,0,performance.now()/1000);g.restore();
  g.globalAlpha=1;
}

/* desenho de cada modo (cartões da escolha de modo), canvas 320x180 */
export function paintMode(g:any,m:string,clock:number){
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,320,180);
  g.save();g.translate(160,92);g.globalAlpha=.16;g.fillStyle='#fff';for(let i=0;i<10;i++){g.rotate(Math.PI/5+clock*.03);g.beginPath();g.moveTo(0,0);g.lineTo(-22,-200);g.lineTo(22,-200);g.closePath();g.fill();}g.restore();g.globalAlpha=1;
  const hero=(i:number,x:number,y:number,k:number,a:number)=>{g.save();g.translate(x,y);g.scale(k,k);shadow(g,0,0,15);drawHero(g,0,0,a,clock+i,false,0,CH[i]);g.restore();};
  const bot=(type:string,x:number,y:number,k:number,a:number,w:number)=>{g.save();g.translate(x,y);g.scale(k,k);shadow(g,0,0,17);drawBot(g,{type,x:0,y:0,wob:w,mv:false,fl:0,r:type==='X'?36:17,st:'idle',alert:true},clock,a);g.restore();};
  if(m==='story'){
    /* farol com o coral brilhando */
    const gl=g.createRadialGradient(250,60,4,250,60,70);gl.addColorStop(0,'rgba(255,240,150,.85)');gl.addColorStop(1,'rgba(255,240,150,0)');g.fillStyle=gl;g.beginPath();g.arc(250,60,70,0,7);g.fill();
    ink(g,3);rr(g,238,40,24,100,6,'#fff');g.fillStyle='#ff5d73';g.fillRect(240,62,20,14);g.fillRect(240,96,20,14);rr(g,232,24,36,20,7,'#ffe14d');
    hero(0,110,172,3.6,.2);
  } else if(m==='waves'){
    bot('g',70,150,2.4,.3,1);bot('s',250,150,2.4,Math.PI-.3,2);bot('t',160,120,2.2,Math.PI/2,3);
    txt(g,'10',160,40,40,'#ffe14d');
  } else if(m==='online'){
    hero(1,80,170,2.7,.3);hero(3,240,170,2.7,Math.PI-.3);hero(0,160,178,3.1,.35);
  } else {
    hero(0,92,172,3.1,0);hero(1,228,172,3.1,Math.PI);
    star(g,160,92,30,'#ffe14d');txt(g,'VS',160,94,26,'#ff5d73');
  }
}
