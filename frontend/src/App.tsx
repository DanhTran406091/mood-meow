import { useEffect, useRef, useState } from 'react'
import { Icon } from './components/Icon'
import { useRecognition } from './hooks/useRecognition'
import { emotions, labels } from './types/recognition'
import type { Meme } from './types/recognition'
import './styles/global.css'
import { GestureStudio } from './components/GestureStudio'

export default function App() {
  const [mode, setMode] = useState<'emotion' | 'gesture'>('emotion')
  const { videoRef, active, starting, error, result, start, stop } = useRecognition()
  const [pinned, setPinned] = useState<Meme | null>(null)
  const [history, setHistory] = useState<Meme[]>([])
  const [saving, setSaving] = useState(false)
  const [changing, setChanging] = useState(false)
  const [notice, setNotice] = useState('')
  const lastMeme = useRef('')
  const auto = result?.status === 'stable' ? result.meme : null
  const current = pinned ?? auto
  const remember = (meme: Meme) => setHistory(items => [meme, ...items.filter(item => item.id !== meme.id)].slice(0, 12))
  useEffect(() => {
    if (auto && auto.id !== lastMeme.current) {
      lastMeme.current = auto.id
      remember(auto)
    }
  }, [auto])
  const stable = active && result?.status === 'stable' && result.emotion
  const emotion = stable ? emotions[result.emotion!] : null
  const heading = !active ? 'Mỗi biểu cảm, một chiếc meme.' : emotion ? emotion.sentence : result?.status === 'no_face' ? 'Mình chưa nhìn thấy khuôn mặt bạn.' : 'Một chút nữa, mình đang quan sát…'
  async function download() {
    if (!current || saving) return
    const snapshot = current
    setPinned(snapshot)
    setSaving(true)
    setNotice('')
    try {
      const response = await fetch(snapshot.downloadUrl)
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `meme-${snapshot.emotion}-${snapshot.id}.${blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'}`
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('Đã gửi ảnh đến trình tải xuống. Meme được ghim để bạn giữ lại.')
    } catch { setNotice('Chưa tải được ảnh. Meme vẫn được ghim, bạn thử lại nhé.') }
    finally { setSaving(false) }
  }
  async function changeMeme() {
    if (!current || changing) return
    const snapshot = current
    setChanging(true); setNotice('')
    try {
      const response = await fetch(`/api/suggestions/${snapshot.emotion}?exclude=${snapshot.id}`)
      if (!response.ok) throw new Error()
      const meme: Meme = await response.json()
      setPinned(meme); remember(meme)
    } catch { setNotice('Không lấy được meme khác. Bạn thử lại nhé.') }
    finally { setChanging(false) }
  }
  return <div className="app">
    <header className="topbar">
      <a href="#" className="brand" aria-label="Mood & Meow — trang chính"><span className="brand-mark">m<span>✦</span></span><span>Mood <i>&</i> Meow</span></a>
      <nav><a className="nav-active" href="#studio">Không gian của bạn</a><a href="#recent">Meme gần đây</a></nav>
      <span className="project-tag">FER PROJECT <span>2026</span></span>
    </header>
    <main id="studio">
      <section className="intro"><div><div className="eyebrow"><span /> MỘT CHÚT CẢM XÚC, MỘT CHÚT MÈO</div><h1>Gương mặt kể chuyện.<br /><em>Mèo thay lời bạn.</em></h1><p>Bắt một khoảnh khắc, tìm một chiếc meme đồng điệu.<br className="desktop-break" /> Không cần diễn thật nhiều. Cứ là bạn thôi.</p></div><div className="intro-doodle" aria-hidden="true"><span className="doodle-star">✧</span><svg viewBox="0 0 180 150" fill="none"><path d="m39 68-3-42 36 21c15-5 28-4 38 0l35-21-2 46c22 44-4 63-48 63S24 115 39 68Z" stroke="currentColor" strokeWidth="2.5"/><path d="m58 82 12-3m39 0 12 3M88 91l5 5 5-5m-5 5v7m0 0c-9 10-17 3-17 0m17 0c9 10 17 3 17 0M32 96l-21-5m23 15-22 4m133-14 22-5m-22 15 23 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg><span className="doodle-label">a little mood, a little meow</span></div></section>
      <div className="recognition-modes" role="group" aria-label="Chế độ nhận diện"><button className={mode==='emotion'?'active':''} onClick={()=>{if(mode!=='emotion'){stop();setMode('emotion')}}}>Theo cảm xúc <small>Mô hình của nhóm</small></button><button className={mode==='gesture'?'active':''} onClick={()=>{if(mode!=='gesture'){stop();setMode('gesture')}}}>Theo động tác <small>Thử nghiệm mới</small></button></div>
      {mode==='gesture' ? <GestureStudio/> : <>
      <section className="studio-grid">
        <div className="camera-column">
          <div className="mood-banner" aria-live="polite"><span className="mood-icon">{emotion?.face ?? '✦'}</span><div><span className="small-label">KHOẢNH KHẮC CỦA BẠN</span><h2>{heading}</h2></div>{stable && <span className="confidence">{Math.round((result?.confidence ?? 0) * 100)}%<small>điểm mô hình</small></span>}</div>
          <section className="card camera-card"><div className="card-top"><h3><Icon name="camera" size={18} /> Camera của bạn</h3><span className={`status ${active ? 'live' : ''}`}><span />{active ? 'Đang quan sát' : starting ? 'Đang kết nối' : 'Chưa bắt đầu'}</span></div>
            <div className="camera-stage"><video ref={videoRef} muted playsInline className={active ? 'visible' : ''} />{!active && <div className="camera-empty"><div className="camera-orbit"><Icon name="camera" size={34} /></div><h3>Một chiếc camera, muôn vàn biểu cảm.</h3><p>Cho phép truy cập camera để bắt đầu.<br />Bạn luôn có thể dừng bất cứ lúc nào.</p><button className="button primary" disabled={starting} onClick={start}><Icon name="play" size={16} />{starting ? 'Đang kết nối…' : 'Bật camera'}</button></div>}{active && <span className="camera-live"><span /> LIVE</span>}</div>
            <div className="camera-bottom"><span><span className="privacy-dot" />Không ghi hình hoặc lưu ảnh khuôn mặt</span>{(active || starting) && <button className="button small secondary" onClick={stop}><Icon name="pause" size={15} />{starting ? 'Hủy kết nối' : 'Dừng camera'}</button>}</div>
          </section>
          {error && <div className="error" role="alert">{error}</div>}
          <p className="camera-tip">Ánh sáng phía trước, camera ngang tầm mắt — vậy là đủ để bắt đầu.</p>
        </div>
        <section className="card meme-card"><div className="card-top"><h3><Icon name="spark" size={18} /> Chiếc meme dành cho bạn</h3><span className={`mode-badge ${pinned ? 'pinned' : ''}`}>{pinned ? 'Đã ghim' : 'Tự động'}</span></div>
          <div className="meme-stage">{current ? <><img key={current.id} src={current.url} alt={`Meme mèo — ${emotions[current.emotion].name}`} /><span className="meme-label">{emotions[current.emotion].name}</span>{pinned && <span className="pin-label"><Icon name="pin" size={14} />Ảnh được giữ lại</span>}</> : <div className="meme-empty"><span className="cat-face">ᓚᘏᗢ</span><h3>Mèo đang chờ tín hiệu từ bạn.</h3><p>{active ? 'Khi biểu cảm rõ và ổn định, chiếc meme phù hợp sẽ xuất hiện ở đây.' : 'Bật camera để khám phá chiếc meme đầu tiên.'}</p><span className="waiting-dots">· · ·</span></div>}</div>
          <div className="meme-actions"><button className={`button secondary ${pinned ? 'selected' : ''}`} disabled={!current} onClick={() => { setPinned(pinned ? null : current ?? null); setNotice('') }}><Icon name="pin" size={17} />{pinned ? 'Bỏ ghim' : 'Ghim meme'}</button><button className="icon-button" title="Đổi meme cùng cảm xúc và ghim ảnh mới" aria-label="Đổi meme cùng cảm xúc" disabled={!current || changing} onClick={changeMeme}><Icon name="refresh" size={18} /></button><button className="button primary download" disabled={!current || saving} onClick={download}><Icon name="download" size={17} />{saving ? 'Đang tải…' : 'Tải ảnh'}</button></div>
          <div className="pin-explainer"><Icon name="pin" size={16} /><p>{pinned ? 'Cứ đổi biểu cảm thoải mái. Meme đã ghim vẫn ở đây; bấm Bỏ ghim để nhận đề xuất mới.' : 'Thích chiếc meme nào? Ghim lại để ảnh không đổi khi bạn thay đổi biểu cảm.'}</p></div>{notice && <p className="notice" role="status">{notice}</p>}
        </section>
      </section>
      <section className="lower-grid"><section className="card probability-card"><div className="section-heading"><div><span className="small-label">HIỂU THÊM MỘT CHÚT</span><h3>Bảy sắc thái biểu cảm</h3></div><Icon name="chart" /></div><div className="bars">{labels.map(label => <div className="bar-row" key={label}><span className="bar-dot" style={{ background: emotions[label].color }} /><span>{emotions[label].name}</span><div className="bar-track"><div style={{ width: `${(result?.probs[label] ?? 0) * 100}%`, background: emotions[label].color }} /></div><strong>{result?.probs[label] !== undefined ? `${Math.round(result.probs[label]! * 100)}%` : '—'}</strong></div>)}</div><p className="fine-print">Điểm dự đoán của mô hình, không phải kết luận về tâm trạng thực của bạn.</p></section>
        <section className="card recent-card" id="recent"><div className="section-heading"><div><span className="small-label">ĐỪNG ĐỂ KHOẢNH KHẮC TRÔI QUA</span><h3>Meme vừa ghé qua <span className="count">{history.length}</span></h3></div><span className="session-label">Trong phiên này</span></div>{history.length ? <div className="recent-grid">{history.map(meme => <button key={meme.id} className={`recent-item ${pinned?.id === meme.id ? 'is-pinned' : ''}`} onClick={() => { setPinned(meme); setNotice('Đã ghim meme bạn chọn từ danh sách gần đây.') }} title={`Ghim lại meme ${emotions[meme.emotion].name}`}><img src={meme.url} alt={`Meme ${emotions[meme.emotion].name}`} /><span>{emotions[meme.emotion].name}</span>{pinned?.id === meme.id && <b><Icon name="pin" size={13} /></b>}</button>)}</div> : <div className="recent-empty"><span>↶</span><p>Những chiếc meme sẽ được giữ ở đây.<br /><small>Bấm vào ảnh bất kỳ để ghim và tải lại.</small></p></div>}<p className="fine-print">Giữ tối đa 12 meme gần nhất trong phiên này. Tải ảnh để lưu lâu dài.</p></section></section>
      </>}
      <footer><span className="footer-brand">Mood & Meow <span>✦</span></span><p>Một trải nghiệm nhỏ với nhận diện biểu cảm và những chiếc meme mèo.</p><span>Made for a little joy.</span></footer>
    </main>
  </div>
}
