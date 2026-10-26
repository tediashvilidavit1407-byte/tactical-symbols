/* ===================== LEXICON ===================== */
const LEX=[];
const add=(cat,key,st)=>(st||[]).forEach(s=>LEX.push({cat,key,stem:s,whole:/^[a-z ]+$/.test(s)&&s.length<=4}));
for(const k in AFF)add('aff',k,AFF[k].stems);
for(const k in BR)add('br',k,BR[k].stems);
for(const k in MOD)add('mod',k,MOD[k].stems);
for(const k in ECH)add('ech',k,ECH[k].stems);
for(const k in TK)add('task',k,TK[k].stems);
for(const k in SP)add('sp',k,SP[k].stems);
for(const k in CLS)add('cls',k,CLS[k].stems);
for(const k in LVL)add('lvl',k,LVL[k].stems);
AMBIG.forEach(a=>LEX.push({cat:'amb',key:a.keys,stem:a.stem}));
['თავდაცვ','ტექნიკ'].forEach(s=>LEX.push({cat:'skip',key:s,stem:s}));
LEX.sort((a,b)=>b.stem.length-a.stem.length);

const STOP=new Set(['ერთეული','ერთეულის','ქვედანაყოფი','ქვედანაყოფის','ქვედანაყოფები','ნაწილი','ნაწილის','ძალები','ძალების','ამოცანა','ამოცანის','დავალება','დავალების','ტაქტიკური','მისია','მისიის','ნიშანი','ნიშნის','სიმბოლო','ასრულებს','ახორციელებს','აწარმოებს','unit','task','symbol','forces','force','with','mission','performs','conducts','მიერ','რომელიც','ერთად','კლასი','კლასის','პუნქტი','ნაღმი','იარაღი','class','პოზიცია','პოზიციის','ველი','ველის','თავშესაფარი','შეკრების','საფრენი','აპარატი','აპარატის','აპარატების','მიმართულება','ღერძი','ნაგებობა','ნიშნები','პუნქტები','სახეობის','ზოგადი','ქვეშ']);

