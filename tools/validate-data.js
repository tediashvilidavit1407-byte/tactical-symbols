// მონაცემების შემოწმება: node tools/validate-data.js
// ამოწმებს symbols-data.js-ს — გაფუჭებული ჩანაწერი აპლიკაციაში არ უნდა მოხვდეს.
const fs = require('fs'), path = require('path'), vm = require('vm');
const www = path.join(__dirname, '..', 'www');
const dataSrc = fs.readFileSync(path.join(www, 'symbols-data.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(www, 'app.js'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(dataSrc + '\n;globalThis.__d={AFF,FR,ICON,BR,MOD,ECH,ECH_ORDER,TK,TG,GRP,AMBIG};', ctx);
const { AFF, FR, ICON, BR, MOD, ECH, ECH_ORDER, TK, TG, GRP, AMBIG } = ctx.__d;
const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);

// 1. ყველა ჩანაწერს უნდა ჰქონდეს ქართული სახელი და ფუძეები
const sets = { AFF, BR, MOD, ECH, TK };
const stemOwner = new Map();
for (const [setName, set] of Object.entries(sets)) {
  for (const [key, e] of Object.entries(set)) {
    const id = `${setName}.${key}`;
    if (!e.ka) err(`${id}: აკლია ქართული სახელი (ka)`);
    if (!Array.isArray(e.stems) || !e.stems.length) { err(`${id}: აკლია ფუძეები (stems)`); continue; }
    for (const s of e.stems) {
      if (s !== s.toLowerCase()) err(`${id}: ფუძე „${s}“ უნდა იყოს პატარა ასოებით`);
      if (s.length < 2) err(`${id}: ფუძე „${s}“ ძალიან მოკლეა`);
      if (stemOwner.has(s) && stemOwner.get(s) !== id) err(`ფუძე „${s}“ ორჯერ გვხვდება: ${stemOwner.get(s)} და ${id}`);
      stemOwner.set(s, id);
    }
  }
}
// 2. ფუძეების გადაფარვა (ერთი მეორის ნაწილია) — გაფრთხილება, არა შეცდომა
const all = [...stemOwner.keys()];
for (const a of all) for (const b of all)
  if (a !== b && b.startsWith(a) && stemOwner.get(a) !== stemOwner.get(b) && a.length > 3)
    warn(`ფუძე „${a}“ (${stemOwner.get(a)}) „${b}“-ს (${stemOwner.get(b)}) თავსართია — გრძელი ამოიცნობა პირველი, შეამოწმეთ სწორად მუშაობს თუ არა`);
// 3. აფილაციას უნდა ჰქონდეს ჩარჩო
for (const k of Object.keys(AFF)) if (!FR[k]) err(`AFF.${k}: FR-ში ჩარჩო არ არსებობს`);
// 4. დარგის ხატულები და ჯგუფი
for (const [k, b] of Object.entries(BR)) {
  for (const i of b.icons || []) if (!ICON[i]) err(`BR.${k}: ხატულა „${i}“ ICON-ში არ არსებობს`);
  if (!GRP[b.grp]) err(`BR.${k}: ჯგუფი „${b.grp}“ GRP-ში არ არსებობს`);
  if (!b.desc) warn(`BR.${k}: აკლია აღწერა (desc)`);
}
// 5. ეშელონების რიგი
for (const k of ECH_ORDER) if (!ECH[k]) err(`ECH_ORDER: „${k}“ ECH-ში არ არსებობს`);
for (const k of Object.keys(ECH)) if (!ECH_ORDER.includes(k)) err(`ECH.${k}: არ არის ECH_ORDER-ში`);
// 6. ამოცანები: ჯგუფი, განმარტება, გრაფიკა app.js-ში
for (const [k, t] of Object.entries(TK)) {
  if (!t.en) err(`TK.${k}: აკლია ინგლისური სახელი (en)`);
  if (!t.def) err(`TK.${k}: აკლია განმარტება (def)`);
  for (const g of t.g || []) if (!TG[g]) err(`TK.${k}: ჯგუფი „${g}“ TG-ში არ არსებობს`);
  if (!new RegExp(`\\b${k}\\s*:\\s*\\(\\)\\s*=>`).test(appSrc)) err(`TK.${k}: app.js-ში (taskSVG) გრაფიკა არ არსებობს`);
  if (t.v) warn(`TK.${k} (${t.ka}): გრაფიკა ჯერ გადასამოწმებელია ADP 1-02-თან (v:1)`);
}
for (const a of AMBIG) for (const k of a.keys) if (!TK[k]) err(`AMBIG „${a.stem}“: TK.${k} არ არსებობს`);

const count = `აფილაცია ${Object.keys(AFF).length} · დარგი ${Object.keys(BR).length} · ეშელონი ${Object.keys(ECH).length} · ამოცანა ${Object.keys(TK).length} · ფუძე ${all.length}`;
console.log('ტაქტიკური ნიშნები — მონაცემების შემოწმება\n' + count + '\n');
warns.forEach(w => console.log('  ! ' + w));
errors.forEach(e => console.log('  ✗ ' + e));
console.log(errors.length ? `\nშეცდომა: ${errors.length}. გამოსწორებამდე არ გამოაქვეყნოთ.` : `\nშეცდომა არ არის (გაფრთხილება: ${warns.length}).`);
process.exit(errors.length ? 1 : 0);
