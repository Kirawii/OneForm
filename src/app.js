const PROFILE_KEY='tuimian-real-form-profile-v2';
const CHECK_KEY='tuimian-real-form-check-v2';
const SUBMIT_KEY='tuimian-real-form-submit-v2';
const fields=()=>[...document.querySelectorAll('[data-key]')];

function data(){return Object.fromEntries(fields().map(e=>[e.dataset.key,e.value.trim()]))}
function setData(obj){
  fields().forEach(e=>{if(Object.prototype.hasOwnProperty.call(obj,e.dataset.key))e.value=obj[e.dataset.key]??''})
}
function save(show=false){
  localStorage.setItem(PROFILE_KEY,JSON.stringify(data()));
  localStorage.setItem(CHECK_KEY,JSON.stringify(checkData('[data-check]')));
  localStorage.setItem(SUBMIT_KEY,JSON.stringify(checkData('[data-submit-check]')));
  render();
  if(show)toast('已保存在当前浏览器');
}
function load(){
  try{
    const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}');setData(p);
    loadChecks('[data-check]',JSON.parse(localStorage.getItem(CHECK_KEY)||'{}'));
    loadChecks('[data-submit-check]',JSON.parse(localStorage.getItem(SUBMIT_KEY)||'{}'));
  }catch(e){console.warn(e)}
  render();
}
function checkData(sel){
  return Object.fromEntries([...document.querySelectorAll(sel)].map(e=>[e.dataset.check||e.dataset.submitCheck,e.checked]))
}
function loadChecks(sel,obj){
  document.querySelectorAll(sel).forEach(e=>e.checked=!!obj[e.dataset.check||e.dataset.submitCheck]);updateCheckStyles()
}
function updateCheckStyles(){
  document.querySelectorAll('.check').forEach(x=>x.classList.toggle('done',x.querySelector('input')?.checked))
}
async function copyText(text){
  if(!text){toast('该项还没有内容');return}
  try{await navigator.clipboard.writeText(text)}
  catch{
    const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()
  }
  toast('已复制')
}
function copyKey(key){copyText(data()[key]||'')}
function labelFor(e){
  return e.closest('.field')?.querySelector('label')?.innerText||e.dataset.key
}
function copySection(id){
  const s=document.getElementById(id);
  const lines=[...s.querySelectorAll('[data-key]')].filter(e=>e.value.trim()).map(e=>`${labelFor(e)}：${e.value.trim()}`);
  copyText(lines.join('\n\n'))
}
function copyTable(id,title){
  const table=document.getElementById(id),headers=[...table.querySelectorAll('thead th')].map(x=>x.innerText.trim());
  const rows=[...table.querySelectorAll('tbody tr')].map(tr=>{
    const vals=[...tr.querySelectorAll('input,textarea,select')].map(x=>x.value.trim());
    if(!vals.some(Boolean))return '';
    return headers.map((h,i)=>`${h}：${vals[i]||''}`).join('；')
  }).filter(Boolean);
  copyText(`【${title}】\n${rows.join('\n')}`)
}
function formatBirthday(compact,style){
  const m=(compact||'').match(/^(\d{4})(\d{2})(\d{2})$/);if(!m)return compact||'待填写';
  return style==='dash'?`${m[1]}-${m[2]}-${m[3]}`:`${m[1]}年${Number(m[2])}月${Number(m[3])}日`
}
function rankPercent(){
  const d=data(),r=Number(d.rankNumber),t=Number(d.rankTotal);
  return r&&t?`${(r/t*100).toFixed(1)}%`:'待填写'
}
function rankStandard(){
  const d=data(),r=Number(d.rankNumber),t=Number(d.rankTotal);
  if(!r||!t||r<1||t<1||r>t)return '待填写';
  return `${d.rankNumber}/${d.rankTotal}（前${Math.ceil(r/t*100)}%）`
}
const quickDefs=[
  ['姓名拼音（无空格）',d=>d.namePinyin],
  ['中文姓名',d=>d.nameCn],
  ['出生日期 YYYYMMDD',d=>d.birthdayCompact],
  ['出生日期 YYYY-MM-DD',d=>formatBirthday(d.birthdayCompact,'dash')],
  ['出生日期中文',d=>formatBirthday(d.birthdayCompact,'cn')],
  ['排名（拆分）',d=>`${d.rankNumber||'待填'} / ${d.rankTotal||'待填'}`],
  ['排名（标准口径）',()=>rankStandard()],
  ['精确排名百分比',d=>rankPercent()],
  ['本科院校',d=>d.universityCodeName],
  ['本科专业',d=>d.majorCodeName],
  ['入学年月',d=>d.enrollmentMonth],
  ['预计毕业年月',d=>d.graduationMonth]
];
function renderDerived(){
  const d=data(),box=document.getElementById('derived');
  box.innerHTML=quickDefs.map(([k,fn])=>{
    const v=fn(d)||'待填写';
    return `<div class="card" data-search=""><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><div class="ops"><button class="btn small" data-copy="${escAttr(v)}">复制</button></div></div>`
  }).join('');
  box.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copyText(b.dataset.copy))
}
function renderFilenames(){
  const n=data().nameCn||'姓名';
  const files=[
    `${n}_推免申请表.pdf`,`${n}_身份证.pdf`,`${n}_学籍在线验证报告.pdf`,
    `${n}_本科成绩单.pdf`,`${n}_成绩排名证明.pdf`,`${n}_外语成绩证明.pdf`,
    `${n}_学术成果及竞赛证明.pdf`,`${n}_荣誉奖励证明.pdf`,
    `${n}_实践经历证明.pdf`,`${n}_个人简历.pdf`
  ];
  const box=document.getElementById('filenameList');
  box.innerHTML=files.map(f=>`<div class="filename"><span>${esc(f)}</span><button class="btn small" data-file="${escAttr(f)}">复制</button></div>`).join('');
  box.querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>copyText(b.dataset.file))
}
function copyFilenames(){
  copyText([...document.querySelectorAll('#filenameList .filename span')].map(x=>x.innerText).join('\n'))
}
function updateProgress(){
  const important=new Set(['nameCn','namePinyin','idNumber','birthdayCompact','ethnicity','gender','politicalStatus',
  'birthplace','nativePlace','mailingAddress','postalCode','phone','email','universityCodeName','college','majorCodeName',
  'enrollmentMonth','graduationMonth','studentId','averageScore','rankNumber','rankTotal']);
  let total=0,filled=0;
  fields().forEach(e=>{const w=important.has(e.dataset.key)?2:1;total+=w;if(e.value.trim())filled+=w});
  const pct=Math.round(filled/total*100);document.getElementById('progressBar').style.width=pct+'%';
  document.getElementById('progressText').innerText=pct+'%'
}
function render(){renderDerived();renderFilenames();updateProgress();updateCheckStyles()}
function copyQuick(){
  const lines=[...document.querySelectorAll('#derived .card')].map(c=>`${c.querySelector('.k').innerText}：${c.querySelector('.v').innerText}`);
  copyText(lines.join('\n'))
}
function copyCore(){
  const d=data();
  copyText([
    `姓名：${d.nameCn||''}`,`姓名拼音：${d.namePinyin||''}`,`英文姓名：${d.nameEn||''}`,
    `出生日期：${d.birthdayCompact||''}`,`民族：${d.ethnicity||''}`,`性别：${d.gender||''}`,
    `政治面貌：${d.politicalStatus||''}`,`本科学校：${d.universityCodeName||''}`,
    `本科院系：${d.college||''}`,`本科专业：${d.majorCodeName||''}`,
    `入学年月：${d.enrollmentMonth||''}`,`预计毕业年月：${d.graduationMonth||''}`,
    `平均成绩：${d.averageScore||''}`,`排名：${d.rankNumber||''}/${d.rankTotal||''}`,
    d.phone?`移动电话：${d.phone}`:'',d.email?`电子邮箱：${d.email}`:''
  ].filter(Boolean).join('\n'))
}
function copyAll(){
  const chunks=[...document.querySelectorAll('main section')].map(s=>{
    const lines=[...s.querySelectorAll('[data-key]')].filter(e=>e.value.trim()).map(e=>`${e.dataset.key}：${e.value.trim()}`);
    return lines.length?`【${s.querySelector('h3')?.innerText||s.id}】\n${lines.join('\n')}`:''
  }).filter(Boolean);copyText(chunks.join('\n\n'))
}
function sanitize(s){return s.replace(/[,，、#]/g,m=>m==='，'?';':'').replace(/\s*;\s*/g,'；').replace(/；+/g,'；')}
function copySanitizedPractice(){
  const d=data();copyText([
    `科研训练：${sanitize(d.researchTraining||'')}`,
    `实习实践：${sanitize(d.internshipExperience||'')}`,
    `社会工作：${sanitize(d.socialExperience||'')}`
  ].join('\n\n'))
}
function exportObject(){return{version:2,exportedAt:new Date().toISOString(),profile:data(),materials:checkData('[data-check]'),submit:checkData('[data-submit-check]')}}
function exportData(){
  const blob=new Blob([JSON.stringify(exportObject(),null,2)],{type:'application/json'});
  const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;
  a.download=`推免报名信息-${data().nameCn||'姓名'}-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)
}
function openImport(){
  document.getElementById('jsonArea').value='';document.getElementById('dialogTitle').innerText='导入 JSON 备份';
  document.getElementById('dialogHint').innerHTML='粘贴 JSON 后应用，或 <button class="btn small" onclick="fileInput.click()">选择 JSON 文件</button>';
  jsonDialog.showModal()
}
function applyObject(obj){
  setData(obj.profile||obj);
  if(obj.materials)loadChecks('[data-check]',obj.materials);
  if(obj.submit)loadChecks('[data-submit-check]',obj.submit);
  save();toast('备份已导入')
}
function applyImport(){
  try{applyObject(JSON.parse(document.getElementById('jsonArea').value));jsonDialog.close()}
  catch{toast('JSON 格式不正确')}
}
function resetAll(){
  if(!confirm('确定恢复本版初始模板吗？浏览器中已填写的内容会被清除。'))return;
  localStorage.removeItem(PROFILE_KEY);localStorage.removeItem(CHECK_KEY);localStorage.removeItem(SUBMIT_KEY);location.reload()
}
function clearSubmitChecks(){
  document.querySelectorAll('[data-submit-check]').forEach(e=>e.checked=false);save();toast('提交检查已清空')
}
function toast(msg){
  const t=document.getElementById('toast');t.innerText=msg;t.classList.add('show');
  clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.remove('show'),1500)
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escAttr(s){return esc(s).replace(/\n/g,'&#10;')}

function initTableCopyButtons(){
  document.querySelectorAll('.tablewrap td > [data-key]').forEach(input=>{
    if(input.parentElement.classList.contains('table-input-wrap'))return;
    const cell=input.closest('td'),row=cell.closest('tr'),table=cell.closest('table');
    const column=[...row.children].indexOf(cell);
    const heading=table.querySelectorAll('thead th')[column]?.innerText.trim()||'该字段';
    const wrap=document.createElement('div'),button=document.createElement('button');
    wrap.className='table-input-wrap';
    button.type='button';
    button.className='icon table-copy';
    button.innerText='⧉';
    button.title=`复制${heading}`;
    button.setAttribute('aria-label',`复制${heading}`);
    button.addEventListener('click',()=>copyKey(input.dataset.key));
    input.before(wrap);wrap.append(input,button)
  })
}

initTableCopyButtons();
fields().forEach(e=>e.addEventListener('input',()=>save(false)));
document.querySelectorAll('[data-check],[data-submit-check]').forEach(e=>e.addEventListener('change',()=>save(false)));
document.getElementById('fileInput').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{applyObject(JSON.parse(await f.text()));jsonDialog.close()}catch{toast('无法读取该文件')}
  e.target.value=''
});
document.getElementById('search').addEventListener('input',e=>{
  const q=e.target.value.trim().toLowerCase();let count=0;
  document.querySelectorAll('.field,.card').forEach(x=>{
    const text=((x.dataset.search||'')+' '+x.innerText+' '+[...x.querySelectorAll('input,textarea')].map(a=>a.value).join(' ')).toLowerCase();
    const ok=!q||text.includes(q);x.classList.toggle('hidden',!ok);if(ok)count++
  });
  document.querySelectorAll('main section').forEach(s=>{
    const items=[...s.querySelectorAll('.field,.card')];if(!items.length)return;
    s.style.display=!q||items.some(x=>!x.classList.contains('hidden'))?'':'none'
  })
});
const obs=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting)document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))
}),{rootMargin:'-20% 0px -70% 0px'});
document.querySelectorAll('main section').forEach(s=>obs.observe(s));
load();
