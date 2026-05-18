// 7on OS — Storage blocks (FilePill, NotePill, NoteBlock, SlashMenu, FilePreview)
const { useMemo: _useMemo, useState: _useState, useEffect: _useEffect, useRef: _useRef } = React;

const fileTypeLabel = (t) => ({ pdf:'PDF', image:'IMG', doc:'DOC', sheet:'XLS', zip:'ZIP', md:'MD' }[t] || 'FILE');
const fileIconName  = (t) => ({ pdf:'pdf', image:'image', doc:'file', sheet:'file', zip:'file', md:'file' }[t] || 'file');

// ── File pill (inline in notes) ──────────────────────────────────────────────
const FilePill = ({ fileId, onOpen, onDelete }) => {
  const file = (window.SEVEN_DATA.FILES || []).find(f => f.id === fileId);
  if (!file) return null;
  return (
    <div className="block block-pill-wrap">
      <button className="block-file" onClick={e => { e.stopPropagation(); onOpen && onOpen(file); }}>
        <span className={`file-icon ${file.type}`}><Icon name={fileIconName(file.type)} size={18} /></span>
        <span className="file-info">
          <span className="file-name">{file.name}</span>
          <span className="file-sub">
            <span>{fileTypeLabel(file.type)}</span><span>· {file.size}</span><span>· {fmtDate(file.modified)}</span>
          </span>
        </span>
        <span className="file-go"><Icon name="arrow-right" size={14} /></span>
      </button>
      {onDelete && (
        <button className="block-del" onClick={e => { e.stopPropagation(); onDelete(); }} title="Удалить">
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
};

// ── Note pill (inline reference to another note) ─────────────────────────────
const NotePill = ({ noteId, title, onOpen, onDelete }) => {
  const note = (window.SEVEN_DATA.NOTES || []).find(n => n.id === noteId);
  const displayTitle = note?.title || title || 'Заметка';
  return (
    <div className="block block-pill-wrap">
      <button className="block-file block-note-ref" onClick={e => { e.stopPropagation(); onOpen && onOpen(noteId); }}>
        <span className="file-icon note-ref"><Icon name="note" size={18} /></span>
        <span className="file-info">
          <span className="file-name">{displayTitle}</span>
          <span className="file-sub">
            <span>Заметка</span>
            {note?.preview && <span>· {note.preview.slice(0, 60)}</span>}
          </span>
        </span>
        <span className="file-go"><Icon name="arrow-right" size={14} /></span>
      </button>
      {onDelete && (
        <button className="block-del" onClick={e => { e.stopPropagation(); onDelete(); }} title="Удалить">
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
};

// ── Note block renderer ──────────────────────────────────────────────────────
const NoteBlock = ({ block, onOpenFile, onToggleCheck, onOpenNote, onDelete }) => {
  switch (block.kind) {
    case 'h2':
      return (
        <div className="block block-h2-wrap">
          <div className="block-h2">{block.text}</div>
          {onDelete && <button className="block-del" onClick={onDelete}><Icon name="x" size={11} /></button>}
        </div>
      );
    case 'p':
      return (
        <div className="block block-p-wrap">
          <div className="block-p">{block.text}</div>
          {onDelete && <button className="block-del" onClick={onDelete}><Icon name="x" size={11} /></button>}
        </div>
      );
    case 'list':
      return (
        <div className="block block-list-wrap">
          <ul className="block-list">
            {(block.items || []).map((it, i) => <li key={i}>{it}</li>)}
          </ul>
          {onDelete && <button className="block-del" onClick={onDelete}><Icon name="x" size={11} /></button>}
        </div>
      );
    case 'check':
      return (
        <div className="block block-check-wrap">
          <div className="block-check" data-done={block.checked ? '1' : '0'} onClick={() => onToggleCheck && onToggleCheck(block)}>
            <span className="chk" />
            <span className="txt">{block.text}</span>
          </div>
          {onDelete && <button className="block-del" onClick={onDelete}><Icon name="x" size={11} /></button>}
        </div>
      );
    case 'file':
      return <FilePill fileId={block.fileId} onOpen={onOpenFile} onDelete={onDelete} />;
    case 'note':
      return <NotePill noteId={block.noteId} title={block.title} onOpen={onOpenNote} onDelete={onDelete} />;
    default:
      return null;
  }
};

// ── Slash menu (file + note picker) ─────────────────────────────────────────
const SlashMenu = ({ query, onPick, onClose, position }) => {
  const files = (window.SEVEN_DATA && window.SEVEN_DATA.FILES) || [];
  const notes = (window.SEVEN_DATA && window.SEVEN_DATA.NOTES) || [];
  const q = (query || '').toLowerCase();

  const filteredFiles = _useMemo(() => {
    if (!q) return files.slice(0, 5);
    return files.filter(f => f.name.toLowerCase().includes(q)).slice(0, 5);
  }, [q]);

  const filteredNotes = _useMemo(() => {
    if (!q) return notes.slice(0, 4);
    return notes.filter(n => n.title.toLowerCase().includes(q)).slice(0, 4);
  }, [q]);

  const allItems = [
    ...filteredFiles.map(f => ({ type: 'file', item: f })),
    ...filteredNotes.map(n => ({ type: 'note', item: n })),
  ];

  const [active, setActive] = _useState(0);
  _useEffect(() => { setActive(0); }, [query]);
  _useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowDown')  { e.preventDefault(); setActive(a => Math.min(allItems.length - 1, a + 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
      else if (e.key === 'Enter')     { e.preventDefault(); if (allItems[active]) onPick(allItems[active]); }
      else if (e.key === 'Escape')    { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allItems, active]);

  if (allItems.length === 0) return (
    <div className="slash-menu" style={{ left: position?.left || 0, top: position?.top || 40 }}>
      <div style={{ padding:'12px 14px', fontSize:12.5, color:'var(--text-faint)', fontFamily:'var(--font-mono)' }}>Ничего не найдено</div>
    </div>
  );

  let globalIdx = 0;
  const renderItem = (type, item) => {
    const idx = globalIdx++;
    const isFile = type === 'file';
    return (
      <button key={item.id} className="slash-item" data-active={idx === active ? '1' : '0'}
        onClick={() => onPick({ type, item })} onMouseEnter={() => setActive(idx)}>
        <span className={isFile ? `ic ${item.type}` : 'ic note-ref'}>
          <Icon name={isFile ? fileIconName(item.type) : 'note'} size={16} />
        </span>
        <span className="label">
          <span className="name">{isFile ? item.name : item.title}</span>
          <span className="desc">{isFile ? `${fileTypeLabel(item.type)} · ${item.size} · ${fmtDate(item.modified)}` : `Заметка${item.preview ? ' · ' + item.preview.slice(0,40) : ''}`}</span>
        </span>
        {idx === active && <span className="kbd">↵</span>}
      </button>
    );
  };

  return (
    <div className="slash-menu" style={{ left: position?.left || 0, top: position?.top || 40 }}>
      {filteredFiles.length > 0 && (
        <>
          <div className="slash-section">Файлы {q && `— «${q}»`}</div>
          {filteredFiles.map(f => renderItem('file', f))}
        </>
      )}
      {filteredNotes.length > 0 && (
        <>
          <div className="slash-section">Заметки {q && !filteredFiles.length && `— «${q}»`}</div>
          {filteredNotes.map(n => renderItem('note', n))}
        </>
      )}
      <div style={{ borderTop:'1px solid var(--border)', marginTop:4, padding:'6px 12px', display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-faint)' }}>
        <span>↑↓ выбрать</span><span>↵ вставить · Esc отмена</span>
      </div>
    </div>
  );
};

// ── File preview modal ───────────────────────────────────────────────────────
const FilePreview = ({ file, onClose }) => {
  if (!file) return null;

  _useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openOrDownload = (download = false) => {
    if (!file.key) {
      alert('Этот файл является демо-данными и недоступен для скачивания.\nЗагрузите настоящий файл через кнопку «Загрузить».');
      return;
    }
    const url = getDownloadUrl(file.key, !download);
    if (download) {
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.target = '_blank';
      a.click();
    } else {
      window.open(url, '_blank');
    }
  };

  const mockBody = () => {
    if (file.type === 'image' && file.key) {
      return (
        <img src={getDownloadUrl(file.key, true)} alt={file.name}
          style={{ maxWidth:'100%', maxHeight:'60vh', borderRadius:8, objectFit:'contain', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}
          onError={e => { e.target.replaceWith(Object.assign(document.createElement('div'), { className: 'preview-image-mock' })); }} />
      );
    }
    if (file.type === 'pdf' && file.key) {
      return (
        <iframe src={getDownloadUrl(file.key, true)} title={file.name}
          style={{ width:'100%', height:'56vh', border:'none', borderRadius:4 }} />
      );
    }
    if (file.type === 'image') return <div className="preview-image-mock" />;
    return (
      <div className="preview-mock">
        <h1>{file.name.replace(/\.[^.]+$/, '')}</h1>
        {['mid','full','short','gap','full','mid','full','short','gap','mid','full'].map((cls, i) =>
          cls === 'gap' ? <div key={i} className="gap" /> : <div key={i} className={`line ${cls}`} />
        )}
      </div>
    );
  };

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-card" onClick={e => e.stopPropagation()}>
        <div className="preview-head">
          <span className={`icon-box ${file.type}`}><Icon name={fileIconName(file.type)} size={22} /></span>
          <div className="info">
            <div className="name">{file.name}</div>
            <div className="sub">
              <span>{fileTypeLabel(file.type)}</span>
              <span>· {file.size}</span>
              <span>· {fmtDate(file.modified)}</span>
              {file.demo && <span style={{ color:'var(--orange)' }}>· demo</span>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="preview-body">{mockBody()}</div>
        <div className="preview-actions">
          <button className="btn ghost" onClick={onClose}>Закрыть</button>
          {file.key && (
            <button className="btn" onClick={() => openOrDownload(false)}>
              <Icon name="link" size={13} /> Открыть
            </button>
          )}
          <button className="btn primary" onClick={() => openOrDownload(true)} disabled={!file.key}>
            <Icon name="download" size={13} /> Скачать
          </button>
        </div>
      </div>
    </div>
  );
};

window.FilePill = FilePill;
window.NotePill = NotePill;
window.NoteBlock = NoteBlock;
window.SlashMenu = SlashMenu;
window.FilePreview = FilePreview;
window.fileTypeLabel = fileTypeLabel;
window.fileIconName  = fileIconName;
