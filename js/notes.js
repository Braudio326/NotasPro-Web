(function(){
  const LS_KEY = 'notas_pro_v1';

  const el = (id) => document.getElementById(id);
  const list = el('list');
  const empty = el('empty');
  const search = el('search');
  const editor = el('editor');
  const form = el('noteForm');
  const noteId = el('noteId');
  const title = el('title');
  const content = el('content');
  const cancelBtn = el('cancelBtn');
  const newBtn = document.getElementById('newBtn');
  const editorTitle = el('editorTitle');
  const exportBtn = el('exportBtn');
  const importInput = el('importInput');

  function uid(){
    return (Date.now().toString(36) + Math.random().toString(36).slice(2,8));
  }

  function load(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){
      console.error('Error al leer localStorage', e);
      return [];
    }
  }

  function save(all){
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  }

  function nowISO(){
    return new Date().toISOString();
  }

  function fmt(dateISO){
    const d = new Date(dateISO);
    return d.toLocaleString();
  }

  function stateFromForm(){
    return {
      id: noteId.value || uid(),
      title: title.value.trim(),
      content: content.value.trim(),
      createdAt: noteId.value ? findById(noteId.value).createdAt : nowISO(),
      updatedAt: nowISO(),
    };
  }

  function findById(id){
    return load().find(n => n.id === id);
  }

  function upsert(note){
    const all = load();
    const i = all.findIndex(n => n.id === note.id);
    if(i >= 0) all[i] = note; else all.unshift(note);
    save(all);
  }

  function remove(id){
    const all = load().filter(n => n.id !== id);
    save(all);
  }

  function render(filter = ''){
    const q = filter.toLowerCase();
    const all = load().filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));

    list.innerHTML = '';
    if(all.length === 0){
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    for(const n of all){
      const li = document.createElement('li');
      li.className = 'note';
      li.innerHTML = `
        <div>
          <h3>${escapeHtml(n.title) || '(Sin título)'}</h3>
          <p>${escapeHtml(n.content).slice(0,180)}${n.content.length>180?'…':''}</p>
        </div>
        <div class="meta">Creada: ${fmt(n.createdAt)} · Última edición: ${fmt(n.updatedAt)}</div>
        <div class="row">
          <button data-act="edit" data-id="${n.id}" class="btn">Editar</button>
          <button data-act="delete" data-id="${n.id}" class="btn">Borrar</button>
        </div>
      `;
      list.appendChild(li);
    }
  }

  function escapeHtml(str){
    return str.replace(/[&<>"']/g, (m)=> ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[m]));
  }

  function openEditor(existing){
    editor.classList.remove('hidden');
    if(existing){
      editorTitle.textContent = 'Editar nota';
      noteId.value = existing.id;
      title.value = existing.title;
      content.value = existing.content;
    }else{
      editorTitle.textContent = 'Nueva nota';
      noteId.value = '';
      title.value = '';
      content.value = '';
    }
    title.focus();
    window.location.hash = '#editor';
  }

  function closeEditor(){
    editor.classList.add('hidden');
    window.location.hash = '';
    form.reset();
    noteId.value = '';
  }

  // Handlers
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!title.value.trim() || !content.value.trim()) return;
    upsert(stateFromForm());
    closeEditor();
    render(search.value);
  });

  cancelBtn.addEventListener('click', ()=>{
    closeEditor();
  });

  list.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    if(act === 'delete'){
      if(confirm('¿Borrar esta nota?')){
        remove(id);
        render(search.value);
      }
    }else if(act === 'edit'){
      const n = findById(id);
      if(n) openEditor(n);
    }
  });

  newBtn?.addEventListener('click', (e)=>{
    if(window.location.hash.includes('new')){
      e.preventDefault();
      openEditor(null);
    }
  });

  search.addEventListener('input', ()=> render(search.value));

  // Export / Import
  exportBtn.addEventListener('click', ()=>{
    const data = JSON.stringify(load(), null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notas_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener('change', async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    try{
      const text = await file.text();
      const arr = JSON.parse(text);
      if(!Array.isArray(arr)) throw new Error('Formato inválido');
      save(arr);
      render(search.value);
      alert('Importación completa.');
    }catch(err){
      alert('No se pudo importar: ' + err.message);
    }finally{
      e.target.value = '';
    }
  });

  // Initial
  render('');
  if(location.hash === '#new') openEditor(null);

})();