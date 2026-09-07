const PROFILE_KEY='tuimian-real-form-profile-v2';
const CHECK_KEY='tuimian-real-form-check-v2';
const SUBMIT_KEY='tuimian-real-form-submit-v2';
const fields=()=>[...document.querySelectorAll('[data-key]')];
const dynamicTableConfigs={
  languageTable:{storageKey:'language',prefix:'lang',fields:[
    {suffix:'Type',placeholder:'CET-4 / CET-6 / IELTS / TOEFL'},
    {suffix:'Score',placeholder:'成绩'},
    {suffix:'Date',placeholder:'YYYY-MM'},
    {suffix:'Note',placeholder:'可选'}
  ]},
  researchTable:{storageKey:'research',prefix:'research',legacyTextKey:'researchTraining',fields:[
    {suffix:'Period',placeholder:'YYYY-MM 至 YYYY-MM'},
    {suffix:'Project',placeholder:'项目名称'},
    {suffix:'Level',placeholder:'国家级 / 省级 / 校级'},
    {suffix:'Role',placeholder:'排名或主要职责'},
    {suffix:'Detail',placeholder:'主要工作内容'}
  ]},
  competitionTable:{storageKey:'competitions',prefix:'comp',fields:[
    {suffix:'Person',placeholder:'姓名及排名'},
    {suffix:'Project',placeholder:'获奖项目名称'},
    {suffix:'Name',placeholder:'竞赛名称'},
    {suffix:'Level',placeholder:'获奖等级'},
    {suffix:'Date',placeholder:'YYYY-MM'}
  ]},
  awardTable:{storageKey:'awards',prefix:'award',fields:[
    {suffix:'Name',placeholder:'按证书填写'},
    {suffix:'Level',placeholder:'校级 / 省级 / 国家级'},
    {suffix:'Date',placeholder:'YYYY-MM'},
    {suffix:'Note',placeholder:'可选'}
  ]},
  customTable:{storageKey:'customFields',prefix:'custom',fields:[
    {suffix:'Label',placeholder:'例如：本科专业方向'},
    {suffix:'Value',placeholder:'填写内容'},
    {suffix:'Note',placeholder:'可选'}
  ]}
};

