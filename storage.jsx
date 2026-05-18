// 7on OS — Storage page (Notes + Files)
const StoragePage = ({ D, refresh }) => {
  const [mode, setMode] = React.useState('notes');
  const [folder, setFolder] = React.useState('all');
  const [selectedNote, setSelectedNote] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [previewFile, setPreviewFile] = React.useState(null);
  const [viewMode, setViewMode] = React.useState('grid');
  // Mobile navigation: 'folders' | 'list' | 'editor'
  const [mobileScreen, setMobileScreen] = React.useState('folders');

  const [notes, setNotes] = React.useState(D.NOTES || []);
  const [saving, setSaving] = React.useState(false);
  const [newNoteTitle, setNewNoteTitle] = React.useState('');

  const [slash, setSlash] = React.useState(null);
  const [newLine, setNewLine] = React.useState('');
  const newlineRef = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => { setNotes(D.NOTES || []); }, [D.NOTES]);

  // Select first note on load
  React.useEffect(() => {
    if (!selectedNote && notes.length > 0) setSelectedNote(notes[0].id);
  }, [notes]);

  const FOLDERS = D.FOLDERS || [];
  const FILES   = D.FILES   || [];

  const filteredNotes = React.useMemo(() => {
    let ns = notes;
    if (folder === 'pinned') return ns.filter(n => n.pinned);
    if (folder !== 'all') ns = ns.filter(n => n.folder === folder);
    if (search) {
      const q = search.toLowerCase();
      ns = ns.filter(n => n.title.toLowerCase().includes(q) || (n.preview || '').toLowerCase().includes(q));
    }
    return ns;
  }, [notes, folder, search]);

  const filteredFiles = React.useMemo(() => {
    if (folder === 'all' || folder === 'recent') return FILES;
    return FILES.filter(f => f.folder === folder);
  }, [folder, FILES]);

  const cur = notes.find(n => n.id === selectedNote);
  const pinned = filteredNotes.filter(n => n.pinned);
  const others  = filteredNotes.filter(n => !n.pinned);

  const folderCount = id => mode === 'notes'
    ? notes.filter(n => n.folder === id).length
    : FILES.filter(f => f.folder === id).length;

  const totalUsed = 18.4; const totalCap = 100;

  // ── Note CRUD ──────────────────────────────────────────────────────────────
  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return;
    setSaving(true);
    try {
      const now = new Date();
      const modified = `${now.getDate().toString().padStart(2,'0')}.${(now.getMonth()+1).toString().padStart(2,'0')}, ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
      await createNote({
        title: newNoteTitle.trim(),
        folder: folder !== 'all' && folder !== 'pinned' ? folder : 'f-personal',
        pinned: false,
        modified,
        preview: '',
        blocks: '[]',
      });
      await refresh();
      setNewNoteTitle('');
    } finally { setSaving(false); }
  };

  const handleSaveNote = async (noteId, updates) => {
    await updateNote(noteId, updates);
    await refresh();
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Удалить заметку?')) return;
    await deleteNote(noteId);
    await refresh();
    setSelectedNote(null);
  };

  const handleTogglePin = async () => {
    if (!cur) return;
    const now = new Date();
    const modified = `${now.getDate().toString().padStart(2,'0')}.${(now.getMonth()+1).toString().padStart(2,'0')}, ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    await handleSaveNote(cur.id, { pinned: cur.pinned ? 0 : 1, modified });
  };

  const parseBlocks = (raw) => {
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw || '[]'); } catch { return []; }
  };

  const curBlocks = cur ? parseBlocks(cur.blocks) : [];

  const toggleCheck = async (block) => {
    if (!cur) return;
    const blocks = curBlocks.map(b => b === block ? { ...b, checked: !b.checked } : b);
    setNotes(prev => prev.map(n => n.id === cur.id ? { ...n, blocks } : n));
    await updateNote(cur.id, { blocks: JSON.stringify(blocks) });
  };

  const onNewLineChange = e => {
    const v = e.target.value;
    setNewLine(v);
    if (v.startsWith('/')) {
      const rect = newlineRef.current?.getBoundingClientRect();
      const editorRect = document.querySelector('.editor-body')?.getBoundingClientRect();
      if (rect && editorRect) {
        setSlash({ left: rect.left - editorRect.left, top: rect.bottom - editorRect.top + 6, query: v.slice(1) });
      }
    } else { setSlash(null); }
  };

  const pickFile = async file => {
    if (!cur) return;
    const blocks = [...curBlocks, { kind: 'file', fileId: file.id }];
    setNotes(prev => prev.map(n => n.id === cur.id ? { ...n, blocks } : n));
    await updateNote(cur.id, { blocks: JSON.stringify(blocks) });
    setSlash(null); setNewLine('');
    setTimeout(() => newlineRef.current?.focus(), 50);
  };

  const onNewLineKey = async e => {
    if (e.key === 'Enter' && !slash && newLine.trim()) {
      const blocks = [...curBlocks, { kind: 'p', text: newLine }];
      setNotes(prev => prev.map(n => n.id === cur.id ? { ...n, blocks } : n));
      await updateNote(cur.id, { blocks: JSON.stringify(blocks) });
      setNewLine('');
    }
  };

  const onTitleChange = async e => {
    const title = e.target.value;
    setNotes(prev => prev.map(n => n.id === cur.id ? { ...n, title } : n));
  };
  const onTitleBlur = async e => {
    if (!cur) return;
    await updateNote(cur.id, { title: e.target.value });
  };

  const openNote = id => {
    setSelectedNote(id);
    setMobileScreen('editor');
  };

  const openFolder = id => {
    setFolder(id);
    setMobileScreen('list');
  };

  // ── Folder pane ────────────────────────────────────────────────────────────
  const FolderPane = () => (
    <aside className="storage-pane">
      <div className="storage-pane-head">
        <h3>Хранилище</h3>
        <button className="icon-btn" style={{ width:26, height:26 }} onClick={() => { setMode('notes'); setFolder('all'); setMobileScreen('list'); }}>
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
            <button key={f.id} className="folder-item" data-active={folder===f.id?'1':'0'}
              onClick={() => { setFolder(f.id); setMobileScreen('list'); }}>
              <span className="ic" style={{ color: folder===f.id ? f.color : undefined }}>
                <Icon name={f.icon} size={14} />
              </span>
              <span>{f.name}</span>
              <span className="cnt">{folderCount(f.id)}</span>
            </button>
          ))}
          <button className="folder-item">
            <span className="ic"><Icon name="trash" size={14} /></span>
            <span>Корзина</span>
            <span className="cnt">0</span>
          </button>
        </div>
      </div>
      <div className="storage-stats">
        <div className="lbl">Использовано</div>
        <div className="bar"><div style={{ width:`${(totalUsed/totalCap)*100}%` }} /></div>
        <div className="row">
          <span>{totalUsed} ГБ</span>
          <span style={{ color:'var(--text-faint)' }}>из {totalCap} ГБ</span>
        </div>
      </div>
    </aside>
  );

  // ── Notes list pane ────────────────────────────────────────────────────────
  const NotesPane = () => (
    <aside className="storage-pane">
      <div className="storage-pane-head">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button className="icon-btn storage-back-btn" style={{ width:26, height:26 }}
            onClick={() => setMobileScreen('folders')}>
            <Icon name="arrow-left" size={14} />
          </button>
          <h3>{folder==='all'?'Все заметки':folder==='pinned'?'Закреплённые':FOLDERS.find(f=>f.id===folder)?.name || 'Заметки'}</h3>
        </div>
        <span className="sub">{filteredNotes.length}</span>
      </div>
      <div className="notes-search">
        <div className="notes-search-input">
          <Icon name="search" size={13} />
          <input placeholder="Поиск по заметкам…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="storage-pane-body">
        {pinned.length > 0 && (
          <>
            <div className="note-section-label"><Icon name="pin" size={9} />&nbsp;Закреплённые</div>
            {pinned.map(n => (
              <button key={n.id} className="note-item" data-active={selectedNote===n.id?'1':'0'} onClick={() => openNote(n.id)}>
                <div className="nt-head">
                  <div className="nt-title"><Icon name="pin" size={10} />{n.title}</div>
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
          <input className="form-input" placeholder="Название новой заметки…" value={newNoteTitle}
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

  // ── Editor pane ────────────────────────────────────────────────────────────
  const EditorPane = () => (
    <main className="storage-pane editor">
      {cur ? (
        <>
          <div className="editor-toolbar">
            <button className="icon-btn storage-back-btn" style={{ width:30, height:30 }}
              onClick={() => setMobileScreen('list')}>
              <Icon name="arrow-left" size={14} />
            </button>
            <button className="editor-tool"><Icon name="bold" size={14} /></button>
            <button className="editor-tool"><Icon name="italic" size={14} /></button>
            <span className="sep" />
            <button className="editor-tool"><Icon name="list" size={14} /></button>
            <button className="editor-tool"><Icon name="check-square" size={14} /></button>
            <span className="sep" />
            <button className="editor-tool" title="/"><Icon name="paperclip" size={14} /></button>
            <span className="sep" />
            <button className="editor-tool" data-on={cur.pinned?'1':'0'} onClick={handleTogglePin}><Icon name="pin" size={14} /></button>
            <div className="grow" />
            <div className="editor-meta">
              <span>{cur.modified}</span>
              <span>·</span>
              <span>{curBlocks.length} блоков</span>
            </div>
            <span className="sep" />
            <button className="editor-tool" onClick={() => handleDeleteNote(cur.id)} style={{ color:'var(--red)' }}>
              <Icon name="trash" size={14} />
            </button>
          </div>
          <div className="editor-body" style={{ position:'relative' }}>
            <input ref={inputRef} className="editor-title" value={cur.title}
              onChange={onTitleChange} onBlur={onTitleBlur} placeholder="Заголовок…" />
            <div className="editor-subtitle">
              Изменено: {cur.modified} · {FOLDERS.find(f=>f.id===cur.folder)?.name || 'Личное'}
            </div>
            {curBlocks.map((b, i) => (
              <NoteBlock key={i} block={b} onOpenFile={setPreviewFile} onToggleCheck={toggleCheck} />
            ))}
            <div className="editor-newline" style={{ position:'relative' }} ref={newlineRef}>
              <input type="text" value={newLine} onChange={onNewLineChange} onKeyDown={onNewLineKey}
                placeholder="Введите текст или «/» для файла"
                style={{ flex:1, background:'transparent', border:0, outline:0, color:'var(--text)', fontSize:14.5, fontFamily:'var(--font-ui)' }} />
              {!newLine && <span className="hint">/</span>}
            </div>
            {slash && (
              <SlashMenu query={slash.query} position={{ left:slash.left, top:slash.top }}
                onPick={pickFile} onClose={() => { setSlash(null); setNewLine(''); }} />
            )}
          </div>
        </>
      ) : (
        <div style={{ flex:1, display:'grid', placeItems:'center', color:'var(--text-faint)', fontFamily:'var(--font-mono)', fontSize:12 }}>
          Выберите заметку
        </div>
      )}
    </main>
  );

  // ── Files pane ─────────────────────────────────────────────────────────────
  const FilesPane = () => (
    <main className="storage-pane" style={{ gridColumn:'span 2' }}>
      <div className="files-toolbar">
        <div className="files-breadcrumb">
          <span className="crumb" onClick={() => setFolder('all')}>Хранилище</span>
          {folder !== 'all' && folder !== 'recent' && (
            <><span className="sep">/</span><span>{FOLDERS.find(f=>f.id===folder)?.name||'Папка'}</span></>
          )}
        </div>
        <div style={{ flex:1 }} />
        <div className="view-switch">
          <button className="view-btn" data-on={viewMode==='grid'?'1':'0'} onClick={() => setViewMode('grid')}><Icon name="grid" size={13} /></button>
          <button className="view-btn" data-on={viewMode==='list'?'1':'0'} onClick={() => setViewMode('list')}><Icon name="rows" size={13} /></button>
        </div>
        <button className="btn"><Icon name="upload" size={13} /> Загрузить</button>
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
                <div key={f.id} className="file-card" onClick={() => setPreviewFile(f)}>
                  <div className={`file-thumb ${f.type}`}>
                    <Icon name={fileIconName(f.type)} size={32} stroke={1.2} />
                    <span className="badge">{fileTypeLabel(f.type)}</span>
                  </div>
                  <div className="file-meta">
                    <div className="file-name">{f.name}</div>
                    <div className="file-sub"><span>{f.size}</span><span>· {fmtDate(f.modified)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="files-list">
            <div className="file-row head"><div>Название</div><div>Тип</div><div>Изменён</div><div>Размер</div><div></div></div>
            {filteredFiles.map(f => (
              <div key={f.id} className="file-row" onClick={() => setPreviewFile(f)}>
                <div className="name-cell">
                  <span className={`ic ${f.type}`}><Icon name={fileIconName(f.type)} size={15} /></span>
                  <div style={{ minWidth:0 }}>
                    <div className="name">{f.name}</div>
                    <div className="sub">{FOLDERS.find(fo=>fo.id===f.folder)?.name}</div>
                  </div>
                </div>
                <div className="cell-mono">{fileTypeLabel(f.type)}</div>
                <div className="cell-mono">{fmtDate(f.modified)}</div>
                <div className="cell-mono">{f.size}</div>
                <div style={{ color:'var(--text-faint)' }}><Icon name="more" size={14} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );

  return (
    <div className="storage" data-mobile-screen={mobileScreen}>
      <FolderPane />
      {mode === 'notes' ? (
        <>
          <NotesPane />
          <EditorPane />
        </>
      ) : (
        <FilesPane />
      )}
      {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
};

window.StoragePage = StoragePage;
