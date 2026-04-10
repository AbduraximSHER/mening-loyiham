// VOCABULARY FEATURES v3.0 — Daily Practice | Smart Toolbar | Auto-save
(function(){
'use strict';
const S={get(k){try{return JSON.parse(localStorage.getItem('v_'+k))}catch(e){return null}},set(k,v){try{localStorage.setItem('v_'+k,JSON.stringify(v))}catch(e){}}};

// AUTO-SAVE
function autoSave(unitId,qIdx,isCorrect){
const p=S.get('progress')||{};
if(!p[unitId])p[unitId]={correct:0,wrong:0,answered:0,wrongWords:[],ts:Date.now()};
const u=p[unitId];u.answered++;u.ts=Date.now();
if(isCorrect)u.correct++;else{u.wrong++;
const unit=vocabularyUnits.find(x=>x.id===unitId);
if(unit&&unit.exercises[qIdx]){const ex=unit.exercises[qIdx];
const word=ex.type==='fill'?(Array.isArray(ex.answer)?ex.answer[0]:ex.answer):(ex.options?ex.options[ex.correctAnswer]:'');
if(word&&!u.wrongWords.includes(word))u.wrongWords.push(word);}}
S.set('progress',p);
const today=new Date().toISOString().split('T')[0];
const streak=S.get('streak')||{current:0,best:0,lastDate:''};
if(streak.lastDate!==today){const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0];
streak.current=(streak.lastDate===yesterday)?streak.current+1:1;
if(streak.current>streak.best)streak.best=streak.current;streak.lastDate=today;S.set('streak',streak);}
}

// HOOK exercise answers
const _sel=window.selectOption;
window.selectOption=function(q,o){_sel(q,o);const u=vocabularyUnits[currentUnitIndex];autoSave(u.id,q,o===u.exercises[q].correctAnswer)};
const _fill=window.checkFill;
if(_fill){window.checkFill=function(q){const u=vocabularyUnits[currentUnitIndex];const ex=u.exercises[q];
const inp=document.getElementById('fill-'+q);const v=inp?inp.value.trim().toLowerCase():'';
const ans=Array.isArray(ex.answer)?ex.answer.map(a=>a.toLowerCase()):[ex.answer.toLowerCase()];
_fill(q);autoSave(u.id,q,ans.some(a=>v===a))};}

// MODAL
function modal(t,h){let m=document.getElementById('fm');
if(!m){m=document.createElement('div');m.id='fm';
m.innerHTML='<div onclick="closeModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;backdrop-filter:blur(4px)"></div><div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:20px;max-width:440px;width:94%;max-height:85vh;overflow-y:auto;z-index:9999;box-shadow:0 24px 48px rgba(0,0,0,0.2)"><div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #E5E7EB;position:sticky;top:0;background:#fff;border-radius:20px 20px 0 0;z-index:1"><h3 id="fm-t" style="margin:0;font-size:1rem;color:#1F2937"></h3><button onclick="closeModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#9CA3AF;padding:0">×</button></div><div id="fm-c" style="padding:16px 18px"></div></div>';
document.body.appendChild(m);}
document.getElementById('fm-t').textContent=t;document.getElementById('fm-c').innerHTML=h;
m.style.display='block';document.body.style.overflow='hidden';}
window.modal=modal;window.showFeatureModal=modal;
window.closeModal=window.closeFeatureModal=function(){const m=document.getElementById('fm');if(m)m.style.display='none';document.body.style.overflow='';};

// SPEAK
function speak(t){if(!('speechSynthesis' in window))return;speechSynthesis.cancel();
const u=new SpeechSynthesisUtterance(t);u.lang='en-GB';u.rate=0.82;u.pitch=1.05;
const v=speechSynthesis.getVoices();const e=v.find(x=>x.lang==='en-GB')||v.find(x=>x.lang.startsWith('en'));
if(e)u.voice=e;speechSynthesis.speak(u);}
window.speakWord=speak;

// DAILY PRACTICE
function dailyPractice(){
const p=S.get('progress')||{};const target=S.get('dailyTarget')||10;let queue=[];
Object.entries(p).forEach(([uid,d])=>{if(d.wrongWords)d.wrongWords.forEach(w=>{
const unit=vocabularyUnits.find(u=>u.id===parseInt(uid));if(unit){
const ex=unit.exercises.find(e=>{const a=e.type==='fill'?(Array.isArray(e.answer)?e.answer[0]:e.answer):(e.options?e.options[e.correctAnswer]:'');return a===w;});
if(ex)queue.push({ex,uid:parseInt(uid),src:'review',w});}});});
for(const u of vocabularyUnits){const up=p[u.id];if(!up||up.answered<u.exercises.length){
const rem=u.exercises.filter(e=>(!e.type||e.type==='mcq'||e.type==='fill')&&(e.options||e.answer));
rem.slice(0,6).forEach(ex=>queue.push({ex,uid:u.id,src:'new'}));break;}}
const comp=vocabularyUnits.filter(u=>p[u.id]&&p[u.id].answered>=5);
for(let i=0;i<3&&comp.length>0;i++){const ru=comp[Math.floor(Math.random()*comp.length)];
const mcqs=ru.exercises.filter(e=>(!e.type||e.type==='mcq')&&e.options);
if(mcqs.length)queue.push({ex:mcqs[Math.floor(Math.random()*mcqs.length)],uid:ru.id,src:'random'});}
for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
queue=queue.slice(0,target);
if(queue.length===0){modal('Kunlik mashq','<div style="text-align:center;padding:2rem"><div style="font-size:3rem">📚</div><h3>Biror unitni ochib mashqlarni yeching!</h3></div>');return;}
let idx=0,score=0,answered=[];
function renderQ(){
if(idx>=queue.length){const pct=Math.round(score/queue.length*100);const streak=S.get('streak')||{current:0};
modal('Tugadi!','<div style="text-align:center;padding:1.5rem"><div style="font-size:4rem">'+(pct>=80?'🎉':pct>=50?'👍':'💪')+'</div><h2>'+score+'/'+queue.length+'</h2><p style="color:#6B7280">Aniqlik: '+pct+'%</p><div style="background:#EEF2FF;padding:12px 20px;border-radius:12px;display:inline-block;margin:1rem"><span style="font-size:1.4rem;font-weight:800;color:#4338CA">🔥 '+streak.current+'</span> <span style="font-size:0.7rem;color:#6366F1">kun</span></div><br><button onclick="closeModal()" style="padding:12px 32px;background:#6366F1;color:#fff;border:none;border-radius:12px;font-size:1rem;cursor:pointer;font-weight:600">Tayyor</button></div>');return;}
const item=queue[idx];const ex=item.ex;const srcLabel=item.src==='review'?'🔄 Takrorlash':item.src==='new'?'🆕 Yangi':'🎲 Tasodifiy';
const hasOpts=ex.options&&ex.options.length>0;
let qHTML='';
if(hasOpts){qHTML=ex.options.map((o,i)=>'<button onclick="dAns('+i+','+ex.correctAnswer+')" id="dq-'+i+'" style="display:block;width:100%;padding:14px 16px;border:2px solid #E5E7EB;border-radius:12px;background:#FAFBFC;font-size:0.95rem;cursor:pointer;text-align:left;font-family:inherit;margin-bottom:8px;transition:all 0.2s"><span style="font-weight:700;color:#6366F1;margin-right:8px">'+String.fromCharCode(65+i)+'</span>'+o+'</button>').join('');}
else if(ex.type==='fill'){qHTML='<input type="text" id="df" placeholder="Javob..." style="width:100%;padding:12px;border:2px solid #E5E7EB;border-radius:10px;font-size:1rem;font-family:inherit;margin-bottom:8px" onkeypress="if(event.key===\'Enter\')dFill()"><button onclick="dFill()" style="padding:10px 20px;background:#6366F1;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600">Tekshirish</button>';}
let qText=(ex.question||'').replace(/^\d+\.\d+(\.\d+)?\s*/,'').replace(/<[^>]+>/g,'');
modal('Kunlik mashq','<div style="padding:0.5rem"><div style="display:flex;gap:3px;margin-bottom:1rem">'+queue.map((_,i)=>'<div style="flex:1;height:4px;border-radius:2px;background:'+(i<idx?(answered[i]?'#10B981':'#EF4444'):i===idx?'#6366F1':'#E5E7EB')+'"></div>').join('')+'</div><span style="font-size:0.7rem;background:'+(item.src==='review'?'#FEF3C7':item.src==='new'?'#DBEAFE':'#F3E8FF')+';padding:3px 8px;border-radius:10px;color:#374151">'+srcLabel+' · Unit '+item.uid+'</span>'+(ex.type==='listen'&&ex.audioWord?'<div style="text-align:center;margin:1rem 0"><button onclick="speakWord(\''+ex.audioWord.replace(/'/g,"\\'")+'\')" style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;font-size:1.6rem;cursor:pointer;box-shadow:0 4px 16px rgba(59,130,246,0.3)">🔊</button></div>':'')+'<p style="font-size:1.05rem;font-weight:600;color:#1F2937;margin:1rem 0;line-height:1.5">'+qText+'</p><div id="do">'+qHTML+'</div><div id="dfb" style="display:none;margin-top:1rem;padding:12px;border-radius:12px;font-size:0.9rem"></div></div>');}
window.dAns=function(s,c){const ok=s===c;if(ok)score++;answered[idx]=ok;
for(let i=0;i<4;i++){const b=document.getElementById('dq-'+i);if(!b)continue;b.style.pointerEvents='none';
if(i===c){b.style.background='#ECFDF5';b.style.borderColor='#10B981';}
if(i===s&&!ok){b.style.background='#FEF2F2';b.style.borderColor='#EF4444';}}
const fb=document.getElementById('dfb');const ex=queue[idx].ex;
if(fb){fb.style.display='block';fb.style.background=ok?'#ECFDF5':'#FEF2F2';
fb.innerHTML=(ok?'✅ To\'g\'ri!':'❌ Javob: <b>'+ex.options[c]+'</b>')+(ex.hint?'<br><span style="color:#6B7280;font-size:0.85rem">'+ex.hint+'</span>':'');}
autoSave(queue[idx].uid,0,ok);setTimeout(()=>{idx++;renderQ()},ok?1200:2500);};
window.dFill=function(){const inp=document.getElementById('df');if(!inp)return;const ex=queue[idx].ex;
const v=inp.value.trim().toLowerCase();const ans=Array.isArray(ex.answer)?ex.answer.map(a=>a.toLowerCase()):[ex.answer.toLowerCase()];
const ok=ans.some(a=>v===a);if(ok)score++;answered[idx]=ok;inp.disabled=true;
inp.style.borderColor=ok?'#10B981':'#EF4444';inp.style.background=ok?'#ECFDF5':'#FEF2F2';
const fb=document.getElementById('dfb');if(fb){fb.style.display='block';fb.style.background=ok?'#ECFDF5':'#FEF2F2';
fb.innerHTML=ok?'✅ To\'g\'ri!':'❌ Javob: <b>'+(Array.isArray(ex.answer)?ex.answer[0]:ex.answer)+'</b>';}
autoSave(queue[idx].uid,0,ok);setTimeout(()=>{idx++;renderQ()},ok?1200:2500);};
renderQ();}
window.dailyPractice=dailyPractice;

// SEARCH
window.openSearch=function(){modal('Qidirish','<div><input type="text" id="si" placeholder="So\'z kiriting..." style="width:100%;padding:12px 16px;border:2px solid #E5E7EB;border-radius:12px;font-size:15px;font-family:inherit;outline:none" oninput="doSrch(this.value)" autofocus><div id="sr" style="margin-top:1rem;max-height:55vh;overflow-y:auto"></div></div>');setTimeout(()=>document.getElementById('si')?.focus(),100)};
window.doSrch=function(q){const r=document.getElementById('sr');if(!q||q.length<2){r.innerHTML='<p style="color:#9CA3AF;text-align:center;padding:1rem">Kamida 2 belgi</p>';return;}
const ql=q.toLowerCase();let f=[];const seen=new Set();
vocabularyUnits.forEach(u=>{(u.theory.match(/<strong>([^<]+)<\/strong>(?:\s*<em>\(([^)]+)\)<\/em>)?/g)||[]).forEach(m=>{
const w=m.match(/<strong>([^<]+)<\/strong>/)?.[1]||'';const uz=m.match(/<em>\(([^)]+)\)<\/em>/)?.[1]||'';
if((w.toLowerCase().includes(ql)||uz.toLowerCase().includes(ql))&&!seen.has(w.toLowerCase())){seen.add(w.toLowerCase());f.push({uid:u.id,w,uz})}});});
r.innerHTML=f.length===0?'<p style="color:#9CA3AF;text-align:center">Topilmadi</p>':f.slice(0,25).map(x=>'<div onclick="closeModal();loadUnit('+x.uid+')" style="padding:10px;border-bottom:1px solid #F3F4F6;cursor:pointer"><div style="display:flex;justify-content:space-between"><strong onclick="event.stopPropagation();speakWord(\''+x.w.replace(/'/g,"\\'")+'\')" style="cursor:pointer">'+x.w+' 🔊</strong><span style="font-size:0.7rem;background:#EEF2FF;color:#4338CA;padding:2px 6px;border-radius:10px">U'+x.uid+'</span></div>'+(x.uz?'<p style="color:#6B7280;font-size:0.85rem;margin:2px 0 0">'+x.uz+'</p>':'')+'</div>').join('')};

// DASHBOARD
window.openDashboard=function(){const p=S.get('progress')||{};let tc=0,tw=0,ta=0;
Object.values(p).forEach(d=>{tc+=d.correct;tw+=d.wrong;ta+=d.answered});
const total=vocabularyUnits.reduce((s,u)=>s+u.exercises.length,0);const pct=Math.round(ta/total*100);const acc=ta>0?Math.round(tc/ta*100):0;const streak=S.get('streak')||{current:0};
modal('Progress','<div style="padding:0.25rem"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:1rem"><div style="background:#EEF2FF;border-radius:12px;padding:14px;text-align:center"><div style="font-size:1.6rem;font-weight:800;color:#4338CA">'+pct+'%</div><div style="font-size:0.7rem;color:#6366F1">Progress</div></div><div style="background:#ECFDF5;border-radius:12px;padding:14px;text-align:center"><div style="font-size:1.6rem;font-weight:800;color:#059669">'+acc+'%</div><div style="font-size:0.7rem;color:#10B981">Aniqlik</div></div><div style="background:#FEF3C7;border-radius:12px;padding:14px;text-align:center"><div style="font-size:1.6rem;font-weight:800;color:#D97706">'+ta+'/'+total+'</div><div style="font-size:0.7rem;color:#F59E0B">Yechilgan</div></div><div style="background:#FEE2E2;border-radius:12px;padding:14px;text-align:center"><div style="font-size:1.6rem;font-weight:800;color:#DC2626">🔥'+streak.current+'</div><div style="font-size:0.7rem;color:#EF4444">Streak</div></div></div><h4 style="font-size:0.9rem;color:#374151;margin-bottom:8px">Unitlar:</h4><div style="max-height:35vh;overflow-y:auto">'+vocabularyUnits.map(u=>{const up=p[u.id]||{answered:0};const upct=Math.min(100,Math.round(up.answered/u.exercises.length*100));return '<div onclick="closeModal();loadUnit('+u.id+')" style="display:flex;align-items:center;gap:6px;padding:5px 0;cursor:pointer;border-bottom:1px solid #F9FAFB"><span style="font-size:0.7rem;color:#9CA3AF;width:18px">'+u.id+'</span><div style="flex:1;height:5px;background:#E5E7EB;border-radius:3px;overflow:hidden"><div style="height:100%;background:'+(upct>=80?'#10B981':upct>0?'#F59E0B':'#E5E7EB')+';width:'+upct+'%"></div></div><span style="font-size:0.65rem;color:#9CA3AF;width:28px;text-align:right">'+upct+'%</span></div>'}).join('')+'</div></div>')};

// MORE MENU
window.openMoreMenu=function(){const streak=S.get('streak')||{current:0};const p=S.get('progress')||{};
const wc=Object.values(p).reduce((s,d)=>s+(d.wrongWords?d.wrongWords.length:0),0);
const items=[{i:'🔄',l:'Takrorlash',d:wc+' so\'z',f:'openSpacedRep()',bg:'#ECFDF5',c:'#059669'},{i:'🃏',l:'Flashcards',d:'Kartochkalar',f:'openFlashcards()',bg:'#EEF2FF',c:'#4338CA'},{i:'📖',l:'So\'zlar',d:'Barcha so\'zlar',f:'openWordList()',bg:'#F0F9FF',c:'#0369A1'},{i:'🧪',l:'Daraja testi',d:'Test',f:'openPlacementTest()',bg:'#F5F3FF',c:'#7C3AED'},{i:'🏆',l:'Reyting',d:streak.current+' kun',f:'openLeaderboard()',bg:'#FFF7ED',c:'#C2410C'},{i:'❌',l:'Xatolar',d:'Xato so\'zlar',f:'openErrorStats()',bg:'#FEF2F2',c:'#DC2626'},{i:'📄',l:'PDF',d:'Chop etish',f:'exportUnitPDF()',bg:'#F3F4F6',c:'#4B5563'},{i:'📤',l:'Ulashish',d:'Natija',f:'shareResult()',bg:'#FCE7F3',c:'#DB2777'}];
modal("Ko'proq",'<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0.5rem">'+items.map(b=>'<button onclick="closeModal();'+b.f+'" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 8px;background:'+b.bg+';border:none;border-radius:14px;cursor:pointer;transition:transform 0.15s" ontouchstart="this.style.transform=\'scale(0.95)\'" ontouchend="this.style.transform=\'\'"><span style="font-size:1.4rem">'+b.i+'</span><span style="font-weight:700;font-size:0.8rem;color:'+b.c+'">'+b.l+'</span><span style="font-size:0.65rem;color:#9CA3AF">'+b.d+'</span></button>').join('')+'</div>')};

// SPACED REP
window.openSpacedRep=window.openSpacedRepetition=function(){const p=S.get('progress')||{};let q=[];
Object.entries(p).forEach(([uid,d])=>{if(d.wrongWords)d.wrongWords.forEach(w=>{const u=vocabularyUnits.find(x=>x.id===parseInt(uid));if(u)q.push({uid:parseInt(uid),title:u.title,w})})});
if(!q.length){modal('Takrorlash','<div style="text-align:center;padding:2rem"><div style="font-size:3rem">🎉</div><h3>Takrorlash kerak emas!</h3></div>');return;}
for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]];}
let ci=0;function renderSR(){const it=q[ci];
modal('Takrorlash ('+(ci+1)+'/'+q.length+')','<div style="text-align:center;padding:1rem"><p style="color:#6B7280;font-size:0.8rem">Unit '+it.uid+': '+it.title+'</p><div onclick="document.getElementById(\'sra\').style.display=\'block\'" style="background:linear-gradient(135deg,#667EEA,#764BA2);border-radius:20px;padding:2.5rem;margin:1rem 0;cursor:pointer;box-shadow:0 8px 24px rgba(102,126,234,0.3)"><h2 style="color:#fff;margin:0;font-size:1.5rem">'+it.w+'</h2><button onclick="event.stopPropagation();speakWord(\''+it.w.replace(/'/g,"\\'")+'\')" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 16px;border-radius:20px;margin-top:8px;cursor:pointer">🔊</button><div id="sra" style="display:none;margin-top:1rem;color:#E0E7FF;font-size:1rem">Bosib javobni ko\'ring</div></div><div style="display:flex;gap:8px;justify-content:center"><button onclick="srM('+it.uid+',\''+it.w.replace(/'/g,"\\'")+'\',1)" style="padding:10px 24px;background:#10B981;color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer">✅ Bildim</button><button onclick="srM('+it.uid+',\''+it.w.replace(/'/g,"\\'")+'\',0)" style="padding:10px 24px;background:#F59E0B;color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer">🔄 Keyingi</button></div></div>');}
window.srM=function(uid,w,known){if(known){const p=S.get('progress')||{};if(p[uid]&&p[uid].wrongWords){p[uid].wrongWords=p[uid].wrongWords.filter(x=>x!==w);S.set('progress',p);}q.splice(ci,1);if(!q.length){modal('Takrorlash','<div style="text-align:center;padding:2rem"><div style="font-size:3rem">🎉</div><h3>Hammasi!</h3></div>');return;}if(ci>=q.length)ci=0;}else{ci=(ci+1)%q.length;}renderSR();};
window.srRemoveWord=function(uid,w){const p=S.get('progress')||{};if(p[uid]&&p[uid].wrongWords){p[uid].wrongWords=p[uid].wrongWords.filter(x=>x!==w);S.set('progress',p);}};
renderSR();};

// FLASHCARDS
window.openFlashcards=function(uid){uid=uid||(typeof currentUnitIndex!=='undefined'?vocabularyUnits[currentUnitIndex].id:1);
const unit=vocabularyUnits.find(u=>u.id===uid);if(!unit)return;const cards=[];
(unit.theory.match(/<strong>([^<]+)<\/strong>\s*<em>\(([^)]+)\)<\/em>/g)||[]).forEach(m=>{
const w=m.match(/<strong>([^<]+)<\/strong>/)?.[1];const uz=m.match(/<em>\(([^)]+)\)<\/em>/)?.[1];
if(w&&uz&&w.length<40)cards.push({en:w,uz})});
if(!cards.length){modal('Flashcards','<div style="text-align:center;padding:2rem"><p>Kartochka yo\'q</p></div>');return;}
for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
let ci=0;function renderFC(){const c=cards[ci];
modal('Flashcards U'+uid+' ('+(ci+1)+'/'+cards.length+')','<div style="text-align:center;padding:0.5rem"><div onclick="document.getElementById(\'fcb\').style.display=\'block\'" style="background:linear-gradient(135deg,#6366F1,#8B5CF6);border-radius:20px;padding:2.5rem;cursor:pointer;box-shadow:0 8px 24px rgba(99,102,241,0.3);min-height:100px"><h2 style="color:#fff;margin:0">'+c.en+'</h2><div id="fcb" style="display:none;color:#E0E7FF;margin-top:1rem;font-size:1.1rem">'+c.uz+'</div></div><div style="display:flex;gap:8px;justify-content:center;margin-top:1rem"><button onclick="fcN(-1)" style="padding:10px 20px;background:#E5E7EB;border:none;border-radius:10px;cursor:pointer" '+(ci===0?'disabled style="opacity:0.3;padding:10px 20px;background:#E5E7EB;border:none;border-radius:10px"':'')+'>⬅️</button><button onclick="speakWord(\''+c.en.replace(/'/g,"\\'")+'\')" style="padding:10px 20px;background:#EEF2FF;border:none;border-radius:10px;cursor:pointer">🔊</button><button onclick="fcN(1)" style="padding:10px 20px;background:#E5E7EB;border:none;border-radius:10px;cursor:pointer" '+(ci===cards.length-1?'disabled style="opacity:0.3;padding:10px 20px;background:#E5E7EB;border:none;border-radius:10px"':'')+'>➡️</button></div></div>');}
window.fcN=function(d){ci=Math.max(0,Math.min(cards.length-1,ci+d));renderFC()};renderFC()};

// WORD LIST
window.openWordList=function(){const uid=(typeof currentUnitIndex!=='undefined')?vocabularyUnits[currentUnitIndex].id:1;
const unit=vocabularyUnits.find(u=>u.id===uid);if(!unit)return;const words=[];const seen=new Set();
(unit.theory.match(/<strong>([^<]+)<\/strong>(?:\s*<em>\(([^)]+)\)<\/em>)?/g)||[]).forEach(m=>{
const w=m.match(/<strong>([^<]+)<\/strong>/)?.[1]||'';const uz=m.match(/<em>\(([^)]+)\)<\/em>/)?.[1]||'';
if(w.length>1&&w.length<40&&!seen.has(w.toLowerCase())){seen.add(w.toLowerCase());words.push({en:w,uz})}});
modal('So\'zlar U'+uid+' ('+words.length+')','<div style="max-height:60vh;overflow-y:auto">'+words.map(w=>'<div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #F3F4F6"><button onclick="speakWord(\''+w.en.replace(/'/g,"\\'")+'\')" style="background:none;border:none;cursor:pointer;font-size:1rem">🔊</button><div style="flex:1"><strong>'+w.en+'</strong>'+(w.uz?' <span style="color:#6B7280;font-size:0.85rem">— '+w.uz+'</span>':'')+'</div></div>').join('')+'</div>')};

// PLACEMENT TEST
window.openPlacementTest=function(){const ids=[2,5,8,11,14,17,20,23,25,3,6,9,12,15,18];let q=[],ci=0,score=0;
ids.forEach(uid=>{const u=vocabularyUnits.find(x=>x.id===uid);if(u){const mcqs=u.exercises.filter(e=>(!e.type||e.type==='mcq')&&e.options);if(mcqs.length)q.push({...mcqs[Math.floor(Math.random()*mcqs.length)],unitId:uid})}});
function renderPT(){if(ci>=q.length){const pct=Math.round(score/q.length*100);const su=pct>=90?20:pct>=70?14:pct>=50?8:pct>=30?4:2;
const lv=pct>=90?'Advanced':pct>=70?'Upper-Int':pct>=50?'Intermediate':pct>=30?'Pre-Int':'Beginner';
modal('Natija','<div style="text-align:center;padding:1.5rem"><div style="font-size:3rem">'+(pct>=70?'🎉':'📚')+'</div><h2>'+score+'/'+q.length+'</h2><p style="color:#6B7280">Daraja: <b style="color:#4338CA">'+lv+'</b></p><button onclick="closeModal();loadUnit('+su+')" style="margin-top:1rem;padding:12px 24px;background:#6366F1;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600">Unit '+su+' →</button></div>');return;}
const ex=q[ci];modal('Test ('+(ci+1)+'/'+q.length+')','<div style="padding:0.5rem"><div style="height:4px;background:#E5E7EB;border-radius:2px;margin-bottom:1rem"><div style="height:100%;background:#6366F1;border-radius:2px;width:'+Math.round(ci/q.length*100)+'%"></div></div><p style="font-weight:600;margin-bottom:1rem">'+ex.question.replace(/^\d+\.\d+\s*/,'')+'</p>'+ex.options.map((o,i)=>'<button onclick="ptA('+i+','+ex.correctAnswer+')" style="display:block;width:100%;padding:12px;border:2px solid #E5E7EB;border-radius:10px;background:#FAFBFC;margin-bottom:8px;cursor:pointer;text-align:left;font-family:inherit">'+String.fromCharCode(65+i)+') '+o+'</button>').join('')+'</div>');}
window.ptA=function(s,c){if(s===c)score++;ci++;renderPT()};renderPT()};

// LEADERBOARD
window.openLeaderboard=function(){const p=S.get('progress')||{};let tc=0,ta=0;Object.values(p).forEach(d=>{tc+=d.correct;ta+=d.answered});
const acc=ta>0?Math.round(tc/ta*100):0;const streak=S.get('streak')||{current:0,best:0};
const uc=Object.values(p).filter(d=>d.answered>=5).length;
let rank='Boshlang\'ich',emoji='🌱';if(ta>=500){rank='Professor';emoji='🎓';}else if(ta>=300){rank='Master';emoji='👑';}else if(ta>=150){rank='Expert';emoji='⭐';}else if(ta>=50){rank='O\'rganuvchi';emoji='📚';}
modal('Reyting','<div style="text-align:center;padding:1rem"><div style="font-size:3rem">'+emoji+'</div><h2>'+rank+'</h2><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:1rem 0"><div style="background:#F3F4F6;padding:12px;border-radius:10px"><b style="font-size:1.3rem;color:#4338CA">'+ta+'</b><br><span style="font-size:0.7rem;color:#6B7280">Yechilgan</span></div><div style="background:#F3F4F6;padding:12px;border-radius:10px"><b style="font-size:1.3rem;color:#059669">'+acc+'%</b><br><span style="font-size:0.7rem;color:#6B7280">Aniqlik</span></div><div style="background:#F3F4F6;padding:12px;border-radius:10px"><b style="font-size:1.3rem;color:#D97706">🔥'+streak.current+'</b><br><span style="font-size:0.7rem;color:#6B7280">Streak</span></div><div style="background:#F3F4F6;padding:12px;border-radius:10px"><b style="font-size:1.3rem;color:#DC2626">'+uc+'/60</b><br><span style="font-size:0.7rem;color:#6B7280">Unit</span></div></div></div>')};

// ERROR STATS
window.openErrorStats=function(){const p=S.get('progress')||{};let all=[];
Object.entries(p).forEach(([uid,d])=>{if(d.wrongWords)d.wrongWords.forEach(w=>all.push({uid:parseInt(uid),w}))});
if(!all.length){modal('Xatolar','<div style="text-align:center;padding:2rem">✨ Xato yo\'q!</div>');return;}
modal('Xatolar ('+all.length+')','<div style="max-height:55vh;overflow-y:auto">'+all.map(a=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #F3F4F6"><span onclick="speakWord(\''+a.w.replace(/'/g,"\\'")+'\')" style="cursor:pointer"><b>'+a.w+'</b> 🔊 <span style="font-size:0.7rem;color:#9CA3AF">U'+a.uid+'</span></span><button onclick="srRemoveWord('+a.uid+',\''+a.w.replace(/'/g,"\\'")+'\');this.closest(\'div\').remove()" style="background:#ECFDF5;border:none;color:#059669;padding:3px 8px;border-radius:6px;cursor:pointer;font-size:0.75rem">✅</button></div>').join('')+'</div>')};

// PDF EXPORT
window.exportUnitPDF=function(uid){uid=uid||(typeof currentUnitIndex!=='undefined'?vocabularyUnits[currentUnitIndex].id:1);
const u=vocabularyUnits.find(x=>x.id===uid);if(!u)return;const w=window.open('','_blank');
w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Unit '+u.id+': '+u.title+'</title><style>body{font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:2rem;color:#1a1a1a;line-height:1.7}h1{border-bottom:2px solid #333;padding-bottom:0.5rem}strong{color:#1a3a6a}em{color:#666}.ex{background:#f5f5f5;padding:1rem;margin:0.5rem 0;border-radius:8px;border-left:4px solid #4338CA}.ans{color:#059669;font-weight:bold}@media print{.np{display:none}}</style></head><body><h1>Unit '+u.id+': '+u.title+'</h1>'+u.theory.replace(/<img[^>]+>/g,'').replace(/class="[^"]+"/g,'')+'<h2>Exercises</h2>'+u.exercises.map((e,i)=>{let a='';if(e.options)a=e.options[e.correctAnswer];else if(e.answer)a=Array.isArray(e.answer)?e.answer[0]:e.answer;else if(e.pairs)a=e.pairs.map(p=>p.left+'→'+p.right).join('; ');return '<div class="ex"><b>'+(i+1)+'.</b> '+e.question+'<br><span class="ans">'+a+'</span></div>'}).join('')+'<div class="np" style="text-align:center;margin-top:2rem"><button onclick="window.print()" style="padding:12px 24px;background:#4338CA;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨️ Chop etish</button></div></body></html>');w.document.close()};

// SHARE
window.shareResult=function(){const p=S.get('progress')||{};let tc=0,ta=0;Object.values(p).forEach(d=>{tc+=d.correct;ta+=d.answered});
const text='🎓 English Vocabulary: '+ta+' mashq, '+(ta>0?Math.round(tc/ta*100):0)+'% aniqlik!\nhttps://abduraximsher.github.io/Grammar/advanced-vocabulary.html';
if(navigator.share)navigator.share({title:'Natijam',text}).catch(()=>{});
else navigator.clipboard.writeText(text).then(()=>alert('Nusxalandi!')).catch(()=>{})};

// TOOLBAR
function createToolbar(){const bar=document.createElement('div');bar.id='smart-bar';
bar.innerHTML='<style>#smart-bar{position:fixed;bottom:0;left:0;right:0;z-index:9000;background:#fff;border-top:1px solid #E5E7EB;padding:8px 0 max(8px,env(safe-area-inset-bottom));display:flex;justify-content:space-around;box-shadow:0 -2px 12px rgba(0,0,0,0.06)}.sb-btn{display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;cursor:pointer;padding:6px 16px;border-radius:10px;transition:all 0.15s;font-family:inherit}.sb-btn:active{transform:scale(0.92)}.sb-btn .sb-i{font-size:1.4rem}.sb-btn .sb-l{font-size:0.65rem;color:#6B7280;font-weight:600}.sb-btn.pri .sb-i{background:linear-gradient(135deg,#6366F1,#8B5CF6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.sb-btn.pri .sb-l{color:#6366F1}@media(min-width:768px){#smart-bar{left:auto;right:20px;bottom:20px;width:auto;border-radius:16px;border:1px solid #E5E7EB;padding:8px 4px;flex-direction:column;gap:4px}}</style><button class="sb-btn pri" onclick="dailyPractice()"><span class="sb-i">⚡</span><span class="sb-l">Mashq</span></button><button class="sb-btn" onclick="openSearch()"><span class="sb-i">🔍</span><span class="sb-l">Qidirish</span></button><button class="sb-btn" onclick="openDashboard()"><span class="sb-i">📊</span><span class="sb-l">Progress</span></button><button class="sb-btn" onclick="openMoreMenu()"><span class="sb-i">☰</span><span class="sb-l">Ko\'proq</span></button>';
document.body.appendChild(bar);document.body.style.paddingBottom='70px';
const old=document.getElementById('vocab-toolbar');if(old)old.remove();}

// MOBILE CSS
function addMobileCSS(){const s=document.createElement('style');
s.textContent='@media(max-width:480px){.exercise-card{padding:16px!important;margin-bottom:10px!important}.option-btn{padding:12px 14px!important;font-size:14px!important}.question-text{font-size:14px!important}.fill-input{font-size:16px!important}.listen-play-btn{width:64px!important;height:64px!important}}';
document.head.appendChild(s);}

// AUDIO ON THEORY
function addAudio(){document.querySelectorAll('#theory-content strong,.theory-text-column strong').forEach(el=>{
if(el.dataset.a)return;el.dataset.a='1';el.style.cursor='pointer';el.title='Bosing — talaffuz';
el.addEventListener('click',function(e){e.stopPropagation();speak(this.textContent.trim());this.style.color='#4338CA';setTimeout(()=>this.style.color='',600)})});}
window.addAudioToTheory=addAudio;

// INIT
function init(){createToolbar();addMobileCSS();
if('speechSynthesis' in window){speechSynthesis.getVoices();speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();}
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
const _r=window.renderUnit;if(_r){window.renderUnit=function(i){_r(i);setTimeout(addAudio,300)}};}



// ═══ #19 URL ROUTING ═══
function initRouting(){
    function handleHash(){
        const hash=window.location.hash;
        if(hash.startsWith('#unit-')){
            const uid=parseInt(hash.replace('#unit-',''));
            if(uid>=1&&uid<=60&&typeof loadUnit==='function')loadUnit(uid);
        }
    }
    window.addEventListener('hashchange',handleHash);
    if(window.location.hash.startsWith('#unit-'))setTimeout(handleHash,500);

    // Override loadUnit to update URL
    const _load=window.loadUnit;
    if(_load){window.loadUnit=function(id){
        _load(id);
        window.location.hash='unit-'+id;
        document.title='Unit '+id+' — English Vocabulary';
    };}
}

// ═══ #9 REAL SRS WITH TIMESTAMPS ═══
function getSRSQueue(){
    const p=S.get('progress')||{};
    const now=Date.now();
    let queue=[];
    Object.entries(p).forEach(([uid,d])=>{
        if(!d.wrongWords)return;
        const srsData=S.get('srs_'+uid)||{};
        d.wrongWords.forEach(w=>{
            const ws=srsData[w]||{interval:1,lastReview:0,easeFactor:2.5};
            const nextReview=ws.lastReview+(ws.interval*24*60*60*1000);
            if(now>=nextReview){
                queue.push({uid:parseInt(uid),word:w,interval:ws.interval,overdue:now-nextReview});
            }
        });
    });
    // Sort by most overdue first
    queue.sort((a,b)=>b.overdue-a.overdue);
    return queue;
}

function updateSRS(uid,word,quality){
    // quality: 0=wrong, 1=hard, 2=good, 3=easy
    const srsData=S.get('srs_'+uid)||{};
    const ws=srsData[word]||{interval:1,lastReview:0,easeFactor:2.5};
    
    if(quality>=2){
        ws.interval=Math.round(ws.interval*ws.easeFactor);
        ws.easeFactor=Math.max(1.3,ws.easeFactor+0.1*(quality-2));
    }else{
        ws.interval=1;
        ws.easeFactor=Math.max(1.3,ws.easeFactor-0.2);
    }
    ws.lastReview=Date.now();
    srsData[word]=ws;
    S.set('srs_'+uid,srsData);
}
window.updateSRS=updateSRS;

// ═══ #29 GAMIFICATION 2.0 ═══
function getXP(){return S.get('xp')||0}
function addXP(amount,reason){
    let xp=getXP();xp+=amount;S.set('xp',xp);
    // Show XP toast
    const toast=document.createElement('div');
    toast.style.cssText='position:fixed;top:20px;right:20px;background:#6366F1;color:#fff;padding:8px 16px;border-radius:10px;font-size:0.85rem;font-weight:600;z-index:99999;animation:fadeInOut 2s ease forwards;pointer-events:none;';
    toast.textContent='+'+amount+' XP · '+reason;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),2500);
    
    // Check level up
    checkLevelUp(xp);
}
window.addXP=addXP;

function checkLevelUp(xp){
    const levels=[
        {name:'Yangi boshlovchi',min:0,emoji:'🌱'},
        {name:'O\'rganuvchi',min:100,emoji:'📚'},
        {name:'Bilimdon',min:300,emoji:'📖'},
        {name:'Expert',min:600,emoji:'⭐'},
        {name:'Master',min:1000,emoji:'👑'},
        {name:'Professor',min:2000,emoji:'🎓'},
        {name:'Legend',min:5000,emoji:'🏆'},
    ];
    const current=levels.filter(l=>xp>=l.min).pop();
    const prev=S.get('currentLevel')||'';
    if(current&&current.name!==prev){
        S.set('currentLevel',current.name);
        if(prev){// Level up!
            setTimeout(()=>{
                modal('Daraja oshdi!','<div style="text-align:center;padding:2rem"><div style="font-size:4rem">'+current.emoji+'</div><h2 style="color:#4338CA">'+current.name+'</h2><p style="color:#6B7280">Tabriklaymiz! Yangi darajaga yetdingiz!</p><p style="font-size:0.85rem;color:#9CA3AF">Jami XP: '+xp+'</p></div>');
            },500);
        }
    }
}

// Hook XP into exercise answers
const _origSel2=window.selectOption;
window.selectOption=function(q,o){
    const unit=vocabularyUnits[currentUnitIndex];
    const ex=unit.exercises[q];
    const correct=o===ex.correctAnswer;
    _origSel2(q,o);
    if(correct)addXP(10,'To\'g\'ri javob');
    else addXP(2,'Urinish');
};

// ═══ #15 DARK MODE FIXES ═══
function fixDarkMode(){
    const style=document.createElement('style');
    style.textContent=`
        [data-theme="dark"] .theory-text-column,
        [data-theme="dark"] .theory-block,
        [data-theme="dark"] .web-text,
        [data-theme="dark"] .fn-def,
        [data-theme="dark"] .example-box {
            color: #E5E7EB !important;
        }
        [data-theme="dark"] .exercise-card {
            background: #1F2937 !important;
            border-color: #374151 !important;
        }
        [data-theme="dark"] .option-btn {
            background: #111827 !important;
            border-color: #374151 !important;
            color: #E5E7EB !important;
        }
        [data-theme="dark"] .fill-input,
        [data-theme="dark"] .write-area {
            background: #111827 !important;
            border-color: #374151 !important;
            color: #E5E7EB !important;
        }
        [data-theme="dark"] .ai-feedback {
            color: #E5E7EB !important;
        }
        [data-theme="dark"] #smart-bar {
            background: #111827 !important;
            border-color: #374151 !important;
        }
        [data-theme="dark"] strong { color: #93C5FD !important; }
        [data-theme="dark"] em { color: #A5B4FC !important; }
        @keyframes fadeInOut {
            0%{opacity:0;transform:translateY(-10px)}
            15%{opacity:1;transform:translateY(0)}
            85%{opacity:1}
            100%{opacity:0;transform:translateY(-10px)}
        }
    `;
    document.head.appendChild(style);
}

// ═══ #21 ERROR TRACKING ═══
function initErrorTracking(){
    window.onerror=function(msg,url,line,col,err){
        const errors=S.get('errors')||[];
        errors.push({msg,url,line,time:Date.now()});
        if(errors.length>50)errors.splice(0,errors.length-50);
        S.set('errors',errors);
    };
}

// ═══ #22 SEO META TAGS ═══
function addSEOMeta(){
    if(!document.querySelector('meta[name="description"]')){
        const meta=document.createElement('meta');
        meta.name='description';
        meta.content='English Vocabulary in Use Advanced — 60 ta unit, 866 ta mashq, o\'zbek tiliga tarjima. Ingliz tili lug\'atini o\'rganing!';
        document.head.appendChild(meta);
    }
    // Open Graph
    const og=[
        {p:'og:title',c:'English Vocabulary — O\'zbek tili tarjimasi bilan'},
        {p:'og:description',c:'60 unit, 866 mashq, 6 xil mashq turi. Bepul!'},
        {p:'og:type',c:'website'},
        {p:'og:url',c:'https://abduraximsher.github.io/Grammar/advanced-vocabulary.html'},
    ];
    og.forEach(o=>{
        if(!document.querySelector('meta[property="'+o.p+'"]')){
            const m=document.createElement('meta');m.setAttribute('property',o.p);m.content=o.c;document.head.appendChild(m);
        }
    });
}

// ═══ #13 FIRST SCREEN EXPERIENCE ═══
function showWelcomeIfNew(){
    if(S.get('welcomed'))return;
    setTimeout(()=>{
        modal('Xush kelibsiz! 🎓','<div style="text-align:center;padding:1rem"><h3 style="color:#1F2937">English Vocabulary in Use</h3><p style="color:#6B7280;margin:1rem 0">60 ta unit, 866+ ta mashq, o\'zbek tilida tarjima</p><div style="display:flex;flex-direction:column;gap:10px;margin-top:1.5rem"><button onclick="closeModal();S.set(\'welcomed\',1);dailyPractice()" style="padding:14px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;border:none;border-radius:12px;font-size:1rem;cursor:pointer;font-weight:600">⚡ Mashqni boshlash</button><button onclick="closeModal();S.set(\'welcomed\',1);openPlacementTest()" style="padding:14px;background:#F3F4F6;color:#374151;border:none;border-radius:12px;font-size:1rem;cursor:pointer;font-weight:600">🧪 Darajamni aniqlash</button><button onclick="closeModal();S.set(\'welcomed\',1);" style="padding:14px;background:#fff;color:#6B7280;border:1px solid #E5E7EB;border-radius:12px;font-size:1rem;cursor:pointer">O\'zim ko\'rib chiqaman</button></div></div>');
    },800);
}

// ═══ UPDATED INIT ═══
function init(){
    createToolbar();
    addMobileCSS();
    fixDarkMode();
    initRouting();
    initErrorTracking();
    addSEOMeta();
    showWelcomeIfNew();
    if('speechSynthesis' in window){speechSynthesis.getVoices();speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();}
    if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
    const _r=window.renderUnit;if(_r){window.renderUnit=function(i){_r(i);setTimeout(addAudio,300)};}
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();


// ═══ WORD MASTERY SYSTEM ═══
// Each word: new → learning → practiced → mastered
window.getWordMastery=function(){return S.get('mastery')||{}};
window.updateWordMastery=function(word,correct){
    const m=S.get('mastery')||{};
    if(!m[word])m[word]={level:0,seen:0,correct:0};
    m[word].seen++;
    if(correct)m[word].correct++;
    const ratio=m[word].correct/m[word].seen;
    if(m[word].seen>=5&&ratio>=0.8)m[word].level=3; // mastered
    else if(m[word].seen>=3&&ratio>=0.6)m[word].level=2; // practiced
    else if(m[word].seen>=1)m[word].level=1; // learning
    S.set('mastery',m);
};

window.openMasteryView=function(){
    const m=S.get('mastery')||{};
    const words=Object.entries(m);
    const levels=[
        {name:'Yangi',emoji:'🆕',lvl:0,count:0,words:[]},
        {name:'O\'rganilmoqda',emoji:'📖',lvl:1,count:0,words:[]},
        {name:'Mashq qilingan',emoji:'⭐',lvl:2,count:0,words:[]},
        {name:'O\'zlashtirilgan',emoji:'✅',lvl:3,count:0,words:[]},
    ];
    words.forEach(([w,d])=>{
        const l=levels.find(x=>x.lvl===d.level);
        if(l){l.count++;l.words.push(w);}
    });
    
    // Also count words never seen
    let totalBold=0;
    vocabularyUnits.forEach(u=>{
        (u.theory.match(/<strong>([^<]+)<\/strong>/g)||[]).forEach(match=>{
            const w=match.replace(/<\/?strong>/g,'');
            if(w.length>2&&w.length<30&&!m[w.toLowerCase()])totalBold++;
        });
    });
    levels[0].count+=totalBold;

    modal('So\'z darajalari','<div style="padding:0.5rem">'+levels.map(l=>`
        <div style="background:${l.lvl===3?'#ECFDF5':l.lvl===2?'#FEF3C7':l.lvl===1?'#DBEAFE':'#F3F4F6'};border-radius:12px;padding:14px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:700;">${l.emoji} ${l.name}</span>
                <span style="font-size:1.2rem;font-weight:800;color:#374151;">${l.count}</span>
            </div>
            ${l.words.length>0?'<div style="margin-top:8px;font-size:0.8rem;color:#6B7280;">'+l.words.slice(0,8).join(', ')+(l.words.length>8?' +yana '+(l.words.length-8):'')+'</div>':''}
        </div>
    `).join('')+'</div>');
};

// ═══ COLLOCATIONS DATABASE ═══
const COLLOCATIONS={
    "competitive":["salary","advantage","market","price","edge","environment"],
    "career":["prospects","path","change","ladder","break","move"],
    "job":["satisfaction","security","stability","interview","offer","description"],
    "make":["a decision","progress","an effort","a mistake","money","friends"],
    "take":["initiative","responsibility","action","notes","a break","advantage"],
    "work":["experience","environment","load","ethic","force","life balance"],
    "brand":["loyalty","awareness","recognition","identity","image","name"],
    "customer":["service","facing","satisfaction","loyalty","base","feedback"],
    "team":["player","work","building","spirit","leader","member"],
    "annual":["bonus","leave","report","review","income","budget"],
    "performance":["related","review","appraisal","indicator","management","bonus"],
    "holiday":["entitlement","pay","destination","resort","season","brochure"],
    "family":["ties","feud","bond","values","tree","reunion"],
    "run":["of the mill","a business","a risk","out of","into","smoothly"],
    "dead":["end job","line","lock","pan","heat","weight"],
    "loss":["leader","making","of confidence","of appetite"],
    "fair":["trade","play","share","enough","game","weather"],
    "traffic":["light labelling","jam","congestion","warden","lights"],
    "food":["allergy","intolerance","chain","industry","poisoning"],
};

window.openCollocations=function(word){
    if(!word){
        // Show all collocations
        modal('Collocations','<div style="max-height:60vh;overflow-y:auto;padding:0.5rem">'+
            Object.entries(COLLOCATIONS).map(([w,cols])=>
                '<div style="padding:10px;border-bottom:1px solid #F3F4F6;cursor:pointer" onclick="openCollocations(\''+w+'\')">'+
                '<strong style="color:#4338CA">'+w+'</strong> <span style="color:#6B7280;font-size:0.85rem">+ '+cols.slice(0,3).join(', ')+' ...</span></div>'
            ).join('')+'</div>');
        return;
    }
    const cols=COLLOCATIONS[word.toLowerCase()]||[];
    modal('Collocations: '+word,'<div style="padding:0.5rem">'+
        (cols.length===0?'<p style="color:#9CA3AF">Collocation topilmadi</p>':
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:1rem 0">'+
        cols.map(c=>'<span onclick="speakWord(\''+word+' '+c+'\')" style="background:#EEF2FF;color:#4338CA;padding:8px 14px;border-radius:20px;font-size:0.9rem;cursor:pointer;transition:all 0.15s" onmouseover="this.style.background=\'#C7D2FE\'" onmouseout="this.style.background=\'#EEF2FF\'"><b>'+word+'</b> '+c+' 🔊</span>').join('')+
        '</div>')+
    '</div>');
};

// ═══ PROGRESS MAP ═══
window.openProgressMap=function(){
    const p=S.get('progress')||{};
    const sections=[
        {name:'Beginner',range:[1,10],emoji:'🌱',color:'#10B981'},
        {name:'Elementary',range:[11,20],emoji:'📚',color:'#3B82F6'},
        {name:'Intermediate',range:[21,30],emoji:'⭐',color:'#8B5CF6'},
        {name:'Upper-Int',range:[31,40],emoji:'🔥',color:'#F59E0B'},
        {name:'Advanced',range:[41,50],emoji:'👑',color:'#EF4444'},
        {name:'Proficiency',range:[51,60],emoji:'🏆',color:'#EC4899'},
    ];

    modal('O\'rganish xaritasi','<div style="padding:0.5rem">'+sections.map(s=>{
        let completed=0,total=0;
        for(let i=s.range[0];i<=s.range[1];i++){
            const u=vocabularyUnits.find(x=>x.id===i);
            if(!u)continue;
            total++;
            const up=p[i];
            if(up&&up.answered>=u.exercises.length*0.6)completed++;
        }
        const pct=total>0?Math.round(completed/total*100):0;
        return `
        <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-weight:700;font-size:0.9rem;">${s.emoji} ${s.name} <span style="color:#9CA3AF;font-weight:400;font-size:0.8rem;">(U${s.range[0]}-${s.range[1]})</span></span>
                <span style="font-size:0.8rem;font-weight:700;color:${s.color};">${pct}%</span>
            </div>
            <div style="height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden;">
                <div style="height:100%;background:${s.color};width:${pct}%;border-radius:4px;transition:width 0.5s;"></div>
            </div>
            <div style="display:flex;gap:3px;margin-top:4px;">
                ${Array.from({length:s.range[1]-s.range[0]+1},(_,idx)=>{
                    const uid=s.range[0]+idx;
                    const up=p[uid];
                    const u=vocabularyUnits.find(x=>x.id===uid);
                    const upct=u&&up?Math.min(100,Math.round(up.answered/u.exercises.length*100)):0;
                    const bg=upct>=80?s.color:upct>0?s.color+'40':'#E5E7EB';
                    return '<div onclick="closeModal();loadUnit('+uid+')" style="flex:1;height:20px;background:'+bg+';border-radius:3px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.55rem;color:'+(upct>=80?'#fff':'#9CA3AF')+';" title="Unit '+uid+'">'+uid+'</div>';
                }).join('')}
            </div>
        </div>`;
    }).join('')+'</div>');
};

// ═══ BACKUP / RESTORE ═══
window.backupProgress=function(){
    const data={
        progress:S.get('progress'),
        mastery:S.get('mastery'),
        streak:S.get('streak'),
        xp:S.get('xp'),
        srs:{}
    };
    // Collect SRS data
    for(let i=1;i<=60;i++){const d=S.get('srs_'+i);if(d)data.srs[i]=d;}
    
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='vocab-backup-'+new Date().toISOString().split('T')[0]+'.json';
    a.click();URL.revokeObjectURL(url);
};

window.restoreProgress=function(){
    const input=document.createElement('input');
    input.type='file';input.accept='.json';
    input.onchange=function(e){
        const file=e.target.files[0];if(!file)return;
        const reader=new FileReader();
        reader.onload=function(ev){
            try{
                const data=JSON.parse(ev.target.result);
                if(data.progress)S.set('progress',data.progress);
                if(data.mastery)S.set('mastery',data.mastery);
                if(data.streak)S.set('streak',data.streak);
                if(data.xp)S.set('xp',data.xp);
                if(data.srs)Object.entries(data.srs).forEach(([k,v])=>S.set('srs_'+k,v));
                alert('Progress tiklandi!');location.reload();
            }catch(err){alert('Fayl noto\'g\'ri formatda');}
        };
        reader.readAsText(file);
    };
    input.click();
};

// Update More Menu with new features
const _origMore=window.openMoreMenu;
window.openMoreMenu=function(){
    const streak=S.get('streak')||{current:0};
    const p=S.get('progress')||{};
    const wc=Object.values(p).reduce((s,d)=>s+(d.wrongWords?d.wrongWords.length:0),0);
    const xp=S.get('xp')||0;
    const items=[
        {i:'🔄',l:'Takrorlash',d:wc+' so\'z',f:'openSpacedRep()'},
        {i:'🃏',l:'Flashcards',d:'Kartochkalar',f:'openFlashcards()'},
        {i:'📖',l:'So\'zlar',d:'Barcha so\'zlar',f:'openWordList()'},
        {i:'🗺️',l:'Xarita',d:'O\'rganish yo\'li',f:'openProgressMap()'},
        {i:'💎',l:'Daraja',d:xp+' XP',f:'openMasteryView()'},
        {i:'🔗',l:'Collocations',d:'So\'z birikmalari',f:'openCollocations()'},
        {i:'🧪',l:'Test',d:'Darajani aniqlash',f:'openPlacementTest()'},
        {i:'🏆',l:'Reyting',d:streak.current+' kun',f:'openLeaderboard()'},
        {i:'❌',l:'Xatolar',d:'Xato so\'zlar',f:'openErrorStats()'},
        {i:'📄',l:'PDF',d:'Chop etish',f:'exportUnitPDF()'},
        {i:'📤',l:'Ulashish',d:'Natija',f:'shareResult()'},
        {i:'💾',l:'Backup',d:'Saqlash',f:'backupProgress()'},
        {i:'📥',l:'Tiklash',d:'Yuklash',f:'restoreProgress()'},
    ];
    modal("Ko'proq",'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0.5rem">'+items.map(b=>'<button onclick="closeModal();'+b.f+'" style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:12px 4px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;cursor:pointer;transition:transform 0.15s" ontouchstart="this.style.transform=\'scale(0.95)\'" ontouchend="this.style.transform=\'\'"><span style="font-size:1.3rem">'+b.i+'</span><span style="font-weight:600;font-size:0.7rem;color:#374151">'+b.l+'</span><span style="font-size:0.6rem;color:#9CA3AF">'+b.d+'</span></button>').join('')+'</div>');
};



// ═══ KEYBOARD SHORTCUTS ═══
document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
    if(e.key==='/'||e.key==='s'&&!e.ctrlKey){e.preventDefault();openSearch();}
    if(e.key==='d')dailyPractice();
    if(e.key==='p')openDashboard();
    if(e.key==='f')openFlashcards();
    if(e.key==='m')openMoreMenu();
    if(e.key==='ArrowRight'&&typeof changeUnit==='function')changeUnit(1);
    if(e.key==='ArrowLeft'&&typeof changeUnit==='function')changeUnit(-1);
    if(e.key==='Escape')closeModal();
});

// ═══ CONTINUE WHERE YOU LEFT OFF ═══
window.continueLastUnit=function(){
    const p=S.get('progress')||{};
    let lastUid=1,lastTs=0;
    Object.entries(p).forEach(([uid,d])=>{
        if(d.ts&&d.ts>lastTs){lastTs=d.ts;lastUid=parseInt(uid);}
    });
    if(typeof loadUnit==='function')loadUnit(lastUid);
};

// ═══ EXPANDED COLLOCATIONS ═══
Object.assign(COLLOCATIONS,{
    "body":["language","clock","temperature","weight","image","odour"],
    "eye":["contact","witness","catching","opener","shadow","sight"],
    "hand":["shake","out","writing","some","ful","icap"],
    "self":["esteem","confidence","conscious","employed","catering","discipline"],
    "high":["brow","light","rise","street","profile","handed"],
    "low":["brow","key","profile","budget","cost","income"],
    "short":["term","listed","cut","age","sighted","handed"],
    "long":["term","standing","lasting","suffering","distance","lived"],
    "full":["time","board","training","moon","length","scale"],
    "hard":["working","ship","core","ware","line","earned"],
    "well":["known","being","off","matched","endowed","established"],
    "over":["worked","whelmed","due","rated","all","time"],
    "under":["paid","graduate","rated","estimate","go","wear"],
    "out":["standing","spoken","come","look","break","line"],
    "break":["through","down","out","fast","even","water"],
    "set":["back","up","out","ting","about"],
    "turn":["over","out","around","down","up"],
    "put":["forward","off","up with","through","across"],
    "global":["warming","economy","village","market","crisis"],
    "social":["media","security","skills","class","life","welfare"],
    "public":["opinion","transport","sector","health","speaking"],
    "mental":["health","illness","state","capacity","arithmetic"],
    "human":["rights","resources","nature","race","being"],
    "natural":["resources","disaster","habitat","beauty","selection"],
    "economic":["growth","crisis","downturn","recovery","sanctions"],
    "political":["party","asylum","refugee","system","prisoner"],
});

})();
