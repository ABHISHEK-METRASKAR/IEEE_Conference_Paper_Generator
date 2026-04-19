/* ═══════════════════════════════════════════════════════
   IEEE FORMAT MAKER — script.js
   Two-way sync: left form ↔ right live preview (contenteditable)
   MS-Word toolbar: bold, italic, underline, headings, lists,
   font, size, color, alignment, undo/redo
   Enter = new paragraph, Shift+Enter = line break
═══════════════════════════════════════════════════════ */

/* ══════════════ STATE ══════════════ */
var state = {
  authors:[], references:[],
  customSections:[], figures:[], tables:[],
  isSyncing: false
};
var _id=0; function uid(){return 'u'+(++_id);}
var ORDINALS=['1st','2nd','3rd','4th','5th','6th'];
var REQUIRED=['f-title','f-abstract','f-keywords','f-intro','f-method','f-results','f-conc'];
var zoomLevel=1.0;
var PLACEMENTS=[
  {v:'after-intro',  l:'After Introduction'},
  {v:'after-lit',    l:'After Literature Review'},
  {v:'after-method', l:'After Methodology'},
  {v:'after-results',l:'After Results & Discussion'},
  {v:'after-conc',   l:'After Conclusion'},
];

/* ══════════════ INIT ══════════════ */
document.addEventListener('DOMContentLoaded',function(){
  addAuthor(); addAuthor();
  addReference(); addReference();
  setPlaceholders();
  updateProgress();
  buildRuler();
  // keyboard shortcuts
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)){
      if(e.key==='b'){e.preventDefault();fmt('bold');}
      if(e.key==='i'){e.preventDefault();fmt('italic');}
      if(e.key==='u'){e.preventDefault();fmt('underline');}
    }
  });
  // track selection to update toolbar state
  document.addEventListener('selectionchange', updateToolbarState);
});

function setPlaceholders(){
  var map={
    'pe-intro':'Click to type Introduction…',
    'pe-lit':'Click to type Literature Review…',
    'pe-method':'Click to type Methodology…',
    'pe-results':'Click to type Results & Discussion…',
    'pe-conc':'Click to type Conclusion…',
    'pe-ack':'Click to type Acknowledgment…',
  };
  Object.keys(map).forEach(function(id){
    var el=G(id); if(el) el.setAttribute('data-placeholder',map[id]);
  });
}

