'use strict';
const $ = id => document.getElementById(id);
const state = {
  source:'upload', fileText:'', sourceFile:null, sourceURL:null, pdfPages:[], pdfTotal:0, originalCV:'', job:'', mode:'demo', busy:false, comparison:false,
  variants:[], selected:0, opinion:'ajustes', preset:'personalizado',
  undo:[], history:[], result:null, revisions:0, view:'preview', scoreOriginal:null, scoreLatest:null, scoreSeq:0
};
const sampleCV = `Valentina Rojas
valentina.ejemplo@correo.com · San Miguel de Tucumán

EDUCACIÓN
Secundario completo (2024)
Curso introductorio de Excel (2025)

PROYECTOS
Organicé una feria escolar con mis compañeros, repartiendo tareas y coordinando horarios.
Ayudé de manera ocasional en un comercio familiar con la atención al público.

HABILIDADES
Comunicación, Excel básico, organización y trabajo en equipo.

DISPONIBILIDAD
Turnos de tarde.`;
const namedSections = new Set(['perfil','perfil profesional','sobre mi','resumen','objetivo profesional','objetivo laboral','contacto','experiencia','experiencia profesional','experiencia laboral','experiencia y proyectos','educacion','formacion','formacion academica','estudios','habilidades','competencias','habilidades y herramientas','herramientas','proyectos','idiomas','cursos','certificaciones','otros datos','disponibilidad','voluntariado','logros','referencias']);
const normalize = s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/:$/,'');
function setFeedback(message,ok=false){$('feedback').textContent=message||'';$('feedback').classList.toggle('ok',!!ok);}
function setRevisionStatus(message,ok=true){$('revisionStatus').textContent=message||'';$('revisionStatus').style.color=ok?'#9cd9cf':'#ffc7bb';}
function setSource(source){
  state.source=source;const upload=source==='upload',create=source==='create';
  $('tabCreate').classList.toggle('active',create);$('tabCreate').setAttribute('aria-selected',String(create));
  $('tabUpload').classList.toggle('active',upload);$('tabPaste').classList.toggle('active',!upload&&!create);
  $('tabUpload').setAttribute('aria-selected',String(upload));$('tabPaste').setAttribute('aria-selected',String(!upload&&!create));
  $('uploadArea').classList.toggle('hidden',!upload||!!state.fileText);
  $('uploadSuccess').classList.toggle('hidden',!upload||!state.fileText);
  $('pasteArea').classList.toggle('hidden',upload||create);$('createArea').classList.toggle('hidden',!create);setFeedback('');
}
function loading(enabled,label='Preparando versiones…'){
  state.busy=enabled;$('analyzeBtn').disabled=enabled;$('reviseBtn').disabled=enabled;
  $('analyzeButtonText').textContent=enabled?label:'Preparar mi nuevo CV';
}
function handleError(error){setFeedback(error?.message||'Ocurrió un error inesperado. Probá nuevamente.');}
async function api(path,opts={}){
  const res=await fetch(path,opts);let body;
  const contentType=res.headers.get('content-type')||'';
  if(contentType.includes('application/json'))body=await res.json();else body=await res.text();
  if(!res.ok){let detail=typeof body==='object'?body.detail:body;if(Array.isArray(detail))detail='Revisá los campos del formulario.';throw new Error(detail||`Error ${res.status}`);}
  return body;
}
function jsonPost(path,data){return api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}
async function loadFile(file){
  if(!file)return;
  if(file.size>4*1024*1024){setFeedback('El archivo supera los 4 MB.');return;}
  const ext=file.name.toLowerCase().split('.').pop();
  if(!['pdf','docx','txt'].includes(ext)){setFeedback('Elegí un PDF, Word (.docx) o TXT.');return;}
  setFeedback('Leyendo el documento…',true);const form=new FormData();form.append('file',file);
  try{
    const result=await api('/api/extract',{method:'POST',body:form});state.fileText=result.text;
    if(state.sourceURL)URL.revokeObjectURL(state.sourceURL);
    state.sourceFile=file;state.pdfPages=result.preview_pages||[];state.pdfTotal=result.total_pages||0;state.sourceURL=file.type==='application/pdf'||ext==='pdf'?URL.createObjectURL(file):null;
    $('fileName').textContent=file.name;
    $('fileCount').textContent=`${result.text.length.toLocaleString('es-AR')} caracteres${result.truncated?' (recortado)':''} listos para analizar`;
    setSource('upload');setFeedback('CV listo. Presioná «Preparar mi nuevo CV».',true);
  }catch(error){handleError(error);}
}
function appendText(parent,text,className='',tag='span'){
  const element=document.createElement(tag);element.className=className;element.textContent=text;parent.appendChild(element);return element;
}
function drawSuggestions(data){
  state.result=data;$('resultMode').textContent=data.label||(data.mode==='ai'?'IA activa':'Prueba sin IA');
  $('resultHeadline').textContent=data.headline||'Tu revisión está lista';
  $('resultNotice').textContent=data.notice||'Comprobá todos tus datos antes de postularte.';
  for(const [containerName,items] of [['suggestionList',data.suggestions||[]],['changesList',data.changes||[]],['questionsList',data.questions_to_confirm||[]]]){
    const node=$(containerName);node.replaceChildren();
    items.forEach(entry=>appendText(node,String(entry),'suggestion-item-text','div'));
  }
  $('improvementsBlock').classList.toggle('hidden',!(data.changes||[]).length);
  $('questionsBlock').classList.toggle('hidden',!(data.questions_to_confirm||[]).length);
  $('suggestionList').parentElement.classList.toggle('hidden',false);
  const keywordList=$('keywordList');keywordList.replaceChildren();
  (data.keywords_to_review||[]).forEach(x=>appendText(keywordList,String(x)));
  $('keywordBlock').classList.toggle('hidden',!(data.keywords_to_review||[]).length);
  const sources=data.sources||[];const sourceLinks=$('sourceLinks');sourceLinks.replaceChildren();
  sources.forEach(source=>{if(!/^https:\/\//.test(source.url||''))return;const a=document.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.title;sourceLinks.appendChild(a);});
}
function renderCVText(box,text,style){
  box.replaceChildren();box.className='document-preview template-'+style;
  let first=true;
  (text||'').replace(/\r/g,'').split('\n').forEach(line=>{
    const trim=line.trim();if(!trim){appendText(box,'','doc-spacer','div');return;}
    const isTitle=namedSections.has(normalize(trim));
    const kind=first?'doc-name':isTitle?'doc-title':/^[•*\-]\s+/.test(trim)?'doc-line doc-bullet':'doc-line';
    appendText(box,kind.includes('doc-bullet')?trim.replace(/^[•*\-]\s*/,''):trim,kind,'div');first=false;
  });
}
function renderPreview(){
  renderCVText($('cvPreview'),$('editedCV').value,$('documentStyle').value);
  scheduleScore();
}
let scoreTimer = null;
function scheduleScore(){
  if (!state.originalCV || $('resultContent').classList.contains('hidden')) return;
  clearTimeout(scoreTimer);
  scoreTimer = setTimeout(updateScore, 200);
}
function scoreVisual(prefix, result){
  const value = result.score;
  $('score'+prefix+'Value').textContent = value;
  $('score'+prefix+'Level').textContent = result.level;
  const card = $('score'+prefix+'Card');
  card.dataset.tone = result.tone;
  $('scoreArc'+prefix).setAttribute('stroke-dasharray', `${value} 100`);
  $('score'+prefix+'Message').textContent = prefix === 'Before'
    ? 'Evaluación del contenido que compartiste.'
    : 'Evaluación de esta versión; puede cambiar al editarla.';
}
function drawScoreBreakdown(before, after){
  const target = $('scoreCategoryRows');target.replaceChildren();
  before.categories.forEach((entry, i)=>{
    const improved = after.categories[i];
    const row=document.createElement('div');row.className='score-category-row';
    const name=document.createElement('span');name.className='score-category-name';
    name.textContent=entry.label;row.appendChild(name);
    for(const [kind, item] of [['before',entry],['after',improved]]){
      const meter=document.createElement('div');meter.className='score-small-track';
      const fill=document.createElement('div');fill.className='score-small-fill '+kind;
      fill.style.width=item.value+'%';meter.appendChild(fill);
      const value=document.createElement('span');value.className='score-category-value';
      value.textContent=String(item.value);
      const group=document.createElement('div');group.className='score-bar-group';
      group.appendChild(meter);group.appendChild(value);row.appendChild(group);
    }
    target.appendChild(row);
  });
}
async function updateScore(){
  if (!state.originalCV || !$('editedCV').value.trim()) return;
  const seq=++state.scoreSeq;
  try {
    const job = state.job || '';
    const current = $('editedCV').value;
    const requests = state.scoreOriginal
      ? [Promise.resolve(state.scoreOriginal),jsonPost('/api/score',{cv:current,job})]
      : [jsonPost('/api/score',{cv:state.originalCV,job}),jsonPost('/api/score',{cv:current,job})];
    const [before,after]=await Promise.all(requests);
    if (seq!==state.scoreSeq) return;
    state.scoreOriginal=before;state.scoreLatest=after;
    scoreVisual('Before',before);scoreVisual('After',after);
    const difference=after.score-before.score;
    const delta=$('scoreDelta');delta.dataset.direction=difference>0?'positive':difference<0?'negative':'neutral';
    delta.textContent=difference>0?`↗ Mejoraste ${difference} puntos en presentación y contenido.`
      :difference<0?`↘ Esta versión marca ${Math.abs(difference)} puntos menos. Probá ajustar el contenido.`
      :'Sin variación en el puntaje: esta versión conserva un nivel de presentación similar.';
    drawScoreBreakdown(before,after);
    const tips=$('scoreTips');tips.replaceChildren();
    after.tips.slice(0,4).forEach(t=>appendText(tips,'• '+t,'','p'));
  } catch(error){
    if(seq!==state.scoreSeq)return;
    $('scoreDelta').textContent='No pudimos calcular el puntaje. Podés seguir editando y descargando tu CV.';
  }
}
function setTheme(theme){
  const next = theme==='light'?'light':'dark';
  document.documentElement.dataset.theme=next;
  $('themeToggle').textContent=next==='dark'?'☀ Tema claro':'☾ Tema oscuro';
  $('themeToggle').setAttribute('aria-pressed',String(next==='light'));
  try{localStorage.setItem('cvora-theme',next)}catch(e){}
}
function openInstantBuilder(){
  setSource('create');
  $('analyzeButtonText').textContent='Crear mi CV ahora';
  $('herramienta').scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(()=>$('createName').focus({preventScroll:true}),400);
}

const TEMPLATES = [
 ['moderno','Moderno','Turquesa y limpio','#00bda9'],
 ['clasico','Clásico','Formal y tradicional','#33465a'],
 ['minimalista','Minimalista','Sin adornos','#929fac'],
 ['elegante','Elegante','Serif y discreto','#8e6a58'],
 ['ejecutivo','Ejecutivo','Azul corporativo','#1c527f'],
 ['creativo','Creativo','Más personalidad','#9b52ad'],
 ['compacto','Compacto','Aprovecha el espacio','#47796f'],
 ['ats','Simple ATS','Formato sin decoración','#3d4147']
];
function drawTemplates(){
 const grid=$('templateGrid');grid.replaceChildren();
 TEMPLATES.forEach(([id,title,description,tint])=>{
   const btn=document.createElement('button');btn.type='button';btn.className='template-choice'+(id===$('documentStyle').value?' active':'');
   btn.setAttribute('aria-pressed',String(id===$('documentStyle').value));
   const thumb=document.createElement('div');thumb.className='template-thumb '+id;thumb.style.setProperty('--template-accent',tint);
   const bar=document.createElement('div');bar.className='thumb-name';thumb.appendChild(bar);
   for(let i=0;i<5;i++){const stripe=document.createElement('div');stripe.className='thumb-line'+(i===2?' short':'');thumb.appendChild(stripe);}
   btn.appendChild(thumb);appendText(btn,title,'template-name','strong');appendText(btn,description,'template-description','span');
   btn.addEventListener('click',()=>{$('documentStyle').value=id;drawTemplates();renderPreview();});grid.appendChild(btn);
 });
}
function showOriginal(){
 $('originalPDFPages').classList.add('hidden');$('originalPDFPages').replaceChildren();$('originalFormatted').classList.add('hidden');$('openOriginal').classList.add('hidden');
 if(state.source==='upload'&&state.sourceURL&&state.sourceFile?.name?.toLowerCase().endsWith('.pdf')){
   if(state.pdfPages.length){
     state.pdfPages.forEach((data,i)=>{const img=document.createElement('img');img.src=data;img.alt='Página '+(i+1)+' del PDF original';img.className='original-pdf-page';$('originalPDFPages').appendChild(img);});
     $('originalPDFPages').classList.remove('hidden');
     $('originalFootnote').textContent='Imagen fiel de '+state.pdfPages.length+' página(s) del PDF original'+(state.pdfTotal>state.pdfPages.length?' (el resto se puede abrir en otra pestaña)':'')+'. Sin modificar el diseño.';
   }else{
     renderCVText($('originalFormatted'),state.originalCV,'clasico');$('originalFormatted').classList.remove('hidden');
     $('originalFootnote').textContent='No pudimos renderizar este PDF. Mostramos su texto y podés abrir el archivo original.';
   }
   $('openOriginal').href=state.sourceURL;$('openOriginal').classList.remove('hidden');
 }else{
   renderCVText($('originalFormatted'),state.originalCV,'clasico');$('originalFormatted').classList.remove('hidden');
   $('originalFootnote').textContent=state.source==='upload'?'Vista reconstruida a partir del texto de Word/TXT; no conserva necesariamente el diseño del archivo original.':'Este CV se creó desde texto, por eso no existe un PDF original. Mostramos sus datos antes de mejorarlos.';
 }
}
function toggleComparison(force){
 state.comparison=typeof force==='boolean'?force:!state.comparison;
 $('originalColumn').classList.toggle('hidden',!state.comparison);
 $('comparisonLayout').classList.toggle('two-documents',state.comparison);
 $('compareBtn').classList.toggle('active',state.comparison);
 $('compareBtn').setAttribute('aria-pressed',String(state.comparison));
 $('compareBtn').textContent=state.comparison?'✕ Ocultar comparación':'↔ Comparar antes y después';
 if(state.comparison){switchView('preview');showOriginal();}
}
function buildFromScratch(){
 const name=$('createName').value.trim(),experience=$('createExperience').value.trim();
 if(!name){throw new Error('Escribí tu nombre y apellido para empezar.');}
 if(!experience&&!$('createStudies').value.trim()&&!$('createSkills').value.trim()){throw new Error('Sumá al menos estudios, habilidades o una actividad real para armar tu CV.');}
 const fields=[['',$('createContact').value],['OBJETIVO LABORAL',$('createRole').value],['EXPERIENCIA Y PROYECTOS',experience],['EDUCACIÓN',$('createStudies').value],['HABILIDADES',$('createSkills').value],['OTROS DATOS',$('createExtra').value]];
 let text=name;
 for(const [heading,nodeValue] of fields){const value=nodeValue.trim();if(value)text+='\n\n'+(heading?heading+'\n':'')+value;}
 if(text.length>18000)throw new Error('El contenido supera el límite de 18.000 caracteres.');
 return text;
}
function switchView(view){
  state.view=view;
  $('cvPreview').classList.toggle('hidden',view==='edit');$('editedCV').classList.toggle('hidden',view!=='edit');
  $('previewTab').classList.toggle('active',view==='preview');$('editTab').classList.toggle('active',view==='edit');
  if(view==='preview')renderPreview();
}
function saveSelection(){
  if(state.variants[state.selected])state.variants[state.selected].content=$('editedCV').value;
}
function drawVariants(){
  const grid=$('variantGrid');grid.replaceChildren();
  state.variants.forEach((variant,i)=>{
    const btn=document.createElement('button');btn.type='button';btn.className='variant-choice'+(i===state.selected?' active':'');
    btn.setAttribute('aria-pressed',String(i===state.selected));
    appendText(btn,variant.title,'','strong');appendText(btn,variant.description,'','span');
    btn.addEventListener('click',()=>{
      if(state.busy)return;
      saveSelection();state.selected=i;$('editedCV').value=state.variants[i].content;
      drawVariants();renderPreview();$('versionCounter').textContent=state.variants[i].title;
      setRevisionStatus('Elegiste «'+state.variants[i].title+'». Podés solicitar ajustes sobre esta versión.');
    });grid.appendChild(btn);
  });
}
function drawHistory(){
  const box=$('conversationHistory');box.replaceChildren();
  state.history.slice(-5).forEach(item=>{
    const row=document.createElement('div');row.className='history-entry';
    appendText(row,item.role==='user'?'Tu pedido':'CVORA','','strong');appendText(row,item.text,'','p');box.appendChild(row);
  });
}
function clearOpinion(){
  state.opinion='ajustes';state.preset='personalizado';
  ['likeBtn','dislikeBtn'].forEach(id=>{$(id).classList.remove('active');$(id).setAttribute('aria-pressed','false');});
  document.querySelectorAll('.quick-chip').forEach(btn=>btn.classList.remove('active'));
  $('revisionRequest').value='';
}
function showInitial(data){
  state.scoreOriginal=null; state.scoreLatest=null; ++state.scoreSeq;
  document.querySelector('#scoreBeforeCard .score-caption').textContent = state.source==='create' ? 'ANTES · Datos iniciales' : 'ANTES · CV original';
  state.variants=(data.variants||[]).map(v=>({...v}));
  if(!state.variants.length)state.variants=[{id:'equilibrado',title:'Profesional',description:'Versión inicial',content:data.rewritten_cv||state.originalCV}];
  state.selected=0;state.undo=[];state.history=[];state.revisions=0;state.opinion='ajustes';state.preset='personalizado';
  $('emptyResult').classList.add('hidden');$('resultContent').classList.remove('hidden');
  $('editedCV').value=state.variants[0].content;$('versionCounter').textContent='Versión 1';
  drawSuggestions(data);drawVariants();renderPreview();drawHistory();clearOpinion();drawTemplates();toggleComparison(false);
  $('undoBtn').disabled=true;switchView('preview');
  setRevisionStatus(data.mode==='ai'?'Listo. Elegí una versión, opiná o pedí cambios.':'Estás probando la edición básica; la IA colaborativa requiere una clave de API.');
}
async function analyze(){
  if(state.busy)return;
  let cv;
  try{cv=state.source==='create'?buildFromScratch():state.source==='upload'?state.fileText:$('cvText').value;}
  catch(err){setFeedback(err.message);return;}
  if(cv.trim().length<30){setFeedback('Primero subí un CV o pegá al menos unas líneas.');return;}
  state.originalCV=cv;state.job=$('jobText').value;loading(true);setFeedback('');
  try{
    const data=await jsonPost('/api/analyze',{cv,job:state.job,profile:$('profile').value,ai_consent:$('aiConsent').checked});
    showInitial(data);setFeedback(data.mode==='ai'?'Tus versiones con IA están listas.':'Versión de prueba lista. La IA todavía no está activa.',true);
    $('resultContent').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){handleError(error);}finally{loading(false);}
}
function setOpinion(which){
  state.opinion=which;
  for(const [id,value] of [['likeBtn','me-gusta'],['dislikeBtn','no-me-gusta']]){
    $(id).classList.toggle('active',which===value);$(id).setAttribute('aria-pressed',String(which===value));
  }
  if(which==='me-gusta')setRevisionStatus('¡Genial! Podés descargarlo así o decirnos qué detalle querés cambiar.');
  else setRevisionStatus('Contanos qué mejorar o elegí un ajuste rápido.');
}
function selectPreset(which){
  state.preset=state.preset===which?'personalizado':which;
  document.querySelectorAll('.quick-chip').forEach(btn=>btn.classList.toggle('active',btn.dataset.preset===state.preset));
  setRevisionStatus('Podés aplicar el ajuste o agregar indicaciones propias.');
}
async function refine(){
  if(state.busy||!state.originalCV)return;
  const request=$('revisionRequest').value.trim();
  if(state.preset==='personalizado'&&!request&&state.opinion!=='me-gusta'){
    setRevisionStatus('Seleccioná un ajuste rápido o escribí qué querés modificar.',false);return;
  }
  if(!request&&state.preset==='personalizado'&&state.opinion==='me-gusta'){
    setRevisionStatus('¡Nos alegra que te guste! Ya podés descargarlo, o pedirnos un ajuste si querés.');return;
  }
  const current=$('editedCV').value.trim();
  if(current.length<30){setRevisionStatus('El CV actual es demasiado corto para seguir editándolo.',false);return;}
  const before=current;
  state.busy=true;$('reviseBtn').disabled=true;$('reviseBtn').textContent='✦ Aplicando tus cambios…';setRevisionStatus('Preparando otra propuesta…');
  try{
    const data=await jsonPost('/api/refine',{
      original_cv:state.originalCV,current_cv:current,job:state.job,
      feedback:state.opinion,preset:state.preset,request,ai_consent:$('aiConsent').checked
    });
    state.undo.push({selected:state.selected,content:before});if(state.undo.length>8)state.undo.shift();
    $('undoBtn').disabled=false;state.revisions++;
    $('editedCV').value=data.rewritten_cv;state.variants[state.selected].content=data.rewritten_cv;
    state.variants[state.selected].title='Ajustado '+state.revisions;
    state.variants[state.selected].description='Nueva versión según tus comentarios.';
    state.history.push({role:'user',text:request||document.querySelector('.quick-chip.active')?.textContent||state.opinion});
    state.history.push({role:'assistant',text:data.assistant_message||'Preparé los cambios.'});
    drawSuggestions(data);drawVariants();renderPreview();drawHistory();switchView('preview');
    $('versionCounter').textContent='Ajuste '+state.revisions;
    setRevisionStatus(data.assistant_message||'Listo. Revisá cómo quedó la nueva versión.');
    clearOpinion();
  }catch(error){setRevisionStatus(error?.message||'No pudimos hacer esa mejora. Conservamos tu CV anterior.',false);}
  finally{state.busy=false;$('reviseBtn').disabled=false;$('reviseBtn').textContent='✦ Aplicar mis cambios →';}
}
async function download(kind){
  const cv=$('editedCV').value.trim();if(cv.length<10){setFeedback('Agregá texto antes de descargar.');return;}
  const btn=$(kind==='pdf'?'pdfBtn':'docxBtn');btn.disabled=true;
  try{
    const res=await fetch(`/api/export/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:cv,style:$('documentStyle').value})});
    if(!res.ok){const payload=await res.json().catch(()=>({detail:'Error al exportar'}));throw new Error(payload.detail||'No se pudo exportar');}
    const blob=await res.blob();const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`CVORA_curriculum.${kind}`;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);setFeedback(`Archivo ${kind.toUpperCase()} descargado.`,true);
  }catch(error){handleError(error);}finally{btn.disabled=false;}
}
async function refreshCommerce(){
 try{
  const info=await api('/api/pricing');
  $('priceAmount').textContent='ARS $'+Number(info.price||4900).toLocaleString('es-AR');
  const remaining=Number(info.remaining_credits||0);
  $('creditsInfo').textContent=remaining>0?'Tenés '+remaining+' mejoras con IA disponibles en este navegador. Conservá la cookie para no perder acceso.':'Sin suscripción: 1 mejora + hasta 3 revisiones por compra.';
  $('buyPlanBtn').disabled=!info.checkout_available;
  $('buyPlanBtn').textContent=info.checkout_available?'Comprar con Mercado Pago →':'Pagos aún no activados';
  $('checkoutNotice').textContent=info.checkout_available?(remaining>0?'Tenés créditos disponibles. Revisá tu CV con IA.':'Podés pagar con Mercado Pago y volver a esta página para usar la IA.'):'La versión gratuita está disponible. Estamos preparando las compras con Mercado Pago.';
  if(location.search.includes('pago=verificar')){
    $('checkoutNotice').textContent=remaining>0?'Pago confirmado por Mercado Pago. Ya podés usar tus mejoras.':'Estamos verificando tu pago. Si ya pagaste, revisá de nuevo en unos instantes o contactá a soporte.';
    history.replaceState({},'',location.pathname+location.hash);
  }
 }catch(e){$('checkoutNotice').textContent='No pudimos comprobar el sistema de pagos.';}
}
async function buyPlan(){
 if($('buyPlanBtn').disabled)return;
 $('buyPlanBtn').disabled=true;$('buyPlanBtn').textContent='Conectando con Mercado Pago…';
 try{
  const data=await jsonPost('/api/checkout',{});
  if(!/^https:\/\//.test(data.checkout_url||''))throw new Error('El enlace de pago es inválido.');
  location.href=data.checkout_url;
 }catch(e){$('checkoutNotice').textContent=e.message||'No pudimos comenzar el pago.';refreshCommerce();}
}
async function init(){
  $('year').textContent=String(new Date().getFullYear());
  setTheme(document.documentElement.dataset.theme);
  $('themeToggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='light'?'dark':'light'));
  $('heroQuick').addEventListener('click',openInstantBuilder);
  $('quickStartBtn').addEventListener('click',openInstantBuilder);
  $('navQuick').addEventListener('click',e=>{e.preventDefault();openInstantBuilder();});
  $('buyPlanBtn').addEventListener('click',buyPlan);refreshCommerce();
  $('tabUpload').addEventListener('click',()=>setSource('upload'));$('tabPaste').addEventListener('click',()=>setSource('paste'));$('tabCreate').addEventListener('click',()=>setSource('create'));
  $('uploadArea').addEventListener('click',()=>$('cvFile').click());
  $('uploadArea').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('cvFile').click();}});
  $('cvFile').addEventListener('change',e=>loadFile(e.target.files?.[0]));
  $('removeFile').addEventListener('click',()=>{state.fileText='';state.sourceFile=null;state.pdfPages=[];state.pdfTotal=0;if(state.sourceURL)URL.revokeObjectURL(state.sourceURL);state.sourceURL=null;$('cvFile').value='';setSource('upload');});
  $('uploadArea').addEventListener('dragover',e=>{e.preventDefault();$('uploadArea').classList.add('drag');});
  $('uploadArea').addEventListener('dragleave',()=>$('uploadArea').classList.remove('drag'));
  $('uploadArea').addEventListener('drop',e=>{e.preventDefault();$('uploadArea').classList.remove('drag');loadFile(e.dataTransfer.files?.[0]);});
  $('analyzeBtn').addEventListener('click',analyze);$('pdfBtn').addEventListener('click',()=>download('pdf'));$('docxBtn').addEventListener('click',()=>download('docx'));
  $('previewTab').addEventListener('click',()=>switchView('preview'));
  $('editTab').addEventListener('click',()=>switchView('edit'));
  $('documentStyle').addEventListener('change',()=>{drawTemplates();renderPreview();});$('compareBtn').addEventListener('click',()=>toggleComparison());drawTemplates();$('editedCV').addEventListener('input',()=>{saveSelection();renderPreview();});
  $('reviseBtn').addEventListener('click',refine);
  $('likeBtn').addEventListener('click',()=>setOpinion('me-gusta'));
  $('dislikeBtn').addEventListener('click',()=>setOpinion('no-me-gusta'));
  document.querySelectorAll('.quick-chip').forEach(btn=>btn.addEventListener('click',()=>selectPreset(btn.dataset.preset)));
  $('undoBtn').addEventListener('click',()=>{
    if(!state.undo.length)return;
    const previous=state.undo.pop();state.selected=previous.selected;$('editedCV').value=previous.content;saveSelection();renderPreview();drawVariants();
    $('undoBtn').disabled=!state.undo.length;setRevisionStatus('Restauramos la versión anterior.');
  });
  $('exampleBtn').addEventListener('click',()=>{
    setSource('paste');$('cvText').value=sampleCV;$('profile').value='auto';$('jobText').value='';
    setFeedback('Ejemplo ficticio listo. Hacé clic en «Preparar mi nuevo CV».',true);
  });
  try{
    const status=await api('/api/health');state.mode=status.mode;
    $('modeLabel').textContent=status.mode==='ai'?'✦ IA activada · requiere créditos si hay pagos':'◌ Prueba básica · IA sin activar';
    $('consentRow').classList.toggle('hidden',status.mode!=='ai');
    $('resultMode').textContent=status.mode==='ai'?'IA disponible':'Prueba sin IA';
  }catch(error){
    $('modeLabel').textContent='Sin conexión al servidor';$('consentRow').classList.add('hidden');
    setFeedback('No pudimos conectar con el servidor. Iniciá CVORA con Uvicorn.');
  }
}
document.addEventListener('DOMContentLoaded',init);
