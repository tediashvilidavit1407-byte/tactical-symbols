/* ===================== LEXICON ===================== */
const LEX=[];
const add=(cat,key,st)=>st.forEach(s=>LEX.push({cat,key,stem:s,whole:/^[a-z ]+$/.test(s)&&s.length<=4}));
for(const k in AFF)add('aff',k,AFF[k].stems);
for(const k in BR)add('br',k,BR[k].stems);
for(const k in MOD)add('mod',k,MOD[k].stems);
for(const k in ECH)add('ech',k,ECH[k].stems);
for(const k in TK)add('task',k,TK[k].stems);
AMBIG.forEach(a=>LEX.push({cat:'amb',key:a.keys,stem:a.stem}));
LEX.sort((a,b)=>b.stem.length-a.stem.length);

function labelOf(e){
  if(e.cat==='aff')return AFF[e.key].ka;
  if(e.cat==='br')return BR[e.key].ka;
  if(e.cat==='mod')return MOD[e.key].ka;
  if(e.cat==='ech')return ECH[e.key].ka;
  if(e.cat==='task')return TK[e.key].ka+' ('+TK[e.key].en+')';
  return e.stem;
}
function norm(t){return ' '+t.toLowerCase().replace(/[.,;:!?"'()\[\]«»„“”—–\/]/g,' ').replace(/-/g,' ').replace(/\s+/g,' ').trim()+' '}

function parse(text){
  let s=norm(text);const hits=[];
  for(const e of LEX){
    let from=0,i;
    while((i=s.indexOf(e.stem,from))!==-1){
      const L=e.stem.length;
      if(e.whole&&!(s[i-1]===' '&&s[i+L]===' ')){from=i+1;continue}
      const a=s.lastIndexOf(' ',i)+1;let b=s.indexOf(' ',i+L);if(b<0)b=s.length;
      hits.push({...e,word:s.slice(a,b).trim()});
      s=s.slice(0,a)+' '.repeat(b-a)+s.slice(b);from=a;
    }
  }
  const left=s.split(' ').filter(w=>w.length>3&&!STOP.has(w));
  const r={aff:null,affW:'',ech:null,echW:'',br:[],mods:{},tasks:[],amb:[],left,hits};
  for(const h of hits){
    if(h.cat==='aff'&&!r.aff){r.aff=h.key;r.affW=h.word}
    else if(h.cat==='ech'&&!r.ech){r.ech=h.key;r.echW=h.word}
    else if(h.cat==='br'&&!r.br.find(x=>x.key===h.key))r.br.push({key:h.key,word:h.word});
    else if(h.cat==='mod')r.mods[h.key]=h.word;
    else if(h.cat==='task'&&!r.tasks.find(x=>x.key===h.key))r.tasks.push({key:h.key,word:h.word});
    else if(h.cat==='amb')r.amb.push(h);
  }
  return r;
}
function lev(a,b){const m=a.length,n=b.length;let p=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
function suggest(word){
  let best=null,bd=99;
  for(const e of LEX){if(e.cat==='amb'||e.stem.length<4)continue;
    const d=Math.min(lev(word.slice(0,e.stem.length),e.stem),lev(word.slice(0,e.stem.length+1),e.stem),lev(word,e.stem));
    const lim=e.stem.length>=5?(e.stem.length>=9?3:2):1;
    if(d<=lim&&d<bd){bd=d;best=e}}
  return best;
}

/* ===================== RENDER: UNIT ===================== */
let uid=0;
function iconsOf(r){const set=[];r.br.forEach(b=>BR[b.key].icons.forEach(i=>{if(!set.includes(i))set.push(i)}));return set}
function echSVG(e,T){
  if(!e)return '';const y1=T-5,y2=T-27,g=[];
  const dots=n=>{for(let i=0;i<n;i++)g.push(`<circle cx="${cx+(i-(n-1)/2)*16}" cy="${T-14}" r="5.5" fill="#000" stroke="none"/>`)};
  const bars=n=>{for(let i=0;i<n;i++){const x=cx+(i-(n-1)/2)*12;g.push(`<path d="M${x},${y1} V${y2}"/>`)}};
  const xs=n=>{for(let i=0;i<n;i++){const x=cx+(i-(n-1)/2)*22;g.push(`<path d="M${x-8},${y1} L${x+8},${y2} M${x+8},${y1} L${x-8},${y2}"/>`)}};
  ({team:()=>g.push(`<circle cx="${cx}" cy="${T-16}" r="9"/><path d="M${cx-13},${T-3} L${cx+13},${T-29}"/>`),
    squad:()=>dots(1),section:()=>dots(2),platoon:()=>dots(3),company:()=>bars(1),battalion:()=>bars(2),regiment:()=>bars(3),
    brigade:()=>xs(1),division:()=>xs(2),corps:()=>xs(3),army:()=>xs(4)})[e]();
  return `<g stroke="#000" stroke-width="3.5" fill="none">${g.join('')}</g>`;
}
function unitSVG(u){
  const f=FR[u.aff],id='clip'+(++uid),b=f.b,s=f.s;
  const icons=(u.icons||[]).map(k=>ICON[k](b,s)).join('')+(u.abn?ICON.abn(b,s):'');
  const hq=u.hq?`<path d="M${f.hq[0]},${f.hq[1]} V214" stroke="#000" stroke-width="4"/>`:'';
  return `<svg viewBox="0 -36 200 256" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ტაქტიკური ნიშანი">
<defs><clipPath id="${id}">${f.shape}</clipPath></defs>${hq}
<g fill="${AFF[u.aff].fill}" stroke="none">${f.shape}</g>
<g clip-path="url(#${id})" stroke="#000" stroke-width="4" fill="none" stroke-linejoin="round">${icons}</g>
<g fill="none" stroke="#000" stroke-width="4" stroke-linejoin="round">${f.shape}</g>${echSVG(u.ech,f.top)}</svg>`;
}

/* ===================== RENDER: TASK ===================== */
function taskSVG(key,color){
  color=color||'#000';const id='ah'+(++uid),M=`marker-end="url(#${id})"`;
  const L=(t,x,y,fs)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${fs||28}" fill="${color}" stroke="#F3F5F0" stroke-width="7" paint-order="stroke" stroke-linejoin="round">${t}</text>`;
  const arrows=(ys,x1,x2)=>ys.map(y=>`<path d="M${x1},${y} H${x2}" ${M}/>`).join('');
  const ticksOnCircle=(c,r,angles,len)=>angles.map(a=>{const t=a*Math.PI/180,x=c[0]+r*Math.cos(t),y=c[1]+r*Math.sin(t);return `<path d="M${x.toFixed(1)},${y.toFixed(1)} L${(c[0]+(r-len)*Math.cos(t)).toFixed(1)},${(c[1]+(r-len)*Math.sin(t)).toFixed(1)}"/>`}).join('');
  const ell=(c,rx,ry,angs,len)=>angs.map(a=>{const t=a*Math.PI/180,x=c[0]+rx*Math.cos(t),y=c[1]+ry*Math.sin(t);const k=(rx-len)/rx;return `<path d="M${x.toFixed(1)},${y.toFixed(1)} L${(c[0]+(x-c[0])*k).toFixed(1)},${(c[1]+(y-c[1])*k).toFixed(1)}"/>`}).join('');
  const D={
   block:()=>`<path d="M45,90 H215"/><path d="M215,35 V145"/>${L('B',130,80)}`,
   breach:()=>`<path d="M85,40 L105,58 H205 V122 H105 L85,140"/>${L('B',155,100)}`,
   bypass:()=>`<path d="M70,150 V85 Q70,45 110,45 H190 Q230,45 230,85 V140" ${M}/>${L('B',150,108)}`,
   canalize:()=>`<path d="M35,30 L150,72 H265"/><path d="M35,150 L150,108 H265"/>${L('C',210,100)}`,
   clear:()=>`<path d="M235,30 V150"/>${arrows([50,90,130],45,228)}${L('C',140,80)}`,
   contain:()=>`<path d="M205,35 A70 55 0 0 0 205,145"/>${ell([205,90],70,55,[120,150,180,210,240],14)}${L('C',215,100)}`,
   destroy:()=>`<path d="M90,30 L210,150 M210,30 L90,150"/>${L('D',150,100)}`,
   disrupt:()=>`<path d="M70,35 V145"/>${`<path d="M70,55 H250" ${M}/><path d="M70,90 H205" ${M}/><path d="M70,125 H160" ${M}/>`}${L('D',40,100)}`,
   fix:()=>`<path d="M35,90 H85 L97,68 L117,112 L137,68 L157,112 L177,68 L189,90 H258" ${M}/>${L('F',222,72)}`,
   isolate:()=>`<path d="M150,30 A60 60 0 1 1 98,60" ${M}/>${ticksOnCircle([150,90],60,[-45,0,45,90,135,180],16)}${L('I',150,100)}`,
   turn:()=>`<path d="M45,145 H125 Q205,145 212,60" ${M}/>${L('T',95,132)}`,
   abf:()=>`<path d="M85,130 L245,55" ${M}/><path d="M62,92 L105,170 M62,92 L48,104 M105,170 L120,160"/>`,
   sbf:()=>`<path d="M60,150 H240 M60,150 L45,168 M240,150 L255,168"/><path d="M80,150 L125,55" ${M}/><path d="M220,150 L175,55" ${M}/>`,
   penetrate:()=>`<path d="M40,90 H258" ${M}/><path d="M175,40 V140"/>${L('P',110,78)}`,
   seize:()=>`<circle cx="60" cy="140" r="9"/><path d="M67,133 Q130,25 250,105" ${M}/>${L('S',160,112)}`,
   catk:()=>`<path d="M35,72 H195 V50 L262,90 L195,130 V108 H35" stroke-dasharray="12 8"/>${L('CATK',122,99,24)}`,
   ambush:()=>`<path d="M115,30 Q55,90 115,150"/><path d="M98,55 H215" ${M}/><path d="M86,90 H215" ${M}/><path d="M98,125 H215" ${M}/>`,
   delay:()=>`<path d="M250,90 H62" ${M}/><path d="M250,55 Q290,90 250,125"/>${L('D',160,78)}`,
   screen:()=>sec('S'),guard:()=>sec('G'),cover:()=>sec('C')
  };
  function sec(t){return `<path d="M150,90 H45" ${M}/><path d="M150,90 H255" ${M}/>${L(t,150,100)}`}
  return `<svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ტაქტიკური ამოცანის გრაფიკი">
<defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker></defs>
<g fill="none" stroke="${color}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">${D[key]()}</g></svg>`;
}

/* ===================== GENERATOR UI ===================== */
const $=id=>document.getElementById(id);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EXAMPLES=['მოწინააღმდეგის ჯავშანსატანკო ბატალიონი','მეგობრული სადაზვერვო ოცეული','თვითმავალი საარტილერიო დივიზიონი','მოწინააღმდეგის ქვეითი ბრიგადის შტაბი','სადესანტო ქვეითი ასეული','ბლოკირება','მეგობრული ქვეითი ასეული — მიჯაჭვა','ნეიტრალური სამედიცინო განყოფილება'];
$('examples').innerHTML=EXAMPLES.map(e=>`<button class="chip" data-q="${esc(e)}">${esc(e)}</button>`).join('');

function run(text){
  const r=parse(text),out=$('out');
  const isUnit=r.br.length||r.ech||r.mods.hq||r.mods.abn||(r.aff&&!r.tasks.length);
  const unknown=r.left.map(w=>({w,s:suggest(w)}));

  if(!isUnit&&!r.tasks.length&&!r.amb.length){
    const sug=unknown.filter(x=>x.s);
    out.innerHTML=`<div class="side" style="max-width:720px">
      <div class="note bad"><b>განმარტება ვერ ამოვიცანი.</b> ჩაწერეთ სწორი ან მიახლოებული განმარტება.</div>
      ${sug.length?`<div><p class="label">იქნებ გულისხმობდით</p><div class="chips">${sug.map(x=>`<button class="chip" data-q="${esc(norm(text).replace(x.w,labelOf(x.s)).trim())}">${esc(x.w)} → ${esc(labelOf(x.s))}</button>`).join('')}</div></div>`:''}
      <p class="def">სტრუქტურა: <b>აფილაცია</b> (მეგობრული / მოწინააღმდეგის / ნეიტრალური / უცნობი) + <b>დარგი</b> (ქვეითი, ჯავშანსატანკო, სადაზვერვო…) + <b>ეშელონი</b> (ოცეული, ასეული, ბატალიონი…). ამოცანისთვის — მისი დასახელება (ბლოკირება, მიჯაჭვა, განადგურება…). სრული სია — ჩანართში „კატალოგი“.</p></div>`;
    return;
  }
  if(r.amb.length&&!r.tasks.length&&!isUnit){
    const keys=r.amb[0].key;
    out.innerHTML=`<div class="side" style="max-width:720px"><div class="note warn"><b>„${esc(r.amb[0].word)}“ ორაზროვანია.</b> დააზუსტეთ, რომელ ამოცანას გულისხმობთ:</div>
      <div class="chips">${keys.map(k=>`<button class="chip" data-q="${esc(TK[k].ka.replace(/ \(.*\)/,''))} ${esc(TK[k].en)}">${esc(TK[k].ka)} — ${TK[k].en}</button>`).join('')}</div></div>`;
    return;
  }

  const notes=[],rows=[],boards=[],related=[];let svgs=[];
  if(isUnit){
    const aff=r.aff||'F';
    if(!r.aff)notes.push(['warn','აფილაცია არ არის მითითებული — ნაგულისხმევად აღებულია „მეგობრული“.']);
    if(!r.br.length)notes.push(['warn','დარგი (ძირითადი ხატულა) არ არის მითითებული — ჩარჩო ცარიელია. დაამატეთ, მაგ.: „ქვეითი“.']);
    if(!r.ech&&r.br.length)notes.push(['warn','ეშელონი არ არის მითითებული — ნიშანი ზომის აღნიშვნის გარეშეა.']);
    const u={aff,icons:iconsOf(r),ech:r.ech,hq:!!r.mods.hq,abn:!!r.mods.abn};
    const svg=unitSVG(u);svgs.push(svg);
    const name=[AFF[aff].ka,r.br.map(b=>BR[b.key].ka).join(' '),r.mods.abn?'სადესანტო':'',r.ech?ECH[r.ech].ka.split(' /')[0]:'',r.mods.hq?'(შტაბი)':''].filter(Boolean).join(' ');
    boards.push(`<div class="board">${svg}<div class="cap">${esc(name)}</div></div>`);
    rows.push(['ჩარჩო',`${AFF[aff].ka} — ${AFF[aff].frame}, ${AFF[aff].color}`,r.affW||'—']);
    r.br.forEach(b=>rows.push(['დარგი',`${BR[b.key].ka}: ${BR[b.key].desc}`,b.word]));
    if(r.mods.abn)rows.push(['მოდიფიკატორი',`${MOD.abn.ka}: ${MOD.abn.desc}`,r.mods.abn]);
    if(r.ech)rows.push(['ეშელონი',`${ECH[r.ech].ka}: ${ECH[r.ech].mark} — ჩარჩოს ზემოთ`,r.echW]);
    if(r.mods.hq)rows.push(['შტაბი',MOD.hq.desc,r.mods.hq]);
    const g=r.br.length?BR[r.br[0].key].grp:'man';
    const echW=r.ech?' '+ECH[r.ech].ka.split(' /')[0]:'';
    Object.keys(BR).filter(k=>BR[k].grp===g&&!r.br.find(b=>b.key===k)).forEach(k=>related.push([`${AFF[aff].word} ${BR[k].ka}${echW}`,BR[k].ka]));
    if(r.ech){const i=ECH_ORDER.indexOf(r.ech);[i-1,i+1].filter(j=>j>=0&&j<ECH_ORDER.length).forEach(j=>related.push([`${AFF[aff].word} ${r.br.map(b=>BR[b.key].ka).join(' ')} ${ECH[ECH_ORDER[j]].ka.split(' /')[0]}`,(j<i?'↓ ':'↑ ')+ECH[ECH_ORDER[j]].ka.split(' /')[0]]))}
  }
  const tColor=r.aff==='H'?'#C8102E':'#000';
  r.tasks.forEach(t=>{
    const T=TK[t.key],svg=taskSVG(t.key,tColor);svgs.push(svg);
    boards.push(`<div class="board">${svg}<div class="cap">${esc(T.ka)} · ${T.en}</div></div>`);
    rows.push(['ამოცანა',`<b>${esc(T.ka)}</b> (${T.en}) — ${esc(T.def)}<br><span class="tag">${T.g.map(x=>TG[x]).join(' · ')}</span>${T.v?' <span class="tag v">გრაფიკი — გადაამოწმეთ ADP 1-02</span>':''}`,t.word,true]);
    Object.keys(TK).filter(k=>k!==t.key&&TK[k].g.some(x=>T.g.includes(x))).forEach(k=>{if(!related.find(x=>x[1]===TK[k].ka))related.push([TK[k].ka.replace(/ \(.*\)/,'')+' '+TK[k].en,TK[k].ka])});
  });
  if(r.tasks.length&&r.aff==='H'&&!isUnit)notes.push(['ok','მოწინააღმდეგის ქმედების გრაფიკა გამოსახულია წითლად.']);
  if(isUnit&&r.tasks.length)notes.push(['ok','ერთეულის ნიშანი და ამოცანის გრაფიკი რუკაზე ერთად თავსდება: გრაფიკი ერთეულს უთითებს, რა უნდა შეასრულოს და სად.']);
  unknown.forEach(x=>notes.push(['warn',`სიტყვა „${esc(x.w)}“ ვერ ამოვიცანი და გამოტოვებულია.${x.s?` იქნებ: <b>${esc(labelOf(x.s))}</b>?`:' დააზუსტეთ ან ჩაწერეთ მიახლოებული ტერმინი.'}`]));

  out.innerHTML=`<div class="result">
    <div class="boards">${boards.join('')}</div>
    <div class="side">
      <h2>${isUnit?'ნიშნის შემადგენლობა':'ამოცანის განმარტება'}</h2>
      ${notes.map(n=>`<div class="note ${n[0]}">${n[1]}</div>`).join('')}
      <div class="tbl"><table><thead><tr><th>ელემენტი</th><th>მნიშვნელობა და გამოსახვა</th><th>ამოცნობილი სიტყვა</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td class="k">${r[0]}</td><td>${r[3]?r[1]:esc(r[1])}</td><td><code>${esc(r[2])}</code></td></tr>`).join('')}</tbody></table></div>
      ${related.length?`<div><p class="label">დაკავშირებული ნიშნები</p><div class="chips">${related.slice(0,10).map(x=>`<button class="chip" data-q="${esc(x[0])}">${esc(x[1])}</button>`).join('')}</div></div>`:''}
      <div class="actions"><button class="btn ghost" id="copy">SVG კოდის კოპირება</button></div><div id="copyout"></div>
    </div></div>`;
  $('copy').onclick=()=>{
    const code=svgs.join('\n');const done=()=>{$('copyout').innerHTML='<div class="note ok">SVG კოდი დაკოპირდა.</div>'};
    const fallback=()=>{$('copyout').innerHTML='<textarea class="copybox" id="cb" readonly></textarea><p class="hint">მონიშნეთ და დააკოპირეთ ხელით.</p>';$('cb').value=code;$('cb').select()};
    try{navigator.clipboard.writeText(code).then(done,fallback)}catch(e){fallback()}
  };
}
$('go').onclick=()=>run($('q').value);
$('q').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run($('q').value)}});
document.addEventListener('click',e=>{const c=e.target.closest('[data-q]');if(!c)return;showTab('gen');$('q').value=c.dataset.q;run(c.dataset.q);window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})});

/* ===================== CATALOG ===================== */
function buildCatalog(){
  const h=[];
  const block=(title,sub,items)=>`<div class="cathead"><h3>${title}</h3><p>${sub}</p></div><div class="catgrid">${items.join('')}</div>`;
  h.push(block('აფილაცია','ჩარჩოს ფორმა და ფერი — ვისი ძალაა',Object.keys(AFF).map(k=>`<button class="cat" data-q="${AFF[k].word} ქვეითი">${unitSVG({aff:k,icons:[]})}<span>${AFF[k].ka}<br><small>${AFF[k].frame}</small></span></button>`)));
  for(const g of ['man','fire','sup','sus']){
    h.push(block('დარგი: '+GRP[g],'ძირითადი ხატულა ჩარჩოს შიგნით',Object.keys(BR).filter(k=>BR[k].grp===g).map(k=>`<button class="cat" data-q="მეგობრული ${BR[k].ka}">${unitSVG({aff:'F',icons:BR[k].icons})}<span>${BR[k].ka}</span></button>`)));
  }
  h.push(block('მოდიფიკატორები','ემატება ძირითად ხატულას',[
    `<button class="cat" data-q="მეგობრული თვითმავალი საარტილერიო">${unitSVG({aff:'F',icons:['art','armor']})}<span>თვითმავალი (ოვალი)</span></button>`,
    `<button class="cat" data-q="მეგობრული სადესანტო ქვეითი">${unitSVG({aff:'F',icons:['inf'],abn:true})}<span>სადესანტო</span></button>`,
    `<button class="cat" data-q="მეგობრული ქვეითი ბატალიონის შტაბი">${unitSVG({aff:'F',icons:['inf'],ech:'battalion',hq:true})}<span>შტაბი</span></button>`]));
  h.push(block('ეშელონი','ზომის ნიშანი ჩარჩოს ზემოთ',ECH_ORDER.map(k=>`<button class="cat" data-q="მეგობრული ქვეითი ${ECH[k].ka.split(' /')[0]}">${unitSVG({aff:'F',icons:['inf'],ech:k})}<span>${ECH[k].ka}<br><small>${esc(ECH[k].mark.split(' —')[0])}</small></span></button>`)));
  for(const g of ['ef','fa','fm','rt','sec']){
    h.push(block('ამოცანები: '+TG[g],g==='ef'?'ბლოკირება, მიჯაჭვა, მოტრიალება და დეზორგანიზება ასევე დაბრკოლების ეფექტებია':'',Object.keys(TK).filter(k=>TK[k].g[0]===g).map(k=>`<button class="cat" data-q="${TK[k].ka.replace(/ \(.*\)/,'')}">${taskSVG(k)}<span>${TK[k].ka}<br><small>${TK[k].en}${TK[k].v?' · გადაამოწმეთ':''}</small></span></button>`)));
  }
  $('catalog').innerHTML=h.join('');
}

/* ===================== PRACTICE ===================== */
let qT=null,qOk=0,qN=0,qDone=false;
const QBR=['inf','mech','armor','recon','art','mor','at','ad','eng','sig','mp','rw','sf','med','sup','mnt'];
const QECH=['squad','section','platoon','company','battalion','regiment','brigade','division'];
const pick=a=>a[Math.floor(Math.random()*a.length)];
function newQ(){
  qDone=false;$('qa').value='';$('qfb').innerHTML='';
  if(Math.random()<.3){const k=pick(Object.keys(TK));qT={task:k};$('qboard').innerHTML=taskSVG(k)}
  else{const b=pick(QBR);qT={aff:pick(['F','H','N','U']),br:b,ech:pick(QECH)};$('qboard').innerHTML=unitSVG({aff:qT.aff,icons:BR[qT.br].icons,ech:qT.ech})}
}
function check(){
  if(qDone)return;const r=parse($('qa').value);const li=[];let ok=true;
  if(!$('qa').value.trim()){$('qfb').innerHTML='<div class="note warn">ჯერ ჩაწერეთ განმარტება.</div>';return}
  if(qT.task){
    const hit=r.tasks.find(t=>t.key===qT.task);ok=!!hit;
    li.push([ok,`ამოცანა: ${TK[qT.task].ka} (${TK[qT.task].en})`]);
  }else{
    const a=r.aff===qT.aff,e=r.ech===qT.ech,ic=iconsOf(r).slice().sort().join()===BR[qT.br].icons.slice().sort().join();
    li.push([a,`აფილაცია: ${AFF[qT.aff].ka}`],[ic,`დარგი: ${BR[qT.br].ka}`],[e,`ეშელონი: ${ECH[qT.ech].ka}`]);ok=a&&e&&ic;
  }
  qN++;if(ok)qOk++;qDone=true;$('qscore').textContent=`${qOk} / ${qN}`;
  const answer=qT.task?TK[qT.task].ka:`${AFF[qT.aff].word} ${BR[qT.br].ka} ${ECH[qT.ech].ka.split(' /')[0]}`;
  $('qfb').innerHTML=`<div class="note ${ok?'ok':'bad'}"><b>${ok?'სწორია.':'არასრულია ან არასწორია.'}</b> სწორი განმარტება: ${esc(answer)}</div>
   <ul class="fb">${li.map(x=>`<li>${x[0]?'✓':'✗'} ${esc(x[1])}</li>`).join('')}</ul>
   ${r.left.length?`<p class="hint">ვერ ამოვიცანი: ${r.left.map(esc).join(', ')}</p>`:''}`;
}
$('qcheck').onclick=check;$('qnext').onclick=newQ;
$('qa').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();qDone?newQ():check()}});

/* ===================== TABS ===================== */
let catBuilt=false;
function showTab(t){
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));
  $('sec-gen').hidden=t!=='gen';$('sec-cat').hidden=t!=='cat';$('sec-quiz').hidden=t!=='quiz';
  if(t==='cat'&&!catBuilt){buildCatalog();catBuilt=true}
  if(t==='quiz'&&!qT)newQ();
  try{localStorage.setItem('tsg-tab',t)}catch(e){}
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.t));
run($('q').value);