/* ══════════════ UTILITIES ══════════════ */
function G(id){return document.getElementById(id);}
function V(id){var e=G(id);return e?e.value.trim():'';}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function toRoman(n){var m=[[10,'X'],[9,'IX'],[8,'VIII'],[7,'VII'],[6,'VI'],[5,'V'],[4,'IV'],[3,'III'],[2,'II'],[1,'I']];var r='';for(var i=0;i<m.length;i++)while(n>=m[i][0]){r+=m[i][1];n-=m[i][0];}return r;}
function showToast(msg){var t=G('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('show');},3000);}
function placeSel(sel){return PLACEMENTS.map(function(p){return '<option value="'+p.v+'"'+(p.v===sel?' selected':'')+'>'+p.l+'</option>';}).join('');}

/* ══════════════ TABS ══════════════ */
function switchTab(tab){
  document.querySelectorAll('.tab').forEach(function(el){el.classList.toggle('active',el.dataset.tab===tab);});
  document.querySelectorAll('.tab-content').forEach(function(el){el.classList.toggle('active',el.id==='tab-'+tab);});
}
function showMediaTab(type){
  G('toggleFigures').classList.toggle('active',type==='figures');
  G('toggleTables').classList.toggle('active',type==='tables');
  G('figuresPanel').style.display=type==='figures'?'':'none';
  G('tablesPanel').style.display=type==='tables'?'':'none';
}

/* ══════════════ ZOOM ══════════════ */
function zoomPreview(delta){
  zoomLevel=Math.min(2.0,Math.max(0.4,zoomLevel+delta));
  var wrap=G('previewZoomWrap');
  if(wrap) wrap.style.transform='scale('+zoomLevel+')';
  var lbl=G('zoomLbl'); if(lbl) lbl.textContent=Math.round(zoomLevel*100)+'%';
}

/* ══════════════ RULER ══════════════ */
function buildRuler(){
  var ri=G('rulerInner'); if(!ri) return;
  // The A4 sheet is 794px, centered in the scroll area
  // Ruler shows tick marks for the paper width
  var html='';
  for(var i=0;i<=794;i+=10){
    var isMajor=(i%50===0);
    html+='<span style="position:absolute;left:'+(20+i)+'px;bottom:0;width:1px;height:'+(isMajor?'8px':'4px')+';background:'+(isMajor?'#888':'#bbb')+'"></span>';
    if(isMajor&&i>0) html+='<span style="position:absolute;left:'+(18+i)+'px;top:2px;font-size:9px;color:#888;font-family:monospace">'+(i/96*2.54).toFixed(1)+'</span>';
  }
  ri.innerHTML=html; ri.style.position='relative'; ri.style.height='100%';
}

/* ══════════════ WORD COUNT / BADGE ══════════════ */
function wcUpdate(fid,bid){
  var el=G(fid);if(!el)return;
  var n=el.value.trim()?el.value.trim().split(/\s+/).length:0;
  var b=G(bid);if(b)b.textContent=n+(n===1?' word':' words');
}
function updateBadge(id){
  var f=G(id),b=G('badge-'+id);if(!f||!b)return;
  var ok=f.value.trim().length>0;
  b.textContent=ok?'ok':'required';b.classList.toggle('ok',ok);
}

/* ══════════════ PROGRESS ══════════════ */
function updateProgress(){
  var filled=0;
  REQUIRED.forEach(function(id){var e=G(id);if(e&&e.value.trim().length>0)filled++;});
  if(state.authors.some(function(a){var e=G('aname-'+a.id);return e&&e.value.trim();})) filled++;
  if(state.references.some(function(r){var e=G('rtext-'+r.id);return e&&e.value.trim();})) filled++;
  var pct=Math.round(filled/(REQUIRED.length+2)*100);
  var f=G('progressFill'),l=G('progressLabel');
  if(f)f.style.width=pct+'%';
  if(l)l.textContent=pct+'% complete';
}

/* ══════════════ SYNC: FORM → PREVIEW ══════════════ */
/* Called when user types in left-panel textarea */
function syncToPreview(){
  if(state.isSyncing) return;
  state.isSyncing=true;

  /* Title */
  var title=V('f-title');
  var peTitle=G('pe-title');
  if(peTitle && peTitle.innerText.trim()!==title){
    peTitle.innerText=title||'';
  }

  /* Abstract */
  var absEl=G('pe-abstract');
  if(absEl){
    var absVal=V('f-abstract');
    if(absEl.innerText.trim()!==absVal) absEl.innerText=absVal||'';
  }

  /* Keywords */
  var kw=V('f-keywords');
  var kwWrap=G('pe-keywords-wrap');
  var kwEl=G('pe-keywords');
  if(kwWrap) kwWrap.style.display=kw?'':'none';
  if(kwEl) kwEl.textContent=kw;

  /* Sections */
  syncSection('f-intro','pe-intro');
  syncSection('f-lit','pe-lit');
  syncSection('f-method','pe-method');
  syncSection('f-results','pe-results');
  syncSection('f-conc','pe-conc');
  syncSection('f-ack','pe-ack');

  /* Literature Review section block visibility */
  var litBlock=G('block-lit');
  if(litBlock) litBlock.style.display=V('f-lit')?'':'none';
  var ackBlock=G('block-ack');
  if(ackBlock) ackBlock.style.display=V('f-ack')?'':'none';

  /* Authors */
  renderAuthorsPreview();

  /* References */
  renderRefsPreview();

  /* Media */
  renderAllMedia();

  state.isSyncing=false;
}

function syncSection(fieldId, previewId){
  var el=G(previewId); if(!el) return;
  var val=V(fieldId);
  /* Only update if meaningfully different (avoid cursor reset) */
  var current=el.innerText.trim();
  if(current===val) return;
  /* Convert textarea plain text → paragraph HTML */
  if(!val){ el.innerHTML=''; return; }
  el.innerHTML = textToParas(val);
}

/* Convert plain text (with blank lines as para breaks) to <p> tags */
function textToParas(text){
  if(!text) return '';
  var paras=text.split(/\n{2,}/);
  return paras.map(function(p,i){
    p=p.replace(/\n/g,'<br>').trim();
    if(!p) return '';
    var cls=i===0?'':'';
    var indent=i===0?'':'style="text-indent:0.5em"';
    return '<p '+indent+' style="margin:0;text-align:justify;line-height:1.3;font-size:10pt">'+p+'</p>';
  }).filter(Boolean).join('');
}

/* ══════════════ SYNC: PREVIEW → FORM ══════════════ */
/* Called when user edits directly in the preview */
function onPreviewEdit(el){
  if(state.isSyncing) return;
  state.isSyncing=true;

  var fieldId=el.getAttribute('data-field');
  if(fieldId){
    var formEl=G(fieldId);
    if(formEl){
      /* Extract plain text from contenteditable */
      var txt=getPlainText(el);
      formEl.value=txt;
      updateBadge(fieldId);
      wcUpdate(fieldId, 'wc-'+fieldId.replace('f-',''));
      updateProgress();
    }
  }

  /* Special: title */
  if(el.id==='pe-title'){
    var tField=G('f-title');
    if(tField) tField.value=el.innerText.trim();
    updateBadge('f-title');
    updateProgress();
  }

  /* Special: abstract */
  if(el.id==='pe-abstract'){
    var aField=G('f-abstract');
    if(aField){
      aField.value=getPlainText(el);
      wcUpdate('f-abstract','wc-abstract');
      updateBadge('f-abstract');
      updateProgress();
    }
  }

  state.isSyncing=false;
}

function onPreviewFocus(){
  /* ensure toolbar stays visible */
}

/* Extract plain text preserving line breaks from contenteditable */
function getPlainText(el){
  var html=el.innerHTML;
  /* Convert <br> and </p><p> to newlines */
  html=html.replace(/<br\s*\/?>/gi,'\n');
  html=html.replace(/<\/p>\s*<p[^>]*>/gi,'\n\n');
  html=html.replace(/<p[^>]*>/gi,'');
  html=html.replace(/<\/p>/gi,'');
  /* Strip remaining tags */
  var tmp=document.createElement('div');
  tmp.innerHTML=html;
  return tmp.innerText;
}

/* ══════════════ ENTER KEY HANDLING ══════════════ */
function handleEnterKey(e, el){
  if(e.key==='Enter'){
    if(e.shiftKey){
      /* Shift+Enter = <br> line break */
      e.preventDefault();
      document.execCommand('insertLineBreak');
    } else {
      /* Enter = new paragraph <p> */
      e.preventDefault();
      document.execCommand('insertParagraph');
    }
  }
}

/* ══════════════ MS-WORD TOOLBAR COMMANDS ══════════════ */
function doc(cmd, val){
  document.execCommand(cmd, false, val||null);
  updateToolbarState();
}
function fmt(cmd){
  document.execCommand(cmd, false, null);
  updateToolbarState();
}
function applyFont(val){
  document.execCommand('fontName', false, val);
}
function applyFontSize(val){
  /* execCommand fontSize uses 1-7, we use pt via CSS instead */
  var sel=window.getSelection();
  if(!sel||sel.rangeCount===0) return;
  var range=sel.getRangeAt(0);
  if(range.collapsed) return;
  var span=document.createElement('span');
  span.style.fontSize=val+'pt';
  try{range.surroundContents(span);}catch(ex){
    document.execCommand('fontSize',false,'3');
  }
}
function applyColor(cmd, val){
  document.execCommand(cmd, false, val);
  if(cmd==='foreColor'){
    var bar=G('fgColorBar'); if(bar) bar.style.background=val;
  }
}
function pickColor(cmd){
  var pid=cmd==='foreColor'?'fgColorPicker':'bgColorPicker';
  var picker=G(pid); if(picker) picker.click();
}
function applyLineSpacing(val){
  /* Apply to current block */
  var sel=window.getSelection(); if(!sel||sel.rangeCount===0) return;
  var node=sel.anchorNode;
  while(node&&node.nodeType!==1) node=node.parentNode;
  if(node) node.style.lineHeight=val;
}
function applyHeading(val){
  if(!val) return;
  var sel=window.getSelection(); if(!sel||sel.rangeCount===0) return;
  var range=sel.getRangeAt(0);
  if(val==='body'){
    document.execCommand('formatBlock',false,'p');
    document.execCommand('removeFormat');
  } else if(val==='ieee-h1'){
    document.execCommand('formatBlock',false,'div');
    var node=sel.anchorNode;
    while(node&&node.nodeType!==1) node=node.parentNode;
    if(node){
      node.className='ieee-h1';
      node.style.cssText='font-size:10pt;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:0.04em;margin:8pt 0 2pt;display:block;';
    }
  } else if(val==='ieee-h2'){
    document.execCommand('formatBlock',false,'div');
    var node2=sel.anchorNode;
    while(node2&&node2.nodeType!==1) node2=node2.parentNode;
    if(node2){
      node2.className='ieee-h2';
      node2.style.cssText='font-size:10pt;font-style:italic;font-weight:700;text-align:left;margin:5pt 0 1pt;display:block;';
    }
  } else if(val==='ieee-h3'){
    document.execCommand('italic',false,null);
  }
  /* reset select */
  setTimeout(function(){var s=G('sel-heading');if(s)s.value='';},100);
}

/* Update toolbar active states */
function updateToolbarState(){
  var cmds=['bold','italic','underline','strikeThrough','superscript','subscript'];
  var ids=['btn-bold','btn-italic','btn-underline','btn-strike','btn-super','btn-sub'];
  cmds.forEach(function(cmd,i){
    var btn=G(ids[i]); if(!btn) return;
    try{ btn.classList.toggle('active', document.queryCommandState(cmd)); }catch(e){}
  });
}

/* ══════════════ AUTHORS ══════════════ */
function addAuthor(){
  if(state.authors.length>=6){showToast('Max 6 authors (IEEE).');return;}
  state.authors.push({id:uid()}); renderAuthors();
}
function removeAuthor(id){
  state.authors=state.authors.filter(function(a){return a.id!==id;});
  renderAuthors(); updateProgress(); renderAuthorsPreview();
}
function renderAuthors(){
  var c=G('authorsList');if(!c)return;c.innerHTML='';
  state.authors.forEach(function(a,i){
    var d=document.createElement('div');d.className='author-card';
    d.innerHTML=
      '<div class="author-card-hdr"><span class="author-card-num"><span class="ordinal">'+ORDINALS[i]+'</span> Author</span>'+
      '<button class="rm-btn" onclick="removeAuthor(\''+a.id+'\')">&#x2715;</button></div>'+
      '<div class="author-grid">'+
        '<div class="af"><span class="af-lbl">Full Name</span><input type="text" id="aname-'+a.id+'" placeholder="Given Name Surname" oninput="updateProgress();renderAuthorsPreview();syncToPreview();"/></div>'+
        '<div class="af"><span class="af-lbl">Email</span><input type="text" id="aemail-'+a.id+'" placeholder="email@inst.edu" oninput="renderAuthorsPreview();"/></div>'+
        '<div class="af"><span class="af-lbl">Department</span><input type="text" id="adept-'+a.id+'" placeholder="Dept. of Computer Science" oninput="renderAuthorsPreview();"/></div>'+
        '<div class="af"><span class="af-lbl">Organization</span><input type="text" id="aorg-'+a.id+'" placeholder="University Name" oninput="renderAuthorsPreview();"/></div>'+
        '<div class="af full"><span class="af-lbl">City, Country</span><input type="text" id="acity-'+a.id+'" placeholder="City, Country" oninput="renderAuthorsPreview();"/></div>'+
      '</div>';
    c.appendChild(d);
  });
}
function getAuthors(){
  return state.authors.map(function(a){
    return {name:V('aname-'+a.id),email:V('aemail-'+a.id),dept:V('adept-'+a.id),org:V('aorg-'+a.id),city:V('acity-'+a.id)};
  });
}
function renderAuthorsPreview(){
  var block=G('pe-authors'); if(!block) return;
  var auths=getAuthors().filter(function(a){return a.name;});
  if(!auths.length){block.innerHTML='';return;}
  block.innerHTML=auths.map(function(a,i){
    return '<div class="p-author-item">'+
      '<div class="p-author-name"><sup>'+ORDINALS[i]+'</sup> '+esc(a.name)+'</div>'+
      (a.dept?'<div class="p-author-dept">'+esc(a.dept)+'</div>':'')+
      (a.org?'<div class="p-author-org">'+esc(a.org)+'</div>':'')+
      (a.city?'<div class="p-author-city">'+esc(a.city)+'</div>':'')+
      (a.email?'<div class="p-author-email">'+esc(a.email)+'</div>':'')+
    '</div>';
  }).join('');
}

/* ══════════════ REFERENCES ══════════════ */
function addReference(){state.references.push({id:uid()});renderReferences();}
function removeReference(id){
  state.references=state.references.filter(function(r){return r.id!==id;});
  renderReferences();renderRefsPreview();
}
function renderReferences(){
  var c=G('referencesList');if(!c)return;c.innerHTML='';
  state.references.forEach(function(r,i){
    var row=document.createElement('div');row.className='ref-row';
    row.innerHTML=
      '<div class="ref-num">['+(i+1)+']</div>'+
      '<input class="finput" type="text" id="rtext-'+r.id+'" '+
        'placeholder="G. Author, &quot;Title,&quot; Journal, vol. X, pp. Y-Z, Year." '+
        'oninput="updateProgress();renderRefsPreview();"/>'+
      '<button class="rm-btn" onclick="removeReference(\''+r.id+'\')">&#x2715;</button>';
    c.appendChild(row);
  });
}
function getRefs(){return state.references.map(function(r){return V('rtext-'+r.id);}).filter(Boolean);}
function renderRefsPreview(){
  var block=G('block-refs'),list=G('pe-refs'); if(!list||!block) return;
  var refs=getRefs();
  block.style.display=refs.length?'':'none';
  list.innerHTML=refs.map(function(r,i){
    return '<div class="p-ref-item"><span class="p-ref-num">['+(i+1)+']</span><span>'+esc(r)+'</span></div>';
  }).join('');
}

/* ══════════════ CUSTOM SECTIONS ══════════════ */
function addCustomSection(){state.customSections.push({id:uid()});renderCustomSections();}
function removeCustomSection(id){
  state.customSections=state.customSections.filter(function(c){return c.id!==id;});
  renderCustomSections();renderAllMedia();
}
function renderCustomSections(){
  var c=G('customSectionsList'),empty=G('customEmpty'),btn=G('customAddBtn');
  if(!c)return;c.innerHTML='';
  if(state.customSections.length===0){if(empty)empty.style.display='';if(btn)btn.style.display='none';return;}
  if(empty)empty.style.display='none';if(btn)btn.style.display='';
  state.customSections.forEach(function(cs,i){
    var d=document.createElement('div');d.className='cs-card';
    d.innerHTML=
      '<div class="cs-hdr"><span class="cs-num">Custom '+(i+1)+'</span>'+
        '<button class="rm-btn" onclick="removeCustomSection(\''+cs.id+'\')">&#x2715;</button></div>'+
      '<div class="af" style="margin-bottom:6px"><span class="af-lbl">Heading</span>'+
        '<input class="finput" type="text" id="cshead-'+cs.id+'" placeholder="Section Title" oninput="renderAllMedia();"/></div>'+
      '<div class="af" style="margin-bottom:6px"><span class="af-lbl">Placement</span>'+
        '<select class="place-sel" id="csplace-'+cs.id+'" onchange="renderAllMedia();">'+placeSel('after-intro')+'</select></div>'+
      '<div class="af"><span class="af-lbl">Content <span class="wcbadge" id="wc-cs-'+cs.id+'">0 words</span></span>'+
        '<textarea class="finput sectarea" id="cstext-'+cs.id+'" rows="5" placeholder="Content…" '+
          'oninput="wcUpdate(\'cstext-'+cs.id+'\',\'wc-cs-'+cs.id+'\');renderAllMedia();"></textarea></div>';
    c.appendChild(d);
  });
}
function getCustomSections(){
  return state.customSections.map(function(cs){
    var pe=G('csplace-'+cs.id);
    return {id:cs.id,heading:V('cshead-'+cs.id),text:V('cstext-'+cs.id),placement:pe?pe.value:'after-intro'};
  });
}

/* ══════════════ FIGURES ══════════════ */
function addFigure(){state.figures.push({id:uid(),src:'',caption:'',placement:'after-intro',widthPct:100});renderFigures();}
function removeFigure(id){state.figures=state.figures.filter(function(f){return f.id!==id;});renderFigures();renderAllMedia();}
function renderFigures(){
  var c=G('figuresList'),empty=G('figuresEmpty'),btn=G('figureAddBtn');
  if(!c)return;c.innerHTML='';
  if(state.figures.length===0){if(empty)empty.style.display='';if(btn)btn.style.display='none';return;}
  if(empty)empty.style.display='none';if(btn)btn.style.display='';
  state.figures.forEach(function(f,i){
    var d=document.createElement('div');d.className='media-card';
    var imgPart=f.src?
      '<div class="img-preview-wrap"><img src="'+f.src+'" style="max-width:100%" alt=""/><button class="img-clear-btn" onclick="clearFigImg(\''+f.id+'\')">&#x2715; Remove</button></div>':
      '<div class="img-upload-zone" id="upzone-'+f.id+'"><input type="file" accept="image/*" onchange="handleImgUpload(event,\''+f.id+'\')"/>'+
        '<div class="img-upload-icon">🖼</div><div class="img-upload-text"><b>Click to upload</b> or drag &amp; drop<br><small>PNG, JPG, GIF, SVG</small></div></div>';
    var wPart=f.src?
      '<div class="af" style="margin-bottom:6px"><span class="af-lbl">Width: <b id="fw-'+f.id+'">'+f.widthPct+'%</b></span>'+
        '<input type="range" min="20" max="100" step="5" value="'+f.widthPct+'" style="width:100%" oninput="updFigW(\''+f.id+'\',this.value);"/></div>':'';
    d.innerHTML=
      '<div class="media-card-hdr"><span class="mtag">FIG '+(i+1)+'</span><button class="rm-btn" onclick="removeFigure(\''+f.id+'\')">&#x2715;</button></div>'+
      imgPart+
      '<div class="af" style="margin-bottom:6px"><span class="af-lbl">Caption</span><input class="finput" type="text" id="fcap-'+f.id+'" value="'+esc(f.caption)+'" placeholder="Caption text" oninput="updFigCap(\''+f.id+'\');"/></div>'+
      wPart+
      '<div class="af"><span class="af-lbl">Placement</span><select class="place-sel" id="fplace-'+f.id+'" onchange="updFigPlace(\''+f.id+'\',this.value);">'+placeSel(f.placement)+'</select></div>';
    c.appendChild(d);
    if(!f.src) setupDnD(f.id);
  });
}
function setupDnD(fid){
  var z=G('upzone-'+fid);if(!z)return;
  z.addEventListener('dragover',function(e){e.preventDefault();z.style.borderColor='var(--word-blue)';});
  z.addEventListener('dragleave',function(){z.style.borderColor='';});
  z.addEventListener('drop',function(e){e.preventDefault();z.style.borderColor='';var f=e.dataTransfer.files[0];if(f&&f.type.match('image.*'))readImg(f,fid);});
}
function handleImgUpload(e,fid){var f=e.target.files[0];if(f)readImg(f,fid);}
function readImg(file,fid){
  var r=new FileReader();
  r.onload=function(ev){var fig=state.figures.find(function(f){return f.id===fid;});if(fig){fig.src=ev.target.result;renderFigures();renderAllMedia();}};
  r.readAsDataURL(file);
}
function clearFigImg(fid){var fig=state.figures.find(function(f){return f.id===fid;});if(fig){fig.src='';renderFigures();renderAllMedia();}}
function updFigCap(fid){var el=G('fcap-'+fid);var fig=state.figures.find(function(f){return f.id===fid;});if(fig&&el){fig.caption=el.value;renderAllMedia();}}
function updFigW(fid,val){var fig=state.figures.find(function(f){return f.id===fid;});var l=G('fw-'+fid);if(fig){fig.widthPct=parseInt(val);if(l)l.textContent=val+'%';renderAllMedia();}}
function updFigPlace(fid,val){var fig=state.figures.find(function(f){return f.id===fid;});if(fig){fig.placement=val;renderAllMedia();}}
function getFigures(){return state.figures.map(function(f,i){return {id:f.id,index:i+1,src:f.src,caption:f.caption||'Fig.'+(i+1)+'.',placement:f.placement||'after-intro',widthPct:f.widthPct||100};});}

/* ══════════════ TABLES ══════════════ */
function addTable(){state.tables.push({id:uid(),rows:3,cols:4,placement:'after-intro'});renderTables();}
function removeTable(id){state.tables=state.tables.filter(function(t){return t.id!==id;});renderTables();renderAllMedia();}
function renderTables(){
  var c=G('tablesList'),empty=G('tablesEmpty'),btn=G('tableAddBtn');
  if(!c)return;c.innerHTML='';
  if(state.tables.length===0){if(empty)empty.style.display='';if(btn)btn.style.display='none';return;}
  if(empty)empty.style.display='none';if(btn)btn.style.display='';
  state.tables.forEach(function(t,idx){
    var roman=toRoman(idx+1);
    var d=document.createElement('div');d.className='media-card';d.id='tcard-'+t.id;
    d.innerHTML=
      '<div class="media-card-hdr"><span class="mtag">TABLE '+roman+'</span><button class="rm-btn" onclick="removeTable(\''+t.id+'\')">&#x2715;</button></div>'+
      '<div class="af" style="margin-bottom:6px"><span class="af-lbl">Caption</span><input class="finput" type="text" id="tcap-'+t.id+'" placeholder="TABLE '+roman+'. Caption" oninput="renderAllMedia();"/></div>'+
      '<div class="tbl-toolbar">'+
        '<span class="tbl-lbl">Rows:</span><button class="tbl-btn" onclick="tblRC(\''+t.id+'\',\'row\',1)">＋</button><button class="tbl-btn" onclick="tblRC(\''+t.id+'\',\'row\',-1)">－</button>'+
        '<div class="tbl-sep"></div><span class="tbl-lbl">Cols:</span><button class="tbl-btn" onclick="tblRC(\''+t.id+'\',\'col\',1)">＋</button><button class="tbl-btn" onclick="tblRC(\''+t.id+'\',\'col\',-1)">－</button>'+
        '<div class="tbl-sep"></div><span class="tbl-lbl" id="tsize-'+t.id+'">'+t.rows+' × '+t.cols+'</span>'+
        '<div class="tbl-sep"></div><button class="tbl-btn" onclick="clearTable(\''+t.id+'\')">Clear</button>'+
      '</div>'+
      '<div class="tbl-wrap" id="tgrid-'+t.id+'"></div>'+
      '<div class="af" style="margin-top:6px"><span class="af-lbl">Placement</span><select class="place-sel" id="tplace-'+t.id+'" onchange="updTblPlace(\''+t.id+'\',this.value);">'+placeSel(t.placement)+'</select></div>';
    c.appendChild(d);
    buildTblGrid(t.id,t.rows,t.cols);
  });
}
function tblRC(id,type,delta){
  var t=state.tables.find(function(x){return x.id===id;});if(!t)return;
  var saved=getTblData(id);
  if(type==='row')t.rows=Math.min(10,Math.max(1,t.rows+delta));
  else t.cols=Math.min(8,Math.max(1,t.cols+delta));
  buildTblGrid(id,t.rows,t.cols,saved.data);
  var l=G('tsize-'+id);if(l)l.textContent=t.rows+' × '+t.cols;
  renderAllMedia();
}
function clearTable(id){var t=state.tables.find(function(x){return x.id===id;});if(t)buildTblGrid(id,t.rows,t.cols);}
function updTblPlace(id,val){var t=state.tables.find(function(x){return x.id===id;});if(t){t.placement=val;renderAllMedia();}}
function buildTblGrid(id,rows,cols,data){
  var wrap=G('tgrid-'+id);if(!wrap)return;
  var tbl=document.createElement('table');tbl.className='tbl-editor';
  var thead=document.createElement('thead'),tbody=document.createElement('tbody');
  for(var r=0;r<rows;r++){
    var tr=document.createElement('tr');
    for(var c=0;c<cols;c++){
      var cell=document.createElement(r===0?'th':'td');cell.style.position='relative';
      var inp=document.createElement('input');inp.type='text';inp.id='tc-'+id+'-'+r+'-'+c;
      inp.placeholder=r===0?'Header '+(c+1):'';
      if(data&&data[r]&&data[r][c]!==undefined)inp.value=data[r][c];
      inp.addEventListener('input',renderAllMedia);
      var rh=document.createElement('div');rh.className='col-resize-handle';
      setupColResize(rh,id,c);
      cell.appendChild(inp);cell.appendChild(rh);tr.appendChild(cell);
    }
    if(r===0)thead.appendChild(tr);else tbody.appendChild(tr);
  }
  tbl.appendChild(thead);tbl.appendChild(tbody);wrap.innerHTML='';wrap.appendChild(tbl);
}
function setupColResize(handle,tid,col){
  handle.addEventListener('mousedown',function(e){
    e.preventDefault();handle.classList.add('dragging');
    var startX=e.clientX,wrap=G('tgrid-'+tid);
    var tbl=wrap?wrap.querySelector('table'):null;if(!tbl)return;
    var headers=tbl.querySelectorAll('thead th');
    var startW=headers[col]?headers[col].offsetWidth:80;
    function move(ev){var nw=Math.max(44,startW+(ev.clientX-startX));tbl.querySelectorAll('tr').forEach(function(row){var cells=row.children;if(cells[col])cells[col].style.minWidth=nw+'px';});}
    function up(){handle.classList.remove('dragging');document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);}
    document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);
  });
}
function getTblData(id){
  var t=state.tables.find(function(x){return x.id===id;});if(!t)return{rows:0,cols:0,data:[]};
  var data=[];
  for(var r=0;r<t.rows;r++){var row=[];for(var c=0;c<t.cols;c++){var e=G('tc-'+id+'-'+r+'-'+c);row.push(e?e.value:'');}data.push(row);}
  return{rows:t.rows,cols:t.cols,data:data};
}
function getTables(){
  return state.tables.map(function(t,idx){
    var pe=G('tplace-'+t.id);var td=getTblData(t.id);
    return{id:t.id,index:idx+1,roman:toRoman(idx+1),caption:V('tcap-'+t.id)||('TABLE '+toRoman(idx+1)+'.'),placement:pe?pe.value:(t.placement||'after-intro'),rows:td.rows,cols:td.cols,data:td.data};
  });
}