function labelOf(e){
  if(e.cat==='aff')return AFF[e.key].ka;
  if(e.cat==='br')return BR[e.key].ka;
  if(e.cat==='mod')return MOD[e.key].ka;
  if(e.cat==='ech')return ECH[e.key].ka;
  if(e.cat==='task')return TK[e.key].ka;
  if(e.cat==='sp')return SP[e.key].ka;
  if(e.cat==='cls')return CLS[e.key].ka;
  if(e.cat==='lvl')return LVL[e.key].ka;
  return e.stem;
}
function norm(t){return ' '+t.toLowerCase().replace(/[.,;:!?"'()\[\]«»„“”—–\/]/g,' ').replace(/-/g,' ').replace(/\s+/g,' ').trim()+' '}

function parse(text){
  const r={aff:null,affW:'',ech:null,echW:'',br:[],mods:{},tasks:[],amb:[],sp:[],cls:null,clsW:'',lvl:null,rf:'',left:[],eqHint:false};
  let raw=String(text);
  // ველი 7 ფრჩხილებით
  const m7=raw.match(/\(\s*([+\-−±])\s*\)/);if(m7){r.rf='('+(m7[1]==='-'?'−':m7[1])+')';raw=raw.replace(m7[0],' ')}
  // სამხედრო პოლიცია „ს.პ“
  if(/(^|\s)ს\.\s?პ\.?(\s|$)/.test(raw)){r.br.push({key:'mp',word:'ს.პ'});raw=raw.replace(/ს\.\s?პ\.?/,' ')}
  // მომარაგების კლასი ნომრით
  const mc=raw.match(/(\d{1,2})\s*-?\s*(?:ლი|ე)?\s*(?:კლას\S*|class)/i)||raw.match(/(?:კლას\S*|class)\s*(\d{1,2})/i);
  if(mc&&CLS[+mc[1]]){r.cls=+mc[1];r.clsW=mc[0].trim();raw=raw.replace(mc[0],' ')}
  if(/ტექნიკ/.test(raw)&&!/ძირითადი ტექნიკ|ჯავშანტექნიკ/.test(raw))r.eqHint=true;
  let s=norm(raw);const hits=[];
  for(const e of LEX){
    let from=0,i;
    while((i=s.indexOf(e.stem,from))!==-1){
      const L=e.stem.length;
      if(e.whole&&!(s[i-1]===' '&&s[i+L]===' ')){from=i+1;continue}
      const a=s.lastIndexOf(' ',i)+1;let b=s.indexOf(' ',i+L);if(b<0)b=s.length;
      if(e.stem.endsWith(' '))b=i+L-1;
      hits.push({...e,word:s.slice(a,b).trim()});
      s=s.slice(0,a)+' '.repeat(b-a)+s.slice(b);from=a;
    }
  }
  r.left=s.split(' ').filter(w=>w.length>3&&!STOP.has(w)&&!/^\d+$/.test(w));
  for(const h of hits){
    if(h.cat==='aff'&&!r.aff){r.aff=h.key;r.affW=h.word}
    else if(h.cat==='ech'&&!r.ech){r.ech=h.key;r.echW=h.word}
    else if(h.cat==='br'&&!r.br.find(x=>x.key===h.key))r.br.push({key:h.key,word:h.word});
    else if(h.cat==='mod')r.mods[h.key]=h.word;
    else if(h.cat==='task'&&!r.tasks.find(x=>x.key===h.key))r.tasks.push({key:h.key,word:h.word});
    else if(h.cat==='sp'&&!r.sp.find(x=>x.key===h.key))r.sp.push({key:h.key,word:h.word});
    else if(h.cat==='cls'&&!r.cls){r.cls=+h.key;r.clsW=h.word}
    else if(h.cat==='lvl'&&!r.lvl)r.lvl=+h.key;
    else if(h.cat==='amb')r.amb.push(h);
  }
  // შეიარაღება: სიმძიმე + გვარეობა → იარაღის ნიშანი
  const WMAP={mor:'w_mor',at:'w_at',mlrs:'w_rl'};
  if(r.lvl&&!r.ech&&!r.sp.some(x=>SP[x.key].g==='wp')){
    const b=r.br.find(x=>WMAP[x.key]);
    if(b){r.sp.push({key:WMAP[b.key],word:b.word});r.br=r.br.filter(x=>x!==b)}
  }
  if(r.lvl&&!r.sp.some(x=>SP[x.key].g==='wp'))r.lvlOrphan=true;
  // „ტანკი (ტექნიკა)“
  if(r.eqHint&&!r.ech){const b=r.br.find(x=>x.key==='armor');if(b){r.sp.push({key:'e_tank',word:b.word});r.br=r.br.filter(x=>x!==b)}}
  // მომარაგების კლასი → ზურგის ჩარჩო
  if(r.cls&&!r.br.find(x=>x.key==='sup'))r.br.push({key:'sup',word:''});
  if(r.rf==='')r.rf=r.mods.rein?'(+)':r.mods.det?'(−)':'';
  return r;
}
function lev(a,b){const m=a.length,n=b.length;let p=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
function suggest(word){
  let best=null,bd=99;
  for(const e of LEX){if(e.cat==='amb'||e.cat==='skip'||e.stem.length<4||e.stem.includes(' '))continue;
    const d=Math.min(lev(word.slice(0,e.stem.length),e.stem),lev(word.slice(0,e.stem.length+1),e.stem),lev(word,e.stem));
    const lim=e.stem.length>=5?(e.stem.length>=9?3:2):1;
    if(d<=lim&&d<bd){bd=d;best=e}}
  return best;
}

/* ===================== RENDER: UNIT ===================== */
let uid=0;
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function iconsOf(r){const set=[];r.br.forEach(b=>BR[b.key].icons.forEach(i=>{if(!set.includes(i))set.push(i)}));if(r.cls){set.push('c'+r.cls)}return set}
function echSVG(e,T){
  if(!e)return '';const y1=T-5,y2=T-27,g=[];
  const dots=n=>{for(let i=0;i<n;i++)g.push(`<circle cx="${cx+(i-(n-1)/2)*16}" cy="${T-14}" r="5.5" fill="currentColor" stroke="none"/>`)};
  const bars=n=>{for(let i=0;i<n;i++){const x=cx+(i-(n-1)/2)*12;g.push(`<path d="M${x},${y1} V${y2}"/>`)}};
  const xs=n=>{for(let i=0;i<n;i++){const x=cx+(i-(n-1)/2)*22;g.push(`<path d="M${x-8},${y1} L${x+8},${y2} M${x+8},${y1} L${x-8},${y2}"/>`)}};
  ({team:()=>g.push(`<circle cx="${cx}" cy="${T-16}" r="9"/><path d="M${cx-13},${T-3} L${cx+13},${T-29}"/>`),
    squad:()=>dots(1),section:()=>dots(2),platoon:()=>dots(3),company:()=>bars(1),battalion:()=>bars(2),regiment:()=>bars(3),
    brigade:()=>xs(1),division:()=>xs(2),corps:()=>xs(3),army:()=>xs(4)})[e]();
  return `<g stroke="currentColor" stroke-width="3.5" fill="none">${g.join('')}</g>`;
}
/* u = {aff, icons, ech, hq, abn, planned, mono, f:{n,hi,eq,dt,rf}} */
function unitSVG(u){
  const f=FR[u.aff],id='clip'+(++uid),b=f.b,s=f.s,A=AFF[u.aff];
  const ink=u.mono?A.line:'#000',fill=u.mono?'#fff':A.fill;
  const dash=u.planned?' stroke-dasharray="14 9"':'';
  const icons=(u.icons||[]).map(k=>ICON[k]?ICON[k](b,s):'').join('')+(u.abn?ICON.abn(b,s):'');
  const hq=u.hq?`<path d="M${f.hq[0]},${f.hq[1]} V214" stroke="currentColor" stroke-width="4"/>`:'';
  const F=u.f||{};const has=['n','hi','eq','dt','rf'].some(k=>F[k]);
  const T=(x,y,t,anc)=>t?`<text x="${x}" y="${y}" text-anchor="${anc}" font-family="${GEO}" font-weight="600" font-size="17" fill="currentColor">${esc(t)}</text>`:'';
  const fields=has?T(f.l-8,f.top+16,F.dt,'end')+T(f.r+8,f.top+16,[F.rf,F.eq].filter(Boolean).join(' '),'start')+T(f.l-8,f.bot-2,F.n,'end')+T(f.r+8,f.bot-2,F.hi,'start'):'';
  const vb=has?'-130 -36 460 256':'0 -36 200 256';
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ტაქტიკური ნიშანი" style="color:${ink}">
<defs><clipPath id="${id}">${f.shape}</clipPath></defs>${hq}
<g fill="${fill}" stroke="none">${f.shape}</g>
<g clip-path="url(#${id})" stroke="currentColor" stroke-width="4" fill="none" stroke-linejoin="round">${icons}</g>
<g fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"${dash}>${f.shape}</g>${echSVG(u.ech,f.top)}${fields}</svg>`;
}
/* ===================== RENDER: SPECIAL ===================== */
const OBS_GREEN='#1E9A3A';
function spColor(key,aff){return ['ob','mn','mf'].includes(SP[key].g)?OBS_GREEN:AFF[aff||'F'].line}
function spSVG(key,aff,lvl,planned){
  const S=SP[key],c=spColor(key,aff),l=S.lv?(lvl||1):0;
  return `<svg viewBox="${S.vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(S.ka)}" style="color:${c}"><g fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"${planned?' stroke-dasharray="12 8"':''}>${S.svg(c,l)}</g></svg>`;
}
/* ===================== RENDER: TASK ===================== */
function canalizeSVG(){return `<svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="კანალიზება"><g fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round"><path d="M35,30 L150,72 H265"/><path d="M35,150 L150,108 H265"/></g><text x="210" y="100" text-anchor="middle" font-family="${GEO}" font-weight="700" font-size="28">კ</text></svg>`}
function taskImg(key,ob){
  const T=TK[key];
  if(!T.img)return canalizeSVG();
  const f=ob?T.ob:T.img;
  return `<img src="tasks/${f}.png" alt="${esc(T.ka)}${ob?' — დაბრკოლების ეფექტი':''}">`;
}

/* ===================== GENERATOR UI ===================== */
const $=id=>document.getElementById(id);
const EXAMPLES=['მოწინააღმდეგის ჯავშანსატანკო ბატალიონი','საკუთარი სადაზვერვო რაზმი','თვითმავალი საარტილერიო დივიზიონი','მოწინააღმდეგის მოტორიზებული ქვეითი ბრიგადის შტაბი','3-კლასი საწვავ-საპოხი','ბლოკირება','ხაზების გადაკვეთა წინ','მძიმე ტყვიამფრქვევი','ქვეითი მეწინავე მეთვალთვალის პოზიცია','შერეული დანაღმული ველი','მიწისქვეშა თავშესაფარი','ძირითადი შეტევის მიმართულება'];
$('examples').innerHTML=EXAMPLES.map(e=>`<button class="chip" data-q="${esc(e)}">${esc(e)}</button>`).join('');
const uiFields=()=>({n:$('f-n').value.trim(),hi:$('f-hi').value.trim(),eq:$('f-eq').value.trim(),dt:$('f-dt').value.trim(),rf:$('f-rf').value});
const srcTag=k=>k?`<span class="src">${SRC[k]}</span>`:'';

function run(text){
  const r=parse(text),out=$('out');
  const isUnit=r.br.length||r.ech||r.mods.hq||r.mods.abn||r.cls||(r.aff&&!r.tasks.length&&!r.sp.length);
  const unknown=r.left.map(w=>({w,s:suggest(w)}));
  const nothing=!isUnit&&!r.tasks.length&&!r.sp.length;

  if(nothing&&!r.amb.length){
    const sug=unknown.filter(x=>x.s);
    out.innerHTML=`<div class="side" style="max-width:720px">
      <div class="note bad"><b>განმარტება ვერ ამოვიცანი.</b> ჩაწერეთ სწორი ან მიახლოებული განმარტება.</div>
      ${sug.length?`<div><p class="label">იქნებ გულისხმობდით</p><div class="chips">${sug.map(x=>`<button class="chip" data-q="${esc(norm(text).replace(x.w,labelOf(x.s)).trim())}">${esc(x.w)} → ${esc(labelOf(x.s))}</button>`).join('')}</div></div>`:''}
      <p class="def">ქვედანაყოფისთვის: <b>ვინაობა</b> (საკუთარი / მოწინააღმდეგის / ნეიტრალური / უცნობი) + <b>გვარეობა</b> (ქვეითი, ჯავშანსატანკო, სადაზვერვო…) + <b>ეშელონი</b> (ჯგუფი, ათეული, რაზმი, ოცეული, ასეული, ბატალიონი…). დავალებისთვის — მისი დასახელება (ბლოკირება, ფიქსირება, გარღვევა…). სრული სია — ჩანართში „კატალოგი“.</p></div>`;
    return;
  }
  if(nothing&&r.amb.length){
    const keys=r.amb[0].key;
    out.innerHTML=`<div class="side" style="max-width:720px"><div class="note warn"><b>„${esc(r.amb[0].word)}“ რამდენიმე დავალებას შეესაბამება.</b> დააზუსტეთ:</div>
      <div class="chips">${keys.map(k=>`<button class="chip" data-q="${esc(TK[k].ka)}">${esc(TK[k].ka)} — ${TK[k].en}</button>`).join('')}</div></div>`;
    return;
  }

  const notes=[],rows=[],boards=[],related=[];const svgs=[];
  const mono=$('mono').checked,planned=$('planned').checked||!!r.mods.planned;
  const F=uiFields();if(!F.rf&&r.rf)F.rf=r.rf;
  if(isUnit){
    const aff=r.aff||'F';
    if(!r.aff)notes.push(['warn','ვინაობა არ არის მითითებული — ნაგულისხმევად აღებულია „საკუთარი“.']);
    if(!r.br.length)notes.push(['warn','გვარეობა (ძირითადი ხატულა) არ არის მითითებული — ჩარჩო ცარიელია. დაამატეთ, მაგ.: „ქვეითი“.']);
    if(!r.ech&&r.br.length&&!r.cls)notes.push(['warn','ეშელონი არ არის მითითებული — ნიშანი სიდიდის აღნიშვნის გარეშეა.']);
    const u={aff,icons:iconsOf(r),ech:r.ech,hq:!!r.mods.hq,abn:!!r.mods.abn,planned,mono,f:F};
    const svg=unitSVG(u);svgs.push(svg);
    const name=[AFF[aff].word,r.br.filter(b=>b.word||!r.cls).map(b=>BR[b.key].ka).join(' '),r.cls?CLS[r.cls].ka.split(' —')[0]:'',r.mods.abn?'სადესანტო':'',r.ech?ECH[r.ech].ka.split(' /')[0]:'',r.mods.hq?'(შტაბი)':''].filter(Boolean).join(' ');
    boards.push(`<div class="board">${svg}<div class="cap">${esc(name)}</div></div>`);
    rows.push(['ვინაობა (ჩარჩო)',`${AFF[aff].ka} — ${AFF[aff].frame}, ${AFF[aff].color}${mono?' (ერთფეროვანი სქემა)':''}`,r.affW||'—']);
    r.br.forEach(b=>rows.push([BR[b.key].grp==='svc'?'სახეობა':BR[b.key].grp==='mod'?'მოდიფიკატორი':'გვარეობა',`${BR[b.key].ka}: ${BR[b.key].desc}`,b.word||'—']));
    if(r.cls)rows.push(['მომარაგების კლასი',CLS[r.cls].ka,r.clsW]);
    if(r.mods.abn)rows.push(['მოდიფიკატორი',`${MOD.abn.ka}: ${MOD.abn.desc}`,r.mods.abn]);
    if(r.ech)rows.push(['ეშელონი (ველი 2)',`${ECH[r.ech].ka}: ${ECH[r.ech].mark} — ჩარჩოს ზემოთ`,r.echW]);
    if(r.mods.hq)rows.push(['შტაბი',MOD.hq.desc,r.mods.hq]);
    if(planned)rows.push(['ხაზის ტიპი',MOD.planned.ka+': '+MOD.planned.desc,r.mods.planned||'პარამეტრი']);
    [['n','3 — ნუმერაცია'],['hi','4 — ზემდგომი'],['eq','5 — აღჭურვილობა'],['dt','6 — თარიღი / დრო'],['rf','7 — გაძლიერება / გამოყოფა']].forEach(([k,l])=>{if(F[k])rows.push(['ველი '+l,F[k],k==='rf'&&r.rf?r.rf:'გვერდითი მონაცემები'])});
    const g=r.br.length?BR[r.br[0].key].grp:'man';
    const echW=r.ech?' '+ECH[r.ech].ka.split(' /')[0]:'';
    Object.keys(BR).filter(k=>BR[k].grp===g&&g!=='mod'&&!r.br.find(b=>b.key===k)).slice(0,6).forEach(k=>related.push([`${AFF[aff].word} ${BR[k].ka}${echW}`,BR[k].ka]));
    if(r.ech){const i=ECH_ORDER.indexOf(r.ech);[i-1,i+1].filter(j=>j>=0&&j<ECH_ORDER.length).forEach(j=>related.push([`${AFF[aff].word} ${r.br.map(b=>BR[b.key].ka).join(' ')} ${ECH[ECH_ORDER[j]].ka.split(' /')[0]}`,(j<i?'↓ ':'↑ ')+ECH[ECH_ORDER[j]].ka.split(' /')[0]]))}
    if(aff!=='H')related.push([`მოწინააღმდეგის ${r.br.map(b=>BR[b.key].ka).join(' ')}${echW}`,'იგივე — მოწინააღმდეგე']);
  }
  r.sp.forEach(x=>{
    const S=SP[x.key],svg=spSVG(x.key,r.aff,r.lvl,planned);svgs.push(svg);
    const lv=S.lv?' — '+LVL[r.lvl||1].ka:'';
    boards.push(`<div class="board">${svg}<div class="cap">${esc(S.ka+lv)}</div></div>`);
    rows.push([SPG[S.g],`<b>${esc(S.ka)}</b>${S.en?' ('+esc(S.en)+')':''}${lv?'<br>სიმძიმე: '+LVL[r.lvl||1].ka+(r.lvl?'':' (ნაგულისხმევი)'):''}${S.note?'<br><span class="tag v">'+esc(S.note)+'</span>':''}<br><span class="src">${SRC.kursi}</span>`,x.word,true]);
    if(S.lv&&!r.lvl)notes.push(['warn','სიმძიმე არ არის მითითებული — ნაგულისხმევად „მსუბუქი“. ჩაწერეთ „საშუალო“ ან „მძიმე“.']);
    if(S.lv)[1,2,3].filter(l=>l!==(r.lvl||1)).forEach(l=>related.push([`${LVL[l].ka} ${S.ka}`,`${LVL[l].ka}`]));
    Object.keys(SP).filter(k=>k!==x.key&&SP[k].g===S.g).slice(0,8).forEach(k=>related.push([SP[k].ka,SP[k].ka]));
  });
  if(r.lvlOrphan&&!r.sp.length)notes.push(['warn','სიმძიმე (მსუბუქი / საშუალო / მძიმე) ეხება მხოლოდ შეიარაღების ნიშნებს. დაამატეთ იარაღის დასახელება.']);
  r.tasks.forEach(t=>{
    const T=TK[t.key];
    boards.push(`<div class="board">${taskImg(t.key)}<div class="cap">${esc(T.ka)} · ${T.en}</div></div>`);
    if(T.ob)boards.push(`<div class="board">${taskImg(t.key,true)}<div class="cap">${esc(T.ka)} — დაბრკოლების ეფექტი</div></div>`);
    rows.push(['დავალება',`<b>${esc(T.ka)}</b> (${T.en}) — ${esc(T.def)}${T.obdef?`<br><br><b>დაბრკოლების ეფექტი:</b> ${esc(T.obdef)}`:''}<br><span class="tag">${T.g.map(x=>TG[x]).join(' · ')}</span>${T.v?` <span class="tag v">${esc(T.note||'გადაამოწმეთ')}</span>`:''}<br><span class="src">${SRC[T.src||'kursi']}</span>`,t.word,true]);
    Object.keys(TK).filter(k=>k!==t.key&&TK[k].g.some(x=>T.g.includes(x))).forEach(k=>{if(!related.find(x=>x[1]===TK[k].ka))related.push([TK[k].ka,TK[k].ka])});
  });
  if(r.tasks.length)notes.push(['ok','დავალების გრაფიკა — კურსის მასალიდან. წითელი რომბი აღნიშნავს მოწინააღმდეგეს, ასო — დავალების ქართულ შემოკლებას.']);
  if(isUnit&&r.tasks.length)notes.push(['ok','ქვედანაყოფის ნიშანი და დავალების გრაფიკა რუკაზე ერთად თავსდება: გრაფიკი უთითებს ქვედანაყოფს, რა უნდა შეასრულოს და სად.']);
  unknown.forEach(x=>notes.push(['warn',`სიტყვა „${esc(x.w)}“ ვერ ამოვიცანი და გამოტოვებულია.${x.s?` იქნებ: <b>${esc(labelOf(x.s))}</b>?`:' დააზუსტეთ ან ჩაწერეთ მიახლოებული ტერმინი.'}`]));

  out.innerHTML=`<div class="result">
    <div class="boards">${boards.join('')}</div>
    <div class="side">
      <h2>${isUnit?'ნიშნის შემადგენლობა':r.tasks.length&&!r.sp.length?'დავალების განმარტება':'ნიშნის განმარტება'}</h2>
      ${notes.map(n=>`<div class="note ${n[0]}">${n[1]}</div>`).join('')}
      <div class="tbl"><table><thead><tr><th>ელემენტი</th><th>მნიშვნელობა და გამოსახვა</th><th>ამოცნობილი სიტყვა</th></tr></thead>
      <tbody>${rows.map(x=>`<tr><td class="k">${esc(x[0])}</td><td>${x[3]?x[1]:esc(x[1])}</td><td><code>${esc(x[2])}</code></td></tr>`).join('')}</tbody></table></div>
      ${related.length?`<div><p class="label">დაკავშირებული ნიშნები</p><div class="chips">${related.slice(0,12).map(x=>`<button class="chip" data-q="${esc(x[0])}">${esc(x[1])}</button>`).join('')}</div></div>`:''}
      ${svgs.length?`<div class="actions"><button class="btn ghost" id="copy">SVG კოდის კოპირება</button></div><div id="copyout"></div>`:''}
    </div></div>`;
  if(svgs.length)$('copy').onclick=()=>{
    const code=svgs.join('\n');const done=()=>{$('copyout').innerHTML='<div class="note ok">SVG კოდი დაკოპირდა.</div>'};
    const fallback=()=>{$('copyout').innerHTML='<textarea class="copybox" id="cb" readonly></textarea><p class="hint">მონიშნეთ და დააკოპირეთ ხელით.</p>';$('cb').value=code;$('cb').select()};
    try{navigator.clipboard.writeText(code).then(done,fallback)}catch(e){fallback()}
  };
}
$('go').onclick=()=>run($('q').value);
$('q').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run($('q').value)}});
['mono','planned','f-rf'].forEach(id=>$(id).addEventListener('change',()=>run($('q').value)));
['f-n','f-hi','f-eq','f-dt'].forEach(id=>$(id).addEventListener('input',()=>run($('q').value)));
document.addEventListener('click',e=>{const c=e.target.closest('[data-q]');if(!c)return;showTab('gen');$('q').value=c.dataset.q;run(c.dataset.q);window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})});

