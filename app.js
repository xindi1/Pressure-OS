
const STORAGE_KEY='pressure_os_v1_pressures';
const THEME_KEY='pressure_os_theme';

const types={
 financial:{label:'Financial',signal:'Money',icon:'$',color:'#fef3c7',prompts:['Student loans','Cash flow','Unexpected expense','Payment deadline','Shared cost']},
 health:{label:'Health',signal:'Wellbeing',icon:'✚',color:'#dcfce7',prompts:['My health','Partner health','Parent health','Child health','Pet health']},
 interpersonal:{label:'Interpersonal',signal:'People',icon:'♡',color:'#fce7f3',prompts:['Communication strain','Family tension','Parenting pressure','Relationship climate','Misunderstanding']},
 professional:{label:'Professional',signal:'Work',icon:'▣',color:'#dbeafe',prompts:['Career uncertainty','Workload','Commercialization','Leadership pressure','Decision pressure']},
 situational:{label:'Situational',signal:'Context',icon:'◌',color:'#ede9fe',prompts:['HOA issue','Home repair','Legal matter','Travel/logistics','Unexpected event']}
};
const owners=['Me','Partner','Child','Parent','Pet','Shared','Other'];
const statuses=['Active','Monitoring','Reducing','Resolved'];

let pressures=load();
let activeDate=todayKey();
let activeType='financial';

function todayKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function parseKey(k){return new Date(`${k}T12:00:00`)}
function shiftDate(k,delta){const d=parseKey(k);d.setDate(d.getDate()+delta);return todayKey(d)}
function timeText(iso){return new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})}
function dateLabel(k){if(k===todayKey())return'Today';return parseKey(k).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})}
function fullDateLabel(k){return parseKey(k).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric',year:'numeric'})}
function greetingText(){const h=new Date().getHours();if(h<12)return'Good morning, Rob.';if(h<17)return'Good afternoon, Rob.';return'Good evening, Rob.'}
function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch{return[]}}
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(pressures))}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function uid(){return crypto&&crypto.randomUUID?crypto.randomUUID():`id-${Date.now()}-${Math.random().toString(16).slice(2)}`}
function setText(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
function currentStatus(p){return p.history?.[0]?.status||p.status||'Active'}
function activePressures(){return pressures.filter(p=>currentStatus(p)!=='Resolved')}
function byType(type){return pressures.filter(p=>p.type===type)}
function activeByType(type){return pressures.filter(p=>p.type===type&&currentStatus(p)!=='Resolved')}

function init(){
 const saved=localStorage.getItem(THEME_KEY);if(saved==='dark')document.documentElement.classList.add('dark');
 document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
 document.querySelectorAll('.pressure-form').forEach(f=>f.addEventListener('submit',handleSubmit));
 document.querySelectorAll('.date-pill').forEach(p=>{const [prev,next]=p.querySelectorAll('button');prev?.addEventListener('click',()=>changeDate(-1));next?.addEventListener('click',()=>changeDate(1));});
 document.getElementById('themeBtn')?.addEventListener('click',toggleTheme);
 document.getElementById('exportBtn')?.addEventListener('click',exportData);
 document.getElementById('importFile')?.addEventListener('change',importData);
 document.getElementById('clearBtn')?.addEventListener('click',clearAll);
 renderChips();render();
}
function switchView(id){
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
 document.getElementById(id)?.classList.add('active');
 document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
 if(types[id]) activeType=id;
 window.scrollTo({top:0,behavior:'smooth'});
}
function changeDate(delta){activeDate=shiftDate(activeDate,delta);render()}

function handleSubmit(e){
 e.preventDefault();
 const form=e.currentTarget;
 const type=form.dataset.type;
 if(!types[type])return;
 const name=form.querySelector('[name="pressure"]').value.trim();
 const why=form.querySelector('[name="why"]').value.trim();
 const doing=form.querySelector('[name="doing"]').value.trim();
 const owner=form.querySelector('[name="owner"]').value;
 const status=form.querySelector('[name="status"]').value;
 if(!name){form.querySelector('[name="pressure"]').focus();return}
 const now=new Date().toISOString();
 pressures.unshift({
   id:uid(),type,name,why,doing,owner,status,date:activeDate,createdAt:now,
   history:[{id:uid(),status,why,doing,date:activeDate,createdAt:now,note:'Created'}]
 });
 persist();form.reset();form.querySelector('[name="owner"]').value='Me';form.querySelector('[name="status"]').value='Active';render();
}

function updateStatus(id,status){
 const p=pressures.find(x=>x.id===id);if(!p)return;
 const note=prompt('Optional note for this status change')||'';
 const now=new Date().toISOString();
 p.status=status;
 p.history=p.history||[];
 p.history.unshift({id:uid(),status,note,date:activeDate,createdAt:now});
 persist();render();
}
function deletePressure(id){
 if(!confirm('Delete this pressure?'))return;
 pressures=pressures.filter(p=>p.id!==id);persist();render();
}
function resolvePressure(id){updateStatus(id,'Resolved')}

function render(){renderDates();renderDashboard();renderTypeViews();renderMetrics()}
function renderDates(){setText('todayDate',fullDateLabel(activeDate));document.querySelectorAll('.date-pill span').forEach(s=>s.textContent=dateLabel(activeDate))}
function renderMetrics(){
 Object.keys(types).forEach(t=>{
   const total=byType(t).length, active=activeByType(t).length;
   setText(`${t}Metric`,`${active} active`);
   setText(`${t}Sub`,total?`${total} total pressures`:'Not logged');
   setText(`${t}Score`,active);
 });
}
function renderDashboard(){
 setText('greeting',greetingText());
 setText('activeCount',activePressures().length);
 const wrap=document.getElementById('typeCards');
 if(wrap)wrap.innerHTML=Object.keys(types).map(k=>{
   const t=types[k], active=activeByType(k).length, total=byType(k).length;
   return `<article class="summary-row" onclick="switchView('${k}')"><div class="summary-icon" style="background:${t.color}">${t.icon}</div><div><div class="summary-title">${t.label}</div><div class="summary-meta">${active} active · ${total} total</div></div><div class="summary-score">${active}<div class="small muted">active</div></div><div class="chev">›</div></article>`;
 }).join('');
 const recent=pressures.flatMap(p=>(p.history||[]).map(h=>({...h,pressure:p.name,type:p.type,owner:p.owner}))).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,10);
 const list=document.getElementById('recentEntries');
 if(list)list.innerHTML=recent.length?recent.map(h=>`<article class="entry"><div class="entry-top"><span>${esc(h.pressure)} · ${types[h.type]?.label||''}</span><span>${h.date===todayKey()?timeText(h.createdAt):dateLabel(h.date)}</span></div><div class="entry-main">${esc(h.status)}</div>${h.note?`<p class="muted small">${esc(h.note)}</p>`:''}</article>`).join(''):'No pressures yet.';
 renderWeekBars();
}
function renderWeekBars(){
 const wrap=document.getElementById('weekBars');if(!wrap)return;
 const now=parseKey(activeDate);const days=[];
 for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);const key=todayKey(d);const count=pressures.flatMap(p=>p.history||[]).filter(h=>h.date===key).length;days.push({key,count})}
 const max=Math.max(1,...days.map(d=>d.count));
 wrap.innerHTML=days.map(day=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(6,day.count/max*78)}px"></div><span>${dateLabel(day.key).split(' ')[0]}</span></div>`).join('');
 setText('trendLabel',days.at(-1).count>=3?'Pressure visible':'Building signal');
}
function renderTypeViews(){
 document.querySelectorAll('.domain-view').forEach(view=>{
   const type=view.dataset.type,target=view.querySelector('.domain-entries');if(!target)return;
   const items=byType(type);
   target.innerHTML=items.length?items.map(pressureHtml).join(''):`<div class="empty-card muted">No ${types[type].label.toLowerCase()} pressures yet.</div>`;
 });
}
function pressureHtml(p){
 const status=currentStatus(p);
 const hist=(p.history||[]).slice(0,4).map(h=>`<div class="history-line"><span>${esc(h.status)}</span><small>${h.date===todayKey()?timeText(h.createdAt):dateLabel(h.date)}</small></div>`).join('');
 return `<article class="entry pressure-card ${status==='Resolved'?'resolved':''}"><div class="entry-top"><span>${esc(p.owner)} · ${types[p.type].label}</span><span>${status}</span></div><div class="entry-main">${esc(p.name)}</div>${p.why?`<p class="muted small"><strong>Why:</strong> ${esc(p.why)}</p>`:''}${p.doing?`<p class="muted small"><strong>Doing:</strong> ${esc(p.doing)}</p>`:''}<div class="status-row">${statuses.map(s=>`<button type="button" onclick="updateStatus('${p.id}','${s}')" class="${s===status?'active':''}">${s}</button>`).join('')}</div>${hist?`<div class="history">${hist}</div>`:''}<div class="entry-actions"><button class="delete" type="button" onclick="deletePressure('${p.id}')">Delete</button></div></article>`;
}
function renderChips(){
 document.querySelectorAll('.chips').forEach(w=>{
   const type=w.dataset.target;if(!types[type])return;
   w.innerHTML=types[type].prompts.map(p=>`<button type="button">${p}</button>`).join('');
   w.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>fillPrompt(type,b.textContent)));
 });
}
function fillPrompt(type,text){
 const view=document.querySelector(`.domain-view[data-type="${type}"]`);const input=view?.querySelector('[name="pressure"]');if(!input)return;
 input.value=input.value?`${input.value}; ${text}`:text;input.focus();
}
function toggleTheme(){document.documentElement.classList.toggle('dark');localStorage.setItem(THEME_KEY,document.documentElement.classList.contains('dark')?'dark':'light')}
function exportData(){const blob=new Blob([JSON.stringify({app:'Pressure OS',version:1,exportedAt:new Date().toISOString(),pressures},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`pressure-os-export-${todayKey()}.json`;a.click();URL.revokeObjectURL(a.href)}
function importData(ev){const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(Array.isArray(data.pressures)){pressures=[...data.pressures,...pressures];persist();render();alert('Import complete.')}else alert('Import file did not contain pressures.')}catch{alert('Could not import JSON.')}};r.readAsText(f);ev.target.value=''}
function clearAll(){if(confirm('Clear all Pressure OS data on this device?')){pressures=[];persist();render()}}
window.updateStatus=updateStatus;window.deletePressure=deletePressure;window.switchView=switchView;init();