/* ══════════════ RENDER ALL MEDIA INTO SLOTS ══════════════ */
function renderAllMedia(){
  var figs=getFigures(), tables=getTables(), customs=getCustomSections();
  var slots=['after-intro','after-lit','after-method','after-results','after-conc'];
  slots.forEach(function(slot){
    var el=G('media-'+slot);if(!el){el=G('media-after-'+slot.replace('after-',''));} if(!el) return;
    var html='';
    figs.forEach(function(f){if(f.placement===slot)html+=figPreviewHTML(f);});
    tables.forEach(function(t){if(t.placement===slot)html+=tblPreviewHTML(t);});
    customs.forEach(function(cs){if(cs.placement===slot&&cs.heading)html+=csPreviewHTML(cs);});
    el.innerHTML=html;
    figs.forEach(function(f){if(f.placement===slot)attachResize(f.id);});
  });
}

function figPreviewHTML(f){
  var capText=f.caption.replace(/^Fig\.\s*\d+\.?\s*/i,'');
  var inner=f.src?
    '<img src="'+f.src+'" style="width:'+f.widthPct+'%;display:block;margin:0 auto;" alt="Fig '+f.index+'"/>':
    '<div class="fig-placeholder-box">[Fig. '+f.index+' — upload in editor]</div>';
  return '<div class="fig-wrap" id="pw-'+f.id+'" data-fid="'+f.id+'">'+inner+
    '<div class="fig-caption"><b>Fig. '+f.index+'.</b> '+esc(capText)+'</div>'+
    '<div class="rh nw"></div><div class="rh ne"></div><div class="rh sw"></div><div class="rh se"></div>'+
    '<div class="rh n"></div><div class="rh s"></div><div class="rh e"></div><div class="rh w"></div>'+
    '<div class="rh-tip" id="rt-'+f.id+'"></div>'+
  '</div>';
}

