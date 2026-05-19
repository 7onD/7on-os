// 7on OS — Storage page (Notes + Files)
// NOTE: FolderPane / NotesPane / EditorPane / FilesPane are render-functions (not components)
// called as {renderX()} — this prevents React from re-mounting them on every state update,
// which would cause input focus-loss after every keystroke.

const StoragePage = ({ D, refresh: refreshAll, navTarget, onNavConsumed }) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = async () => { setRefreshing(true); try { await refreshAll(); } finally { setRefreshing(false); } };
  const [mode, setMode]               = React.useState('notes');
  const [folder, setFolder]           = React.useState('all');
  const [selectedNote, setSelectedNote] = React.useState(null);
  const [search, setSearch]           = React.useState('');
  const [previewFile, setPreviewFile] = React.useState(null);
  const [viewMode, setViewMode]       = React.useState('grid');
  const [mobileScreen, setMobileScreen] = React.useState('folders');
  const [notes, setNotes]             = React.useState(D.NOTES || []);
  const [saving, setSaving]           = React.useState(false);
  const [newNoteTitle, setNewNoteTitle] = React.useState('');
  const [pendingKind, setPendingKind] = React.useState('p');
  const [slash, setSlash]             = React.useState(null);
  const [newLine, setNewLine]         = React.useState('');
  const [uploading, setUploading]       = React.useState(false);
  const [uploadError, setUploadError]   = React.useState('');
  const [fileMenuPos, setFileMenuPos]   = React.useState(null); // { id, top, left }
  const [renameFile, setRenameFile]     = React.useState(null);
  const [renameName, setRenameName]     = React.useState('');
  const [showNewFolder, setShowNewFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [newFolderIcon, setNewFolderIcon] = React.useState('folder');
  const [newFolderColor, setNewFolderColor] = React.useState('#7aa7ff');
  const [savingFolder, setSavingFolder] = React.useState(false);
  const [showMoveNote, setShowMoveNote] = React.useState(false);
  const [moveNoteFolderId, setMoveNoteFolderId] = React.useState('');
  const newlineRef   = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const fileMenuRef  = React.useRef(null);

  React.useEffect(() => { setNotes(D.NOTES || []); }, [D.NOTES]);

  // Close file menu on outside click
  React.useEffect(() => {
    if (!fileMenuPos) return;
    const handler = e => { if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) setFileMenuPos(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fileMenuPos]);
  React.useEffect(() => {
    if (!selectedNote && notes.length > 0) setSelectedNote(notes[0].id);
  }, [notes]);

  // External navigation (links from tasks/events)
  React.useEffect(() => {
    if (!navTarget) return;
    const { kind, id } = navTarget;
    if (kind === 'note') { setMode('notes'); setSelectedNote(id); setMobileScreen('editor'); }
    else if (kind === 'file') {
      setMode('files');
      const file = FILES.find(f => f.id === id);
      if (file) setPreviewFile(file);
    }
    onNavConsumed && onNavConsumed();
  }, [navTarget]);

  const NOTE_FOLDERS = D.NOTE_FOLDERS || D.FOLDERS || [];
  const FILE_FOLDERS = D.FILE_FOLDERS || D.FOLDERS || [];
  const FOLDERS = mode === 'notes' ? NOTE_FOLDERS : FILE_FOLDERS;
  const FILES   = D.FILES   || [];
  const stats = typeof calcStorageUsed === 'function' ? calcStorageUsed() : { usedDisplay: '—', capDisplay: '—', pct: 0 };

  const filteredNotes = React.useMemo(() => {
    let ns = notes;
    if (folder === 'pinned') return ns.filter(n => n.pinned);
    if (folder !== 'all') ns = ns.filter(n => n.folder === folder);
    if (search) { const q = search.toLowerCase(); ns = ns.filter(n => n.title.toLowerCase().includes(q) || (n.preview || '').toLowerCase().includes(q)); }
    return ns;
  }, [notes, folder, search]);

  const filteredFiles = React.useMemo(() => {
    if (folder === 'all' || folder === 'recent') return FILES;
    return FILES.filter(f => f.folder === folder);
  }, [folder, FILES]);

  const cur       = notes.find(n => n.id === selectedNote);
  const pinned    = filteredNotes.filter(n => n.pinned);
  const others    = filteredNotes.filter(n => !n.pinned);
  const folderCount = id => mode === 'notes' ? notes.filter(n => n.folder === id).length : FILES.filter(f => f.folder === id).length;
  const DEFAULT_FOLDER_IDS = ['nf-personal','nf-work','nf-projects','f-deals','f-objects','f-docs','f-personal'];

  const nowStr = () => {
    const n = new Date();
    return `${n.getDate().toString().padStart(2,'0')}.${(n.getMonth()+1).toString().padStart(2,'0')}, ${n.getHours().toString().padStart(2,'0')}:${n.getMinutes().toString().padStart(2,'0')}`;
  };

  // ── Note CRUD ──────────────────────────────────────────────────────────────
  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return;
    setSaving(true);
    try {
      await createNote({
        title: newNoteTitle.trim(),
        folder: folder !== 'all' && folder !== 'pinned' ? folder : 'nf-personal',
        pinned: false, modified: nowStr(), preview: '', blocks: '[]',
      });
      await refresh();
      setNewNoteTitle('');
    } finally { setSaving(false); }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Удалить заметку?')) return;
    await deleteNote(noteId);
    await refresh();
    setSelectedNote(null);
  };

  const handleTogglePin = async () => {
    if (!cur) return;
    await updateNote(cur.id, { pinned: cur.pinned ? 0 : 1, modified: nowStr() });
    await refresh();
  };

  const parseBlocks = raw => { if (Array.isArray(raw)) return raw; try { return JSON.parse(raw || '[]'); } catch { return []; } };
  const curBlocks = cur ? parseBlocks(cur.blocks) : [];

  const saveBlocks = async (blocks) => {
    if (!cur) return;
    const preview = blocks.find(b => b.kind === 'p')?.text?.slice(0, 80) || '';
    setNotes(prev => prev.map(n => n.id === cur.id ? { ...n, blocks } : n));
    await updateNote(cur.id, { blocks: JSON.stringify(blocks), modified: nowStr(), preview });
  };

  const toggleCheck = async (block) => {
    await saveBlocks(curBlocks.map(b => b === block ? { ...b, checked: !b.checked } : b));
  };

  const deleteBlock = async (index) => {
    await saveBlocks(curBlocks.filter((_, i) => i !== index));
  };

  const updateBlock = async (index, newText) => {
    const newBlocks = curBlocks.map((b, i) => {
      if (i !== index) return b;
      if (b.kind === 'p' || b.kind === 'h2') return { ...b, text: newText };
      if (b.kind === 'list') return { ...b, items: newText.split('\n').filter(l => l.trim()) };
      if (b.kind === 'check') return { ...b, text: newText };
      return b;
    });
    await saveBlocks(newBlocks);
  };

  const openNoteById = (id) => { setMode('notes'); setSelectedNote(id); setMobileScreen('editor'); };

  const onNewLineChange = e => {
    const v = e.target.value;
    const cursor = e.target.selectionStart;
    setNewLine(v);
    const lineStart = v.lastIndexOf('\n', cursor - 1) + 1;
    const currentLine = v.slice(lineStart, cursor);
    if (currentLine.startsWith('/')) {
      const rect = newlineRef.current?.getBoundingClientRect();
      const editorRect = document.querySelector('.editor-body')?.getBoundingClientRect();
      if (rect && editorRect) setSlash({ left: rect.left - editorRect.left, top: rect.bottom - editorRect.top + 6, query: currentLine.slice(1) });
    } else { setSlash(null); }
  };

  const pickItem = async ({ type, item }) => {
    if (!cur) return;
    const block = type === 'file' ? { kind: 'file', fileId: item.id } : { kind: 'note', noteId: item.id, title: item.title };
    await saveBlocks([...curBlocks, block]);
    setSlash(null); setNewLine('');
    setTimeout(() => newlineRef.current?.focus(), 50);
  };

  const commitNewBlock = async (text) => {
    const t = (text ?? newLine).trim();
    if (!t) return;
    let block;
    if (pendingKind === 'list')       block = { kind: 'list',  items: [t] };
    else if (pendingKind === 'check') block = { kind: 'check', text: t, checked: false };
    else if (pendingKind === 'h2')    block = { kind: 'h2',    text: t };
    else                              block = { kind: 'p',     text: t };
    await saveBlocks([...curBlocks, block]);
    setNewLine('');
    if (pendingKind === 'h2') setPendingKind('p');
    if (newlineRef.current) { newlineRef.current.style.height = 'auto'; }
  };

  const onNewLineKey = async e => {
    if (slash) {
      if (e.key === 'Escape') { setSlash(null); setNewLine(''); }
      return;
    }
    if (e.key === 'Escape') { setSlash(null); setNewLine(''); setPendingKind('p'); return; }
    // p mode: Enter = newline in textarea; Ctrl/Cmd+Enter = commit block
    if (pendingKind === 'p') {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && newLine.trim()) {
        e.preventDefault();
        await commitNewBlock();
      }
      // plain Enter: textarea handles naturally (newline)
    } else {
      // h2 / list / check: Enter commits block
      if (e.key === 'Enter' && !e.shiftKey && newLine.trim()) {
        e.preventDefault();
        await commitNewBlock();
      }
    }
  };

  const onNewLinePaste = async e => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\n')) return; // single-line — let browser handle
    e.preventDefault();
    // Split by paragraph breaks (double newline) → each paragraph = one block
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    if (!paragraphs.length) return;
    const prefix = newLine.trim();
    const all = prefix ? [prefix + '\n' + paragraphs[0], ...paragraphs.slice(1)] : paragraphs;
    const newBlocks = all.map(p => {
      if (pendingKind === 'list')  return { kind: 'list',  items: p.split('\n').filter(Boolean) };
      if (pendingKind === 'check') return { kind: 'check', text: p, checked: false };
      if (pendingKind === 'h2')    return { kind: 'h2',    text: p };
      return { kind: 'p', text: p };
    });
    await saveBlocks([...curBlocks, ...newBlocks]);
    setNewLine('');
    if (newlineRef.current) { newlineRef.current.style.height = 'auto'; }
  };

  const onTitleChange = e => setNotes(prev => prev.map(n => n.id === cur.id ? { ...n, title: e.target.value } : n));
  const onTitleBlur  = async e => { if (!cur) return; await updateNote(cur.id, { title: e.target.value, modified: nowStr() }); };

  const openNote   = id => { setSelectedNote(id); setMobileScreen('editor'); };

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadError('');
    try {
      const { id, key } = await uploadFileProxy(file);
      const now = new Date();
      await createFileRecord({
        id, key,
        name: file.name,
        type: detectFileType(file.name),
        size: formatFileSize(file.size),
        folder: folder !== 'all' && folder !== 'recent' ? folder : 'f-docs',
        modified: `${now.getDate().toString().padStart(2,'0')}.${(now.getMonth()+1).toString().padStart(2,'0')}`,
      });
      await refresh();
    } catch (err) {
      setUploadError(err.message || 'Ошибка загрузки');
      setTimeout(() => setUploadError(''), 5000);
    } finally { setUploading(false); }
  };

  const handleDeleteFile = async (file) => {
    setFileMenuPos(null);
    if (!confirm(`Удалить «${file.name}»?`)) return;
    await deleteFileRecord(file.id);
    await refresh();
  };

  const handleDeleteFolder = async (f) => {
    if (!confirm(`Удалить папку «${f.name}»? Файлы в ней останутся.`)) return;
    await deleteFolder(f.id);
    if (folder === f.id) setFolder('all');
    await refresh();
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setSavingFolder(true);
    try {
      await createFolder({ name: newFolderName.trim(), icon: newFolderIcon, color: newFolderColor, kind: mode });
      await refresh();
      setShowNewFolder(false);
      setNewFolderName('');
      setNewFolderIcon('folder');
      setNewFolderColor('#7aa7ff');
    } finally { setSavingFolder(false); }
  };

  const handleMoveNote = async () => {
    if (!cur || !moveNoteFolderId) return;
    await updateNote(cur.id, { folder: moveNoteFolderId, modified: nowStr() });
    await refresh();
    setShowMoveNote(false);
  };

  const handleToggleQuickAccess = async (file) => {
    setFileMenuPos(null);
    await updateFileRecord(file.id, { quick_access: file.quick_access ? 0 : 1 });
    await refresh();
  };

  const openRename = (file) => {
    setFileMenuPos(null);
    setRenameFile(file);
    setRenameName(file.name);
  };

  const handleRename = async () => {
    if (!renameFile || !renameName.trim()) return;
    await updateFileRecord(renameFile.id, { name: renameName.trim() });
    await refresh();
    setRenameFile(null);
  };

  const renderFileMenu = (file) => (
    <button className="icon-btn file-menu-btn"
      style={{ width:26, height:26, flexShrink:0, opacity: fileMenuPos?.id === file.id ? 1 : undefined }}
      onClick={e => {
        e.stopPropagation();
        if (fileMenuPos?.id === file.id) { setFileMenuPos(null); return; }
        const r = e.currentTarget.getBoundingClientRect();
        setFileMenuPos({ id: file.id, top: r.bottom + 4, left: r.right - 168 });
      }}
      title="Действия">
      <Icon name="more" size={14} />
    </button>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — everything inlined as render-functions (NOT React components)
  // ══════════════════════════════════════════════════════════════════════════

  const renderFolderPane = () => (
    <aside className="storage-pane">
      <div className="storage-pane-head">
        <h3>Хранилище</h3>
        <button className="icon-btn" style={{ width:26, height:26 }} title="Новая папка"
          onClick={() => setShowNewFolder(true)}>
          <Icon name="plus" size={12} />
        </button>
      </div>
      <div className="mode-switch">
        <button className="mode-btn" data-on={mode==='notes'?'1':'0'} onClick={() => { setMode('notes'); setFolder('all'); }}>
          <Icon name="note" size={13} /> Заметки
        </button>
        <button className="mode-btn" data-on={mode==='files'?'1':'0'} onClick={() => { setMode('files'); setFolder('all'); }}>
          <Icon name="folder" size={13} /> Файлы
        </button>
      </div>
      <div className="storage-pane-body">
        <div className="folder-list">
          <button className="folder-item" data-active={folder==='all'?'1':'0'}
            onClick={() => { setFolder('all'); setMobileScreen('list'); }}>
            <span className="ic"><Icon name={mode==='notes'?'note':'storage'} size={14} /></span>
            <span>Все {mode==='notes'?'заметки':'файлы'}</span>
            <span className="cnt">{mode==='notes'?notes.length:FILES.length}</span>
          </button>
          {mode==='notes' && (
            <button className="folder-item" data-active={folder==='pinned'?'1':'0'}
              onClick={() => { setFolder('pinned'); setMobileScreen('list'); }}>
              <span className="ic"><Icon name="pin" size={14} /></span>
              <span>Закреплённые</span>
              <span className="cnt">{notes.filter(n=>n.pinned).length}</span>
            </button>
          )}
          {mode==='files' && (
            <button className="folder-item" data-active={folder==='recent'?'1':'0'}
              onClick={() => { setFolder('recent'); setMobileScreen('list'); }}>
              <span className="ic"><Icon name="star" size={14} /></span>
              <span>Недавние</span>
              <span className="cnt">{FILES.length}</span>
            </button>
          )}
          <div className="nav-group-label" style={{ padding:'14px 10px 4px' }}>Папки</div>
          {FOLDERS.map(f => (
            <div key={f.id} className="folder-item" data-active={folder===f.id?'1':'0'}
              style={{ display:'flex', alignItems:'center', gap:0, padding:0, overflow:'hidden' }}>
              <button style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
                background:'none', border:'none', cursor:'pointer', color:'inherit', textAlign:'left', minWidth:0 }}
                onClick={() => { setFolder(f.id); setMobileScreen('list'); }}>
                <span className="ic" style={{ color: folder===f.id ? f.color : undefined }}>
                  <Icon name={f.icon} size={14} />
                </span>
                <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</span>
                <span className="cnt">{folderCount(f.id)}</span>
              </button>
              {!DEFAULT_FOLDER_IDS.includes(f.id) && (
                <button className="icon-btn" style={{ width:24, height:24, flexShrink:0, opacity:0.4, marginRight:4 }}
                  title="Удалить папку"
                  onClick={e => { e.stopPropagation(); handleDeleteFolder(f); }}>
                  <Icon name="trash" size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="storage-stats">
        <div className="lbl">Использовано</div>
        <div className="bar"><div style={{ width:`${stats.pct}%`, transition:'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} /></div>
        <div className="row">
          <span>{stats.usedDisplay}</span>
          <span style={{ color:'var(--text-faint)' }}>из {stats.capDisplay}</span>
        </div>
      </div>
    </aside>
  );

  const renderNotesPane = () => (
    <aside className="storage-pane">
      <div className="storage-pane-head">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button className="icon-btn storage-back-btn" style={{ width:26, height:26 }}
            onClick={() => setMobileScreen('folders')}>
            <Icon name="arrow-left" size={14} />
          </button>
          <h3>{folder==='all'?'Все заметки':folder==='pinned'?'Закреплённые':FOLDERS.find(f=>f.id===folder)?.name||'Заметки'}</h3>
        </div>
        <span className="sub">{filteredNotes.length}</span>
      </div>
      <div className="notes-search">
        <div className="notes-search-input">
          <Icon name="search" size={13} />
          <input placeholder="Поиск…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="storage-pane-body" style={{ overflowAnchor: 'none' }}>
        {pinned.length > 0 && (
          <>
            <div className="note-section-label"><Icon name="pin" size={9} />&nbsp;Закреплённые</div>
            {pinned.map(n => (
              <button key={n.id} className="note-item" data-active={selectedNote===n.id?'1':'0'} onClick={() => openNote(n.id)}>
                <div className="nt-head">
                  <div className="nt-title"><Icon name="pin" size={10} style={{ flexShrink:0 }} />{n.title}</div>
                  <div className="nt-date">{fmtDate((n.modified||'').split(',')[0])}</div>
                </div>
                <div className="nt-preview">{n.preview}</div>
              </button>
            ))}
          </>
        )}
        {others.length > 0 && (
          <>
            {pinned.length > 0 && <div className="note-section-label">Прочее</div>}
            {others.map(n => (
              <button key={n.id} className="note-item" data-active={selectedNote===n.id?'1':'0'} onClick={() => openNote(n.id)}>
                <div className="nt-head">
                  <div className="nt-title">{n.title}</div>
                  <div className="nt-date">{fmtDate((n.modified||'').split(',')[0])}</div>
                </div>
                <div className="nt-preview">{n.preview}</div>
              </button>
            ))}
          </>
        )}
        {filteredNotes.length === 0 && (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-faint)', fontFamily:'var(--font-mono)', fontSize:11.5 }}>
            Заметок нет
          </div>
        )}
      </div>
      <div style={{ borderTop:'1px solid var(--border)', padding:12 }}>
        <div style={{ display:'flex', gap:8 }}>
          <input className="form-input"
            placeholder="Новая заметка…"
            value={newNoteTitle}
            onChange={e => setNewNoteTitle(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleCreateNote()}
            style={{ flex:1, fontSize:12.5 }} />
          <button className="btn primary" onClick={handleCreateNote} disabled={saving || !newNoteTitle.trim()}>
            <Icon name="plus" size={13} />
          </button>
        </div>
      </div>
    </aside>
  );

  const renderEditorPane = () => (
    <main className="storage-pane editor">
      {cur ? (
        <>
          <div className="editor-toolbar">
            <button className="icon-btn storage-back-btn" style={{ width:30, height:30 }}
              onClick={() => setMobileScreen('list')}>
              <Icon name="arrow-left" size={14} />
            </button>
            <button className="editor-tool" title="Заголовок H2"
              data-on={pendingKind==='h2'?'1':'0'} onClick={() => setPendingKind(k=>k==='h2'?'p':'h2')}
              style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:11 }}>H2</button>
            <span className="sep" />
            <button className="editor-tool" title="Список" data-on={pendingKind==='list'?'1':'0'}
              onClick={() => setPendingKind(k=>k==='list'?'p':'list')}>
              <Icon name="list" size={14} />
            </button>
            <button className="editor-tool" title="Чеклист" data-on={pendingKind==='check'?'1':'0'}
              onClick={() => setPendingKind(k=>k==='check'?'p':'check')}>
              <Icon name="check-square" size={14} />
            </button>
            <span className="sep" />
            <button className="editor-tool" title="Прикрепить файл или заметку (/)"
              onClick={() => {
                setNewLine('/');
                const rect = newlineRef.current?.getBoundingClientRect();
                const editorRect = document.querySelector('.editor-body')?.getBoundingClientRect();
                if (rect && editorRect) setSlash({ left: rect.left - editorRect.left, top: rect.bottom - editorRect.top + 6, query: '' });
                setTimeout(() => newlineRef.current?.focus(), 50);
              }}>
              <Icon name="paperclip" size={14} />
            </button>
            <span className="sep" />
            <button className="editor-tool" data-on={cur.pinned?'1':'0'} onClick={handleTogglePin}
              title={cur.pinned?'Открепить':'Закрепить'}>
              <Icon name="pin" size={14} />
            </button>
            <button className="editor-tool" onClick={() => { setMoveNoteFolderId(cur.folder || 'f-personal'); setShowMoveNote(true); }}
              title="Переместить в папку">
              <Icon name="folder" size={14} />
            </button>
            <div className="grow" />
            <div className="editor-meta">
              <span>{cur.modified}</span><span>·</span><span>{curBlocks.length} блоков</span>
            </div>
            <span className="sep" />
            <button className="editor-tool" onClick={() => handleDeleteNote(cur.id)}
              style={{ color:'var(--red)' }} title="Удалить заметку">
              <Icon name="trash" size={14} />
            </button>
          </div>
          <div className="editor-body" style={{ position:'relative' }}>
            <input className="editor-title" value={cur.title}
              onChange={onTitleChange} onBlur={onTitleBlur} placeholder="Заголовок…" />
            <div className="editor-subtitle">
              Изменено: {cur.modified} · {NOTE_FOLDERS.find(f=>f.id===cur.folder)?.name||'Личное'}
            </div>
            {curBlocks.map((b, i) => (
              <NoteBlock key={i} block={b}
                onOpenFile={setPreviewFile}
                onToggleCheck={toggleCheck}
                onOpenNote={openNoteById}
                onDelete={() => deleteBlock(i)}
                onUpdate={text => updateBlock(i, text)} />
            ))}
            <div className="editor-newline" style={{ position:'relative' }} ref={newlineRef}>
              <textarea value={newLine} onChange={onNewLineChange} onKeyDown={onNewLineKey} onPaste={onNewLinePaste}
                rows={1}
                placeholder={
                  pendingKind==='list'  ? 'Пункт списка… (Enter — добавить)'     :
                  pendingKind==='check' ? 'Элемент чеклиста… (Enter — добавить)' :
                  pendingKind==='h2'    ? 'Заголовок… (Enter — добавить)'        :
                  'Введите текст… (Ctrl+Enter — добавить блок)'
                }
                style={{ flex:1, background:'transparent', border:0, outline:0, color:'var(--text)', fontSize:14.5, fontFamily:'var(--font-ui)', width:'100%', resize:'none', overflow:'hidden', lineHeight:1.65, padding:0, verticalAlign:'bottom', display:'block' }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} />
              {!newLine && <span className="hint">/</span>}
            </div>
            {slash && (
              <SlashMenu query={slash.query} position={{ left:slash.left, top:slash.top }}
                onPick={pickItem} onClose={() => { setSlash(null); setNewLine(''); }} />
            )}
          </div>
        </>
      ) : (
        <div style={{ flex:1, display:'grid', placeItems:'center', color:'var(--text-faint)', fontFamily:'var(--font-mono)', fontSize:12 }}>
          Выберите заметку или создайте новую
        </div>
      )}
    </main>
  );

  const renderFilesPane = () => (
    <main className="storage-pane" style={{ gridColumn:'span 2' }}>
      <input ref={fileInputRef} type="file" style={{ display:'none' }} onChange={handleFileSelect} />
      <div className="files-toolbar">
        <button className="icon-btn storage-back-btn" style={{ width:26, height:26 }}
          onClick={() => setMobileScreen('folders')}>
          <Icon name="arrow-left" size={14} />
        </button>
        <div className="files-breadcrumb">
          <span className="crumb" onClick={() => setFolder('all')}>Хранилище</span>
          {folder !== 'all' && folder !== 'recent' && (
            <><span className="sep">/</span><span>{FOLDERS.find(f=>f.id===folder)?.name||'Папка'}</span></>
          )}
        </div>
        <div style={{ flex:1 }} />
        {uploadError && (
          <span style={{ fontSize:11.5, color:'var(--red)', fontFamily:'var(--font-mono)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{uploadError}</span>
        )}
        <div className="view-switch">
          <button className="view-btn" data-on={viewMode==='grid'?'1':'0'} onClick={() => setViewMode('grid')}><Icon name="grid" size={13} /></button>
          <button className="view-btn" data-on={viewMode==='list'?'1':'0'} onClick={() => setViewMode('list')}><Icon name="rows" size={13} /></button>
        </div>
        <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Icon name="upload" size={13} /> {uploading ? 'Загрузка…' : 'Загрузить'}
        </button>
      </div>
      <div className="files-body">
        {viewMode === 'grid' ? (
          <>
            {folder === 'all' && (
              <>
                <div className="section-title" style={{ margin:'0 0 12px' }}>Папки</div>
                <div className="files-grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', marginBottom:26 }}>
                  {FOLDERS.map(f => (
                    <div key={f.id} className="file-card" onClick={() => setFolder(f.id)}>
                      <div className="file-thumb" style={{ aspectRatio:'16/7', color:f.color }}>
                        <Icon name="folder" size={36} stroke={1.2} />
                      </div>
                      <div className="file-meta">
                        <div className="file-name">{f.name}</div>
                        <div className="file-sub"><span>{folderCount(f.id)} файлов</span></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="section-title" style={{ margin:'0 0 12px' }}>Файлы</div>
              </>
            )}
            <div className="files-grid">
              {filteredFiles.map(f => (
                <div key={f.id} className="file-card" onClick={() => { if (fileMenuPos?.id === f.id) return; setPreviewFile(f); }} style={{ position:'relative' }}>
                  <div className={`file-thumb ${f.type}`}>
                    {f.type === 'image' && f.key && (
                      <img src={getDownloadUrl(f.key, true)} alt=""
                        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0 }}
                        onError={e => { e.target.style.display='none'; }} />
                    )}
                    <Icon name={fileIconName(f.type)} size={32} stroke={1.2} style={{ position:'relative', zIndex:1 }} />
                    <span className="badge">{fileTypeLabel(f.type)}</span>
                    {f.demo && <span className="badge" style={{ right:'auto', left:8, background:'rgba(255,180,94,0.15)', color:'var(--orange)', borderColor:'rgba(255,180,94,0.25)' }}>demo</span>}
                    {!!f.quick_access && <span className="badge" style={{ right:'auto', left: f.demo ? 52 : 8, background:'rgba(212,255,77,0.12)', color:'var(--accent)', borderColor:'rgba(212,255,77,0.25)' }}>★</span>}
                  </div>
                  <div className="file-meta" style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="file-name">{f.name}</div>
                      <div className="file-sub"><span>{f.size}</span><span>· {fmtDate(f.modified)}</span></div>
                    </div>
                    {renderFileMenu(f)}
                  </div>
                </div>
              ))}
            </div>
            {filteredFiles.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-faint)', fontFamily:'var(--font-mono)', fontSize:12 }}>
                <div style={{ marginBottom:12 }}>Файлов нет</div>
                <button className="btn" onClick={() => fileInputRef.current?.click()}>
                  <Icon name="upload" size={13} /> Загрузить первый файл
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="files-list">
              <div className="file-row head"><div>Название</div><div>Тип</div><div>Изменён</div><div>Размер</div><div /></div>
              {filteredFiles.map(f => (
                <div key={f.id} className="file-row" onClick={() => { if (fileMenuPos?.id === f.id) return; setPreviewFile(f); }}>
                  <div className="name-cell">
                    <span className={`ic ${f.type}`}><Icon name={fileIconName(f.type)} size={15} /></span>
                    <div style={{ minWidth:0 }}>
                      <div className="name">{f.name}{!!f.quick_access && <span style={{ marginLeft:5, color:'var(--accent)', fontSize:11 }}>★</span>}</div>
                      <div className="sub">{FOLDERS.find(fo=>fo.id===f.folder)?.name}{f.demo && ' · demo'}</div>
                    </div>
                  </div>
                  <div className="cell-mono">{fileTypeLabel(f.type)}</div>
                  <div className="cell-mono">{fmtDate(f.modified)}</div>
                  <div className="cell-mono">{f.size}</div>
                  <div>{renderFileMenu(f)}</div>
                </div>
              ))}
            </div>
            {filteredFiles.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-faint)', fontFamily:'var(--font-mono)', fontSize:12 }}>Файлов нет</div>
            )}
          </>
        )}
      </div>
    </main>
  );

  const FOLDER_ICONS = ['folder','briefcase','home','file','star','note','archive','users','calendar','chart'];
  const FOLDER_COLORS = ['#b78cff','#d4ff4d','#7aa7ff','#ffb45e','#ff6b7a','#5ee5a0','#4ad7d1','#ffffff'];

  return (
    <div className="storage" data-mobile-screen={mobileScreen}>
      {/* Move note to folder modal */}
      {showMoveNote && cur && (
        <Modal title="Переместить заметку"
          onClose={() => setShowMoveNote(false)}
          onConfirm={handleMoveNote}
          confirmLabel="Переместить"
          confirmDisabled={!moveNoteFolderId || moveNoteFolderId === cur.folder}>
          <Field label="Папка">
            <FSelect value={moveNoteFolderId} onChange={e => setMoveNoteFolderId(e.target.value)}>
              {NOTE_FOLDERS.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </FSelect>
          </Field>
          <div style={{ fontSize:12, color:'var(--text-faint)', marginTop:8, fontFamily:'var(--font-mono)' }}>
            Сейчас: {NOTE_FOLDERS.find(f => f.id === cur.folder)?.name || 'Личное'}
          </div>
        </Modal>
      )}

      {/* Create folder modal */}
      {showNewFolder && (
        <Modal title="Новая папка"
          onClose={() => { setShowNewFolder(false); setNewFolderName(''); }}
          onConfirm={handleCreateFolder}
          confirmLabel={savingFolder ? 'Создание…' : 'Создать'}
          confirmDisabled={savingFolder || !newFolderName.trim()}>
          <Field label="Название">
            <FInput autoFocus placeholder="Название папки…" value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
          </Field>
          <Field label="Иконка">
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {FOLDER_ICONS.map(ic => (
                <button key={ic} onClick={() => setNewFolderIcon(ic)}
                  style={{ width:36, height:36, borderRadius:8, border:`1.5px solid ${newFolderIcon===ic ? newFolderColor : 'var(--border)'}`,
                    background: newFolderIcon===ic ? `${newFolderColor}22` : 'var(--surface-2)',
                    display:'grid', placeItems:'center', cursor:'pointer', color: newFolderIcon===ic ? newFolderColor : 'var(--text-dim)' }}>
                  <Icon name={ic} size={15} />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Цвет">
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {FOLDER_COLORS.map(c => (
                <button key={c} onClick={() => setNewFolderColor(c)}
                  style={{ width:28, height:28, borderRadius:'50%', background:c,
                    border: newFolderColor===c ? '2px solid var(--text)' : '2px solid transparent',
                    cursor:'pointer', outline: newFolderColor===c ? '2px solid var(--bg)' : 'none',
                    outlineOffset:-4 }} />
              ))}
            </div>
          </Field>
        </Modal>
      )}

      {renderFolderPane()}
      {mode === 'notes' ? (
        <>
          {renderNotesPane()}
          {renderEditorPane()}
        </>
      ) : (
        renderFilesPane()
      )}
      {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}

      {fileMenuPos && (() => {
        const f = FILES.find(x => x.id === fileMenuPos.id);
        if (!f) return null;
        return (
          <div ref={fileMenuRef} style={{ position:'fixed', top: fileMenuPos.top, left: fileMenuPos.left, zIndex:300 }}
            onClick={e => e.stopPropagation()}>
            <div className="file-dropdown" style={{ position:'static' }}>
              <button className="file-dropdown-item" onClick={() => openRename(f)}>
                <Icon name="edit" size={13} /> Переименовать
              </button>
              <button className="file-dropdown-item" onClick={() => handleToggleQuickAccess(f)}
                style={{ color: f.quick_access ? 'var(--accent)' : undefined }}>
                <span style={{ fontSize:13, lineHeight:1 }}>{f.quick_access ? '★' : '☆'}</span>
                {f.quick_access ? 'Убрать из быстрого доступа' : 'Быстрый доступ'}
              </button>
              {!f.demo && (
                <button className="file-dropdown-item danger" onClick={() => handleDeleteFile(f)}>
                  <Icon name="trash" size={13} /> Удалить
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {renameFile && (
        <Modal title="Переименовать файл"
          onClose={() => setRenameFile(null)}
          onConfirm={handleRename}
          confirmLabel="Сохранить"
          confirmDisabled={!renameName.trim() || renameName.trim() === renameFile.name}>
          <Field label="Новое название">
            <FInput autoFocus value={renameName} onChange={e => setRenameName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()} placeholder="Название файла…" />
          </Field>
        </Modal>
      )}
    </div>
  );
};

window.StoragePage = StoragePage;