function data(){return Object.fromEntries(fields().map(e=>[e.dataset.key,e.value.trim()]))}
function dynamicData(){
  return Object.fromEntries(Object.entries(dynamicTableConfigs).map(([id,config])=>[
    config.storageKey,
    [...document.querySelectorAll(`#${id} tbody tr`)].map(row=>Object.fromEntries(
      [...row.querySelectorAll('[data-row-field]')].map(input=>[input.dataset.rowField,input.value.trim()])
    ))
  ]))
}
function profileData(){return{...data(),dynamicTables:dynamicData()}}
function setData(obj){
  fields().forEach(e=>{if(Object.prototype.hasOwnProperty.call(obj,e.dataset.key))e.value=obj[e.dataset.key]??''})
}
function save(show=false){
  localStorage.setItem(PROFILE_KEY,JSON.stringify(profileData()));
  localStorage.setItem(CHECK_KEY,JSON.stringify(checkData('[data-check]')));
  localStorage.setItem(SUBMIT_KEY,JSON.stringify(checkData('[data-submit-check]')));
  render();
  if(show)toast('已保存在当前浏览器');
}
function load(){
  try{
    const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}');restoreDynamicTables(p);setData(p);
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
  const cell=e.closest('td');
  if(cell){
    const column=[...cell.parentElement.children].indexOf(cell);
    return cell.closest('table')?.querySelectorAll('thead th')[column]?.innerText.trim()||e.dataset.key
  }
  return e.closest('.field')?.querySelector('label')?.innerText||e.dataset.key
}
function copySection(id){
  const s=document.getElementById(id);
  const lines=[...s.querySelectorAll('[data-key]')].filter(e=>e.value.trim()).map(e=>`${labelFor(e)}：${e.value.trim()}`);
  copyText(lines.join('\n\n'))
}
function copyTable(id,title){
  const table=document.getElementById(id),headers=[...table.querySelectorAll('thead th:not(.action-column)')].map(x=>x.innerText.trim());
  const rows=tableRows(id).map(vals=>{
    if(!vals.some(Boolean))return '';
    return headers.map((h,i)=>`${h}：${vals[i]||''}`).join('；')
  }).filter(Boolean);
  copyText(`【${title}】\n${rows.join('\n')}`)
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
  const important=new Set(['nameCn','namePinyin','idNumber','ethnicity','gender','politicalStatus',
  'birthplace','nativePlace','mailingAddress','postalCode','phone','email','universityCodeName','college','majorCodeName',
  'enrollmentMonth','graduationMonth','studentId','averageScore','rankNumber','rankTotal']);
  let total=0,filled=0;
  fields().forEach(e=>{
    if(e.dataset.rowField&&![...e.closest('tr').querySelectorAll('[data-row-field]')].some(input=>input.value.trim()))return;
    const w=important.has(e.dataset.key)?2:1;total+=w;if(e.value.trim())filled+=w
  });
  const pct=Math.round(filled/total*100);document.getElementById('progressBar').style.width=pct+'%';
  document.getElementById('progressText').innerText=pct+'%'
}
function render(){renderFilenames();updateProgress();updateCheckStyles()}
function copyCore(){
  const d=data();
  copyText([
    `姓名：${d.nameCn||''}`,`姓名拼音：${d.namePinyin||''}`,`民族：${d.ethnicity||''}`,`性别：${d.gender||''}`,
    `政治面貌：${d.politicalStatus||''}`,`本科学校：${d.universityCodeName||''}`,
    `本科院系：${d.college||''}`,`本科专业：${d.majorCodeName||''}`,
    `入学年月：${d.enrollmentMonth||''}`,`预计毕业年月：${d.graduationMonth||''}`,
    `平均成绩：${d.averageScore||''}`,`排名：${d.rankNumber||''}/${d.rankTotal||''}`,
    d.phone?`移动电话：${d.phone}`:'',d.email?`电子邮箱：${d.email}`:''
  ].filter(Boolean).join('\n'))
}
function copyAll(){
  const chunks=[...document.querySelectorAll('main section')].map(s=>{
    const lines=[...s.querySelectorAll('[data-key]')].filter(e=>e.value.trim()).map(e=>`${labelFor(e)}：${e.value.trim()}`);
    return lines.length?`【${s.querySelector('h3')?.innerText||s.id}】\n${lines.join('\n')}`:''
  }).filter(Boolean);copyText(chunks.join('\n\n'))
}
function sanitize(s){return s.replace(/[,，、#]/g,m=>m==='，'?';':'').replace(/\s*;\s*/g,'；').replace(/；+/g,'；')}
function tableRows(id){
  return [...document.querySelectorAll(`#${id} tbody tr`)].map(row=>
    [...row.querySelectorAll('input,textarea,select')].map(input=>input.value.trim())
  )
}
function copySanitizedPractice(){
  const d=data(),research=tableRows('researchTable').filter(row=>row.some(Boolean)).map(row=>sanitize(row.join('；'))).join('\n');
  copyText([
    `科研训练：${research}`,
    `实习实践：${sanitize(d.internshipExperience||'')}`,
    `社会工作：${sanitize(d.socialExperience||'')}`
  ].join('\n\n'))
}
function exportObject(){return{version:3,exportedAt:new Date().toISOString(),profile:profileData(),materials:checkData('[data-check]'),submit:checkData('[data-submit-check]')}}
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
  const profile=obj.profile||obj;restoreDynamicTables(profile);setData(profile);
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

function initTableCopyButtons(root=document){
  root.querySelectorAll('.tablewrap td > [data-key], td > [data-key]').forEach(input=>{
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

function rowsFromLegacy(profile,config){
  const indexed=new Map();
  Object.entries(profile||{}).forEach(([key,value])=>{
    const match=key.match(new RegExp(`^${config.prefix}(\\d+)(${config.fields.map(field=>field.suffix).join('|')})$`));
    if(!match)return;
    const index=Number(match[1])-1;
    if(!indexed.has(index))indexed.set(index,{});
    indexed.get(index)[match[2]]=String(value??'')
  });
  const lastFilled=Math.max(-1,...[...indexed].filter(([,row])=>Object.values(row).some(Boolean)).map(([index])=>index));
  if(lastFilled>=0)return Array.from({length:lastFilled+1},(_,index)=>indexed.get(index)||{});
  if(config.legacyTextKey&&profile?.[config.legacyTextKey])return[{Detail:String(profile[config.legacyTextKey])}];
  return[{}]
}
function renderDynamicTable(id,rows){
  const config=dynamicTableConfigs[id],table=document.getElementById(id);
  if(!config||!table)return;
  const safeRows=rows?.length?rows:[{}];
  table.querySelector('tbody').innerHTML=safeRows.map((row,index)=>`<tr>${config.fields.map(field=>
    `<td><input data-key="${config.prefix}${index+1}${field.suffix}" data-row-field="${field.suffix}" value="${escAttr(row[field.suffix]||'')}" placeholder="${escAttr(field.placeholder||'')}"></td>`
  ).join('')}<td class="row-action"><button type="button" class="icon row-remove" data-remove-row="${index}" title="删除这一项" aria-label="删除这一项">−</button></td></tr>`).join('');
  initTableCopyButtons(table)
}
function restoreDynamicTables(profile={}){
  Object.entries(dynamicTableConfigs).forEach(([id,config])=>{
    const stored=profile.dynamicTables?.[config.storageKey];
    renderDynamicTable(id,Array.isArray(stored)?stored:rowsFromLegacy(profile,config))
  })
}
function addTableRow(id){
  const config=dynamicTableConfigs[id];if(!config)return;
  const rows=dynamicData()[config.storageKey]||[];rows.push({});renderDynamicTable(id,rows);save(false);
  document.querySelector(`#${id} tbody tr:last-child input`)?.focus()
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-remove-row]');if(!button)return;
  const table=button.closest('table'),config=dynamicTableConfigs[table.id],rows=dynamicData()[config.storageKey]||[];
  const index=Number(button.dataset.removeRow),hasContent=Object.values(rows[index]||{}).some(Boolean);
  if(hasContent&&!confirm('确定删除这一项吗？'))return;
  rows.splice(index,1);renderDynamicTable(table.id,rows);save(false)
});
restoreDynamicTables();
initTableCopyButtons();
document.addEventListener('input',event=>{if(event.target.matches('[data-key]'))save(false)});
document.querySelectorAll('[data-check],[data-submit-check]').forEach(e=>e.addEventListener('change',()=>save(false)));
document.getElementById('fileInput').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{applyObject(JSON.parse(await f.text()));jsonDialog.close()}catch{toast('无法读取该文件')}
  e.target.value=''
});
document.getElementById('search').addEventListener('input',e=>{
  const q=e.target.value.trim().toLowerCase();let count=0;
  document.querySelectorAll('.field,.card,tbody tr').forEach(x=>{
    const text=((x.dataset.search||'')+' '+x.innerText+' '+[...x.querySelectorAll('input,textarea')].map(a=>a.value).join(' ')).toLowerCase();
    const ok=!q||text.includes(q);x.classList.toggle('hidden',!ok);if(ok)count++
  });
  document.querySelectorAll('main section').forEach(s=>{
    const items=[...s.querySelectorAll('.field,.card,tbody tr')];if(!items.length)return;
    s.style.display=!q||items.some(x=>!x.classList.contains('hidden'))?'':'none'
  })
});
const obs=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting)document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))
}),{rootMargin:'-20% 0px -70% 0px'});
document.querySelectorAll('main section').forEach(s=>obs.observe(s));
load();