function tblPreviewHTML(t){
  if(!t.data||!t.data.length)return'';
  var h='<div class="p-tbl-wrap"><div class="p-tbl-caption">'+esc(t.caption)+'</div><table class="p-tbl"><thead><tr>';
  if(t.data[0])t.data[0].forEach(function(c){h+='<th>'+esc(c)+'</th>';});
  h+='</tr></thead><tbody>';
  for(var r=1;r<t.data.length;r++){h+='<tr>';t.data[r].forEach(function(c){h+='<td>'+esc(c)+'</td>';});h+='</tr>';}
  return h+'</tbody></table></div>';
}

function csPreviewHTML(cs){
  return '<div class="p-sec-h1">'+esc(cs.heading)+'</div>'+
    '<div style="font-size:10pt;text-align:justify;line-height:1.3;">'+
    (cs.text||'').split(/\n{2,}/).map(function(p){return '<p style="margin:0;text-indent:0.5em">'+esc(p.replace(/\n/g,' ').trim())+'</p>';}).join('')+
    '</div>';
}

/* ══════════════ FIGURE RESIZE IN PREVIEW ══════════════ */
function attachResize(fid){
  var wrap=G('pw-'+fid);if(!wrap)return;
  var tip=G('rt-'+fid);
  wrap.addEventListener('mousedown',function(e){
    if(e.target.classList.contains('rh'))return;
    document.querySelectorAll('.fig-wrap.selected').forEach(function(el){el.classList.remove('selected');});
    wrap.classList.add('selected');
  });
  document.addEventListener('mousedown',function(e){if(!wrap.contains(e.target))wrap.classList.remove('selected');},true);
  wrap.querySelectorAll('.rh').forEach(function(h){
    h.addEventListener('mousedown',function(e){
      e.preventDefault();e.stopPropagation();
      var dir=Array.from(h.classList).find(function(c){return c!=='rh';});
      var startX=e.clientX,startW=wrap.offsetWidth;
      var cW=wrap.parentElement?wrap.parentElement.offsetWidth:300;
      if(tip)tip.style.display='block';
      function move(ev){
        var dx=ev.clientX-startX,nw=startW;
        if(dir==='e'||dir==='se'||dir==='ne')nw=startW+dx;
        if(dir==='w'||dir==='sw'||dir==='nw')nw=startW-dx;
        nw=Math.max(50,Math.min(cW,nw));
        wrap.style.width=nw+'px';
        var fig=state.figures.find(function(f){return f.id===fid;});
        if(fig)fig.widthPct=Math.round(nw/cW*100);
        if(tip)tip.textContent=Math.round(nw)+'px';
      }
      function up(){if(tip)tip.style.display='none';document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);}
      document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);
    });
  });
}