/* ===================== CATALOG ===================== */
function buildCatalog(){
  const h=[];
  const block=(title,sub,items,wide)=>`<div class="cathead"><h3>${title}</h3><p>${sub}</p></div><div class="catgrid${wide?' wide':''}">${items.join('')}</div>`;
  const ub=(q,u,label,small)=>`<button class="cat" data-q="${esc(q)}">${unitSVG(u)}<span>${label}${small?'<br><small>'+small+'</small>':''}</span></button>`;
  h.push(block('ვინაობა','ჩარჩოს ფორმა და ფერი — ვისი ძალაა',Object.keys(AFF).map(k=>ub(`${AFF[k].word} ქვეითი`,{aff:k,icons:[]},AFF[k].ka,AFF[k].frame))));
  for(const g of ['svc','man','fire','sup','sus']){
    h.push(block((g==='svc'?'':'გვარეობა: ')+GRP[g],g==='svc'?'ჩარჩოს შიდა ნაწილი უთითებს ქვედანაყოფის ტიპს':'ძირითადი ხატულა ჩარჩოს შიგნით',Object.keys(BR).filter(k=>BR[k].grp===g).map(k=>ub(`საკუთარი ${BR[k].ka}`,{aff:'F',icons:BR[k].icons},BR[k].ka))));
  }
  h.push(block('მოწინააღმდეგის ნიშნები','იგივე ხატულები რომბში',['inf','armor','recon','art','mot','ad','at','sp','eng'].map(k=>ub(`მოწინააღმდეგის ${BR[k].ka}`,{aff:'H',icons:k==='sp'?['art','armor']:k==='mot'?['inf','mot']:BR[k].icons},k==='sp'?'თვითმავალი საარტილერიო':k==='mot'?'მოტორიზებული ქვეითი':BR[k].ka))));
  h.push(block('მოდიფიკატორები','ემატება ძირითად ხატულას',[
    ub('საკუთარი თვითმავალი საარტილერიო',{aff:'F',icons:['art','armor']},'თვითმავალი (ოვალი)'),
    ub('საკუთარი მოტორიზებული სადაზვერვო',{aff:'F',icons:['recon','mot']},'მოტორიზებული სადაზვერვო'),
    ub('საკუთარი სადესანტო ქვეითი',{aff:'F',icons:['inf'],abn:true},'სადესანტო'),
    ub('საკუთარი ქვეითი ბატალიონის შტაბი',{aff:'F',icons:['inf'],ech:'battalion',hq:true},'შტაბი'),
    ub('საკუთარი დაგეგმილი ქვეითი ასეული',{aff:'F',icons:['inf'],ech:'company',planned:true},'დაგეგმილი (წყვეტილი)')]));
  h.push(block('ეშელონი','სიდიდის ნიშანი ჩარჩოს ზემოთ — კურსის ტერმინებით',ECH_ORDER.map(k=>ub(`საკუთარი ქვეითი ${ECH[k].ka.split(' /')[0]}`,{aff:'F',icons:['inf'],ech:k},ECH[k].ka,esc(ECH[k].mark.split(' —')[0])+(ECH[k].src==='app6'?' · APP-6':'')))));
  h.push(block('მომარაგების კლასები','ზურგის ჩარჩო ქვედა ხაზით + კლასის ნიშანი',Object.keys(CLS).map(k=>ub(`${k}-კლასი`,{aff:'F',icons:['sup','c'+k]},CLS[k].ka))));
  for(const g in SPG){
    h.push(block(SPG[g],['ob','mn','mf'].includes(g)?'მწვანე — საკუთარი და მოწინააღმდეგის წინაღობები':g==='wp'?'ნაჩვენებია მსუბუქი; საშუალო — ერთი ხაზი, მძიმე — ორი':'',Object.keys(SP).filter(k=>SP[k].g===g).map(k=>`<button class="cat" data-q="${esc((SP[k].lv?'მსუბუქი ':'')+(SP[k].stems[0]||SP[k].ka))}">${spSVG(k,'F',1)}<span>${esc(SP[k].ka)}${SP[k].note?'<br><small>გადაამოწმეთ</small>':''}</span></button>`)));
  }
  for(const g in TG){
    const ks=Object.keys(TK).filter(k=>TK[k].g[0]===g);if(!ks.length)continue;
    h.push(block('დავალებები: '+TG[g],'გრაფიკა — კურსის მასალიდან',ks.map(k=>`<button class="cat" data-q="${esc(TK[k].ka)}">${TK[k].img?taskImg(k):canalizeSVG()}<span>${esc(TK[k].ka)}<br><small>${TK[k].en}${TK[k].v?' · გადაამოწმეთ':''}</small></span></button>`),true));
  }
  $('catalog').innerHTML=h.join('');
}

