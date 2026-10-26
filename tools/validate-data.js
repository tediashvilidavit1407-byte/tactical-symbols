// მონაცემების შემოწმება: node tools/validate-data.js
// ამოწმებს symbols-data.js-ს — გაფუჭებული ჩანაწერი აპლიკაციაში არ უნდა მოხვდეს.
const fs = require('fs'), path = require('path'), vm = require('vm');
const www = path.join(__dirname, '..', 'www');
const dataSrc = fs.readFileSync(path.join(www, 'symbols-data.js'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(dataSrc + '\n;globalThis.__d={AFF,FR,ICON,BR,MOD,ECH,ECH_ORDER,TK,TG,GRP,AMBIG,SP,SPG,CLS,LVL,RULES,SRC};', ctx);
const { AFF, FR, ICON, BR, MOD, ECH, ECH_ORDER, TK, TG, GRP, AMBIG, SP, SPG, CLS, LVL, RULES, SRC } = ctx.__d;
const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);

// 1. სახელები და ფუძეები; ერთი ფუძე — ერთი ჩანაწერი
const sets = { AFF, BR, MOD, ECH, TK, SP, CLS, LVL };
const stemOwner = new Map();
for (const [setName, set] of Object.entries(sets)) {
  for (const [key, e] of Object.entries(set)) {
    const id = `${setName}.${key}`;
    if (!e.ka) err(`${id}: აკლია ქართული სახელი (ka)`);
    if (!Array.isArray(e.stems)) { err(`${id}: აკლია ფუძეები (stems)`); continue; }
    if (!e.stems.length && setName !== 'SP') err(`${id}: ფუძეების სია ცარიელია`);
    for (const s of e.stems) {
      if (s !== s.toLowerCase()) err(`${id}: ფუძე „${s}“ უნდა იყოს პატარა ასოებით`);
      if (s.trim().length < 2) err(`${id}: ფუძე „${s}“ ძალიან მოკლეა`);
      if (/[-.()]/.test(s)) err(`${id}: ფუძე „${s}“ არ უნდა შეიცავდეს - . ( ) — ამოცნობისას ისინი სივრცით იცვლება`);
      if (stemOwner.has(s) && stemOwner.get(s) !== id) err(`ფუძე „${s}“ ორჯერ გვხვდება: ${stemOwner.get(s)} და ${id}`);
      stemOwner.set(s, id);
    }
  }
}
// 2. ჩარჩოები, ხატულები, ჯგუფები
for (const k of Object.keys(AFF)) { if (!FR[k]) err(`AFF.${k}: FR-ში ჩარჩო არ არსებობს`); if (!AFF[k].line) err(`AFF.${k}: აკლია ხაზის ფერი (line)`); }
for (const [k, b] of Object.entries(BR)) {
  for (const i of b.icons || []) if (!ICON[i]) err(`BR.${k}: ხატულა „${i}“ ICON-ში არ არსებობს`);
  if (!GRP[b.grp]) err(`BR.${k}: ჯგუფი „${b.grp}“ GRP-ში არ არსებობს`);
  if (b.src && !SRC[b.src]) err(`BR.${k}: წყარო „${b.src}“ უცნობია`);
}
for (const k of Object.keys(CLS)) if (!ICON['c' + k]) err(`CLS.${k}: ხატულა „c${k}“ ICON-ში არ არსებობს`);
for (const k of ECH_ORDER) if (!ECH[k]) err(`ECH_ORDER: „${k}“ ECH-ში არ არსებობს`);
for (const k of Object.keys(ECH)) if (!ECH_ORDER.includes(k)) err(`ECH.${k}: არ არის ECH_ORDER-ში`);
// 3. სპეციალური ნიშნები: ჯგუფი, viewBox, SVG
for (const [k, s] of Object.entries(SP)) {
  if (!SPG[s.g]) err(`SP.${k}: ჯგუფი „${s.g}“ SPG-ში არ არსებობს`);
  if (!/^-?\d+ -?\d+ \d+ \d+$/.test(s.vb || '')) err(`SP.${k}: viewBox არასწორია`);
  try { for (const l of s.lv ? [1, 2, 3] : [0]) { const out = s.svg('#000', l); if (!/<\w/.test(out)) err(`SP.${k}: SVG ცარიელია`); } }
  catch (e) { err(`SP.${k}: SVG-ის აგება ჩავარდა — ${e.message}`); }
  if (!s.stems.length) warn(`SP.${k}: ფუძეები ცარიელია — გენერატორში მხოლოდ სხვა წესით ამოიცნობა`);
  if (s.note) warn(`SP.${k} (${s.ka}): ${s.note}`);
}
// 4. დავალებები: ჯგუფი, განმარტება, გრაფიკის ფაილი
for (const [k, t] of Object.entries(TK)) {
  if (!t.en) err(`TK.${k}: აკლია ინგლისური სახელი (en)`);
  if (!t.def) err(`TK.${k}: აკლია განმარტება (def)`);
  for (const g of t.g || []) if (!TG[g]) err(`TK.${k}: ჯგუფი „${g}“ TG-ში არ არსებობს`);
  for (const f of [t.img, t.ob].filter(Boolean)) if (!fs.existsSync(path.join(www, 'tasks', f + '.png'))) err(`TK.${k}: ფაილი tasks/${f}.png არ არსებობს`);
  if (t.ob && !t.obdef) warn(`TK.${k}: დაბრკოლების ეფექტს განმარტება აკლია`);
  if (t.v) warn(`TK.${k} (${t.ka}): ${t.note || 'გადასამოწმებელია'}`);
}
for (const a of AMBIG) for (const k of a.keys) if (!TK[k]) err(`AMBIG „${a.stem}“: TK.${k} არ არსებობს`);
// 5. ორაზროვანი ფუძე არ უნდა იყოს უფრო გრძელი, ვიდრე ზუსტი
for (const a of AMBIG) for (const k of a.keys) if (!TK[k].stems.some(s => s.length > a.stem.length && s.includes(a.stem.trim()))) warn(`AMBIG „${a.stem}“: TK.${k}-ს არ აქვს უფრო გრძელი ფუძე — დაზუსტება შეიძლება ვერ მოხერხდეს`);

const count = `ვინაობა ${Object.keys(AFF).length} · სახეობა/გვარეობა ${Object.keys(BR).length} · ეშელონი ${Object.keys(ECH).length} · კლასი ${Object.keys(CLS).length} · სპეციალური ${Object.keys(SP).length} · დავალება ${Object.keys(TK).length} · ფუძე ${stemOwner.size}`;
console.log('ტაქტიკური ნიშნები — მონაცემების შემოწმება\n' + count + '\n');
warns.forEach(w => console.log('  ! ' + w));
errors.forEach(e => console.log('  ✗ ' + e));
console.log(errors.length ? `\nშეცდომა: ${errors.length}. გამოსწორებამდე არ გამოაქვეყნოთ.` : `\nშეცდომა არ არის (გაფრთხილება: ${warns.length}).`);
process.exit(errors.length ? 1 : 0);