/* ══════════════ VALIDATION ══════════════ */
var VRULES=[
  {id:'f-title',label:'Paper Title'},{id:'f-abstract',label:'Abstract'},
  {id:'f-keywords',label:'Keywords'},{id:'f-intro',label:'Introduction'},
  {id:'f-method',label:'Methodology'},{id:'f-results',label:'Results & Discussion'},
  {id:'f-conc',label:'Conclusion'},
];
function validatePaper(){
  var res=[];
  VRULES.forEach(function(r){var e=G(r.id);res.push({label:r.label,ok:!!(e&&e.value.trim())});});
  res.push({label:'At least one Author',ok:getAuthors().some(function(a){return a.name;})});
  res.push({label:'At least one Reference',ok:getRefs().length>0});
  var aw=V('f-abstract').split(/\s+/).filter(Boolean).length;
  res.push({label:'Abstract word count ('+aw+' words — target 150–250)',ok:aw>=150&&aw<=250});
  var body=G('modalBody');
  if(body)body.innerHTML=res.map(function(r){
    return '<div class="chk-item"><div class="chk-icon '+(r.ok?'pass':'fail')+'">'+(r.ok?'&#x2713;':'&#x2715;')+'</div>'+
      '<span class="chk-lbl '+(r.ok?'':'fail')+'">'+r.label+'</span></div>';
  }).join('');
  var o=G('modalOverlay');if(o)o.classList.add('open');
}
function closeModal(){var o=G('modalOverlay');if(o)o.classList.remove('open');}