/* ===================== RULES ===================== */
function buildRules(){
  const R=RULES,h=[];
  const frameMono=(shape,label,extra)=>`<div class="board"><svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#000" stroke-width="4">${shape}</g>${extra||''}</svg><div class="cap">${label}</div></div>`;
  h.push(`<div><h3>განმარტება და დანიშნულება</h3><p>${esc(R.def)}</p><p class="hint">ლიტერატურა: ${esc(R.lit)}</p></div>`);
  h.push(`<div><h3>ნიშნების სახეები</h3><div class="kinds">${R.kinds.map(([t,l])=>`<div class="kind"><b>${esc(t)}</b><ul>${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div></div>`);
  h.push(`<div class="two"><div><h3>ფერები</h3><div class="swatches">${R.colors.map(([c,n,d],i)=>{
      const shapes=['<rect x="8" y="12" width="56" height="36"/>','<path d="M36,4 L62,30 L36,56 L10,30 Z"/>','<path d="M24,46 C6,46 6,22 24,22 C24,4 48,4 48,22 C66,22 66,46 48,46 C48,64 24,64 24,46 Z" transform="translate(0,-4)"/>','<circle cx="36" cy="34" r="10" fill="'+c+'"/><path d="M28,26 L20,14 M44,26 L52,14"/>'];
      return `<div class="sw"><svg viewBox="0 0 72 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="${c}" stroke-width="3.5">${shapes[i]}</g></svg><div><b>${n}</b> — ${esc(d)}</div></div>`}).join('')}</div></div>
    <div><h3>ერთი ფერის გამოყენებით</h3><p>${esc(R.mono)}</p><div class="mini">
      ${frameMono('<rect x="25" y="35" width="150" height="80"/>','საკუთარი')}
      ${frameMono('<rect x="25" y="35" width="150" height="80"/>','მოწინააღმდეგე',`<text x="178" y="132" font-family="${GEO}" font-size="20" font-weight="700" text-anchor="end">მოწ.</text>`)}
      ${frameMono('<rect x="25" y="35" width="150" height="80"/><rect x="35" y="45" width="130" height="60"/>','მოწინააღმდეგე')}
      ${frameMono('<path d="M100,10 L160,70 L100,130 L40,70 Z"/>','მოწინააღმდეგე')}
    </div></div></div>`);
  h.push(`<div class="two"><div><h3>ხაზის ტიპი</h3><div class="mini">${R.lines.map(([t,d],i)=>frameMono(`<rect x="35" y="35" width="130" height="70"${i?' stroke-dasharray="14 9"':''}/>`,`${t}: ${d}`)).join('')}</div></div>
    <div><h3>ნიშნების ზომები</h3><div class="tbl"><table><tbody>${R.sizes.map(([a,b])=>`<tr><td class="k">${a}</td><td>${b}</td></tr>`).join('')}</tbody></table></div></div></div>`);
  h.push(`<div><h3>ნიშნის მდებარეობა</h3><ul>${R.place.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`);
  const ex=unitSVG({aff:'F',icons:['inf','armor'],ech:'platoon',f:{dt:'140530იან2008',rf:'(−)',eq:'1-BTR',n:'3',hi:'2'}});
  const fd=(col,dia)=>{const P=dia?[[1,100,102],[2,100,2],[6,40,30],[7,160,30],[5,2,100],[3,40,180],[4,160,180],[8,100,205]]:[[1,100,100],[2,100,24],[6,8,40],[7,192,40],[5,8,96],[3,8,150],[4,192,150],[8,100,172]];
    const sh=dia?'<path d="M100,15 L175,90 L100,165 L25,90 Z" fill="none" stroke="currentColor" stroke-width="4"/>':'<rect x="25" y="40" width="150" height="100" fill="none" stroke="currentColor" stroke-width="4"/>';
    return `<svg viewBox="-40 -30 280 250" xmlns="http://www.w3.org/2000/svg" style="color:${col}">${sh}${P.map(([n,x,y])=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial" font-weight="700" font-size="${n===1?34:24}" fill="currentColor">${n}</text>`).join('')}</svg>`};
  h.push(`<div><h3>ტაქტიკური ნიშნის ველები</h3><div class="two"><div class="mini" style="grid-template-columns:1fr 1fr"><div class="board">${fd('#1D3FBF')}<div class="cap">საკუთარი</div></div><div class="board">${fd('#D0141E',1)}<div class="cap">მოწინააღმდეგე</div></div></div>
    <div class="tbl"><table><thead><tr><th>ველი</th><th>შინაარსი</th><th>სახე</th></tr></thead><tbody>${R.fields.map(([n,a,b])=>`<tr><td class="k">${n}</td><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="two" style="margin-top:14px"><div class="board">${ex}<div class="cap">მაგალითი: საკუთარი მექანიზებული ქვეითი ოცეული — მე-2 ასეულის მე-3 ოცეული, გამოყოფით, 1 ბტრ</div></div>
    <p class="hint">ველების შევსება შეგიძლიათ გენერატორში — „გვერდითი მონაცემები (ველები 3–7)“.</p></div></div>`);
  $('rules').innerHTML=h.join('');
}

/* ===================== PRACTICE ===================== */
let qT=null,qOk=0,qN=0,qDone=false;
const QBR=Object.keys(BR).filter(k=>!['land','sp','mot'].includes(k));
const QECH=['team','squad','section','platoon','company','battalion','brigade','division'];
const QSP=Object.keys(SP).filter(k=>k!=='mf_gen');
const pick=a=>a[Math.floor(Math.random()*a.length)];
function newQ(){
  qDone=false;$('qa').value='';$('qfb').innerHTML='';
  const roll=Math.random();
  if(roll<.3){const k=pick(Object.keys(TK).filter(k=>!TK[k].v));qT={task:k};$('qboard').innerHTML=taskImg(k);$('qhint').textContent='ჩაწერეთ დავალების დასახელება.'}
  else if(roll<.6){const k=pick(QSP);qT={sp:k,lvl:SP[k].lv?1+Math.floor(Math.random()*3):0};$('qboard').innerHTML=spSVG(k,'F',qT.lvl);$('qhint').textContent=SP[k].lv?'ჩაწერეთ იარაღის დასახელება და სიმძიმე (მსუბუქი / საშუალო / მძიმე).':'ჩაწერეთ ნიშნის დასახელება.'}
  else{const b=pick(QBR);qT={aff:pick(['F','H','N','U']),br:b,ech:pick(QECH)};$('qboard').innerHTML=unitSVG({aff:qT.aff,icons:BR[qT.br].icons,ech:qT.ech});$('qhint').textContent='ჩაწერეთ სრული განმარტება: ვინაობა, გვარეობა და ეშელონი.'}
}
function check(){
  if(qDone)return;const r=parse($('qa').value);const li=[];let ok=true,answer='';
  if(!$('qa').value.trim()){$('qfb').innerHTML='<div class="note warn">ჯერ ჩაწერეთ განმარტება.</div>';return}
  if(qT.task){ok=!!r.tasks.find(t=>t.key===qT.task);answer=TK[qT.task].ka;li.push([ok,`დავალება: ${TK[qT.task].ka} (${TK[qT.task].en})`])}
  else if(qT.sp){
    const S=SP[qT.sp];const a=!!r.sp.find(x=>x.key===qT.sp);li.push([a,`ნიშანი: ${S.ka}`]);ok=a;
    if(S.lv){const l=(r.lvl||0)===qT.lvl;li.push([l,`სიმძიმე: ${LVL[qT.lvl].ka}`]);ok=a&&l}
    answer=(S.lv?LVL[qT.lvl].ka+' ':'')+S.ka;
  }else{
    const a=r.aff===qT.aff,e=r.ech===qT.ech,ic=iconsOf(r).slice().sort().join()===BR[qT.br].icons.slice().sort().join();
    li.push([a,`ვინაობა: ${AFF[qT.aff].ka}`],[ic,`გვარეობა: ${BR[qT.br].ka}`],[e,`ეშელონი: ${ECH[qT.ech].ka}`]);ok=a&&e&&ic;
    answer=`${AFF[qT.aff].word} ${BR[qT.br].ka} ${ECH[qT.ech].ka.split(' /')[0]}`;
  }
  qN++;if(ok)qOk++;qDone=true;$('qscore').textContent=`${qOk} / ${qN}`;
  $('qfb').innerHTML=`<div class="note ${ok?'ok':'bad'}"><b>${ok?'სწორია.':'არასრულია ან არასწორია.'}</b> სწორი განმარტება: ${esc(answer)}</div>
   <ul class="fb">${li.map(x=>`<li>${x[0]?'✓':'✗'} ${esc(x[1])}</li>`).join('')}</ul>
   ${qT.task?`<p class="def">${esc(TK[qT.task].def)}</p>`:''}
   ${r.left.length?`<p class="hint">ვერ ამოვიცანი: ${r.left.map(esc).join(', ')}</p>`:''}`;
}
$('qcheck').onclick=check;$('qnext').onclick=newQ;
$('qa').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();qDone?newQ():check()}});

/* ===================== TABS ===================== */
const built={};
function showTab(t){
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));
  ['gen','cat','rules','quiz'].forEach(x=>$('sec-'+x).hidden=x!==t);
  if(t==='cat'&&!built.cat){buildCatalog();built.cat=1}
  if(t==='rules'&&!built.rules){buildRules();built.rules=1}
  if(t==='quiz'&&!qT)newQ();
  try{localStorage.setItem('tsg-tab',t)}catch(e){}
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.t));
(function(){const h=(location.hash||'').slice(1);if(['gen','cat','rules','quiz'].includes(h))showTab(h)})();
run($('q').value);
