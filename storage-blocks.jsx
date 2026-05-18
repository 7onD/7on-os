// 7on OS — Storage blocks (FilePill, NoteBlock, SlashMenu, FilePreview)
const { useMemo: _useMemo, useState: _useState, useEffect: _useEffect } = React;

const fileTypeLabel = (t) => ({ pdf:'PDF', image:'IMG', doc:'DOC', sheet:'XLS', zip:'ZIP', md:'MD' }[t] || 'FILE');
const fileIconName  = (t) => ({ pdf:'pdf', image:'image', doc:'file', sheet:'file', zip:'file', md:'file' }[t] || 'file');

// ── File pill (inline in notes) ──────────────────────────────────────────────
const FilePill = ({ fileId, onOpen }) => {
  const file = (window.SEVEN_DATA.FILES || []).find(f => f.id === fileId);
  if (!file) return null;
  return (
    <div className="block">
      <button className="block-file" onClick={e => { e.stopPropagation(); onOpen(file); }}>
        <span className={`file-icon ${file.type}`}><Icon name={fileIconName(file.type)} size={18} /></span>
        <span className="file-info">
          <span className="file-name">{file.name}</span>
          <span className="file-sub">
            <span>{fileTypeLabel(file.type)}</span>
            <span>· {file.size}</span>
            <span>· {fmtDate(file.modified)}</span>
          </span>
        </span>
        <span className="file-go"><Icon name="arrow-right" size={14} /></span>
      </button>
    </div>
  );
};

// ── Note block renderer ──────────────────────────────────────────────────────
const NoteBlock = ({ block, onOpenFile, onToggleCheck }) => {
  switch (block.kind) {
    case 'h2':
      return <div className="block block-h2">{block.text}</div>;
    case 'p':
      return <div className="block block-p">{block.text}</div>;
    case 'list':
      return (
        <ul className="block block-list">
          {(block.items || []).map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );
    case 'check':
      return (
        <div className="block">
          <div className="block-check" data-done={block.checked ? '1' : '0'} onClick={() => onToggleCheck(block)}>
            <span className="chk" />
            <span className="txt">{block.text}</span>
          </div>
        </div>
      );
    case 'file':
      return <FilePill fileId={block.fileId} onOpen={onOpenFile} />;
    default:
      return null;
  }
};

// ── Slash menu (file picker) ─────────────────────────────────────────────────
const SlashMenu = ({ query, onPick, onClose, position }) => {
  const files = window.SEVEN_DATA.FILES || [];
  const filtered = _useMemo(() => {
    const q = (query || '').toLowerCase();
    if (!q) return files.slice(0, 6);
    return files.filter(f => f.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);
  const [active, setActive] = _useState(0);

  _useEffect(() => { setActive(0); }, [query]);
  _useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowDown')  { e.preventDefault(); setActive(a => Math.min(filtered.length - 1, a + 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
      else if (e.key === 'Enter')     { e.preventDefault(); if (filtered[active]) onPick(filtered[active]); }
      else if (e.key === 'Escape')    { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, active]);

  return (
    <div className="slash-menu" style={{ left: position?.left || 0, top: position?.top || 40 }}>
      <div className="slash-section">{query ? `Файлы — «${query}»` : 'Недавние файлы'}</div>
      {filtered.length === 0 && (
        <div style={{ padding:'12px 14px', fontSize:12.5, color:'var(--text-faint)', fontFamily:'var(--font-mono)' }}>Ничего не найдено</div>
      )}
      {filtered.map((f, i) => (
        <button key={f.id} className="slash-item" data-active={i === active ? '1' : '0'}
          onClick={() => onPick(f)} onMouseEnter={() => setActive(i)}>
          <span className={`ic ${f.type}`}><Icon name={fileIconName(f.type)} size={16} /></span>
          <span className="label">
            <span className="name">{f.name}</span>
            <span className="desc">{fileTypeLabel(f.type)} · {f.size} · {fmtDate(f.modified)}</span>
          </span>
          {i === active && <span className="kbd">↵</span>}
        </button>
      ))}
      <div style={{ borderTop:'1px solid var(--border)', marginTop:6, padding:'8px 12px', display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-faint)' }}>
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

  const mockBody = () => {
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
              <span>· изменён {fmtDate(file.modified)}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="preview-body">{mockBody()}</div>
        <div className="preview-actions">
          <button className="btn"><Icon name="download" size={13} /> Скачать</button>
          <button className="btn"><Icon name="link" size={13} /> Ссылка</button>
          <button className="btn primary"><Icon name="arrow-right" size={13} /> Открыть</button>
        </div>
      </div>
    </div>
  );
};

window.FilePill = FilePill;
window.NoteBlock = NoteBlock;
window.SlashMenu = SlashMenu;
window.FilePreview = FilePreview;
window.fileTypeLabel = fileTypeLabel;
window.fileIconName  = fileIconName;