/* ══════════════ COPY / PRINT / CLEAR ══════════════ */
function copyText(){
  var sheet=G('paperSheet');
  var txt=sheet?sheet.innerText:'';
  if(!txt.trim()){showToast('Nothing to copy yet.');return;}
  navigator.clipboard.writeText(txt)
    .then(function(){showToast('Paper text copied!');})
    .catch(function(){showToast('Copy failed.');});
}
function printPaper(){
  var paperTitle = V('f-title');
  if(!paperTitle){ var pe=G('pe-title'); if(pe) paperTitle=pe.innerText.trim(); }
  var originalTitle = document.title;
  if(paperTitle) document.title = paperTitle;
  showToast('Opening print dialog — Save as PDF');
  setTimeout(function(){
    window.print();
    setTimeout(function(){ document.title = originalTitle; }, 2000);
  }, 250);
}
function clearAll(){
  if(!confirm('Clear all content?'))return;
  ['f-title','f-abstract','f-keywords','f-ack','f-intro','f-lit','f-method','f-results','f-conc'
  ].forEach(function(id){var e=G(id);if(e)e.value='';});
  REQUIRED.forEach(function(id){updateBadge(id);});
  /* clear preview editables */
  ['pe-title','pe-abstract','pe-intro','pe-lit','pe-method','pe-results','pe-conc','pe-ack'
  ].forEach(function(id){var e=G(id);if(e)e.innerHTML='';});
  G('pe-authors').innerHTML='';
  G('pe-keywords').textContent='';
  G('pe-keywords-wrap').style.display='none';
  state.authors=[];state.references=[];state.customSections=[];state.figures=[];state.tables=[];
  addAuthor();addAuthor();addReference();addReference();
  renderCustomSections();renderFigures();renderTables();renderAllMedia();
  updateProgress();
  showToast('All content cleared.');
}
