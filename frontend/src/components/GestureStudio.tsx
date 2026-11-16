import {useEffect,useRef,useState} from 'react'
import {useGestureRecognition} from '../hooks/useGestureRecognition'
import type {Meme} from '../types/recognition'
import {Icon} from './Icon'
import {GestureCollector} from './GestureCollector'
import {LandmarkOverlay} from './LandmarkOverlay'

export function GestureStudio(){
  const {videoRef,templates,catalogError,loadTemplates,error,active,starting,tracking,start,stop,calibrateEyes}=useGestureRecognition()
  const [target,setTarget]=useState('')
  const [showLandmarks,setShowLandmarks]=useState(true)
  const [pinned,setPinned]=useState<Meme|null>(null)
  const [history,setHistory]=useState<Meme[]>([])
  const [saving,setSaving]=useState(false)
  const [notice,setNotice]=useState('')
  const last=useRef('')
  const match=tracking?.stable?templates.find(t=>t.id===tracking.id):undefined
  const current=pinned??match?.meme
  useEffect(()=>{if(match&&last.current!==match.id){last.current=match.id;setHistory(items=>[match.meme,...items.filter(i=>i.id!==match.meme.id)].slice(0,12))}},[match])
  const guide=templates.find(t=>t.id===target)
  const name=(m:Meme)=>templates.find(t=>t.meme.id===m.id)?.description??'Meme động tác'
  async function download(){
    if(!current)return
    const snapshot=current;setPinned(snapshot);setSaving(true)
    try{const r=await fetch(snapshot.downloadUrl);if(!r.ok)throw new Error();const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${snapshot.id}.${blob.type==='image/png'?'png':'jpg'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Đã gửi ảnh đến trình tải xuống và ghim ảnh này.')}
    catch{setNotice('Chưa tải được. Ảnh vẫn được ghim, bạn thử lại nhé.')}finally{setSaving(false)}
  }
  const status=!active?'Bấm Bắt đầu theo động tác để dùng danh sách mô hình hiện tại.':tracking?.calibration==='collecting'?'Nhìn thẳng, thả lỏng mặt và mở mắt tự nhiên khoảng 2 giây.':match?`Đã khớp: ${match.description}`:!tracking?.signals.face?'Đưa khuôn mặt vào camera để bắt đầu.':tracking.ids.length>1?'Có nhiều mẫu cùng khớp — hãy làm rõ động tác.':tracking.id?'Giữ động tác thêm một chút…':'Chưa khớp mẫu nào. Chọn ảnh bên dưới để xem cách làm.'
  return <section className="gesture-studio">
    <div className="experimental-note"><b>Tìm meme theo động tác</b><span>Nhận động tác theo điểm mặt/tay, không thay thế mô hình cảm xúc của nhóm. Chưa hiệu chỉnh trên nhiều người.</span></div>
    <div className="studio-grid"><div className="camera-column"><div className="mood-banner" aria-live="polite"><span className="mood-icon">✋</span><div><span className="small-label">ĐỘNG TÁC CỦA BẠN</span><h2>{status}</h2></div></div>
      <section className="card camera-card"><div className="card-top"><h3><Icon name="camera" size={18}/>Camera của bạn</h3><span className="status">{active?'Đang theo dõi':starting?'Đang tải mô hình':'Chưa bắt đầu'}</span></div><div className="camera-stage"><video ref={videoRef} muted playsInline className={active?'visible':''}/>{active&&showLandmarks&&<LandmarkOverlay landmarks={tracking?.landmarks??null}/>}{!active&&<div className="camera-empty"><div className="camera-orbit"><Icon name="camera" size={30}/></div><h3>Để thấy rõ khuôn mặt và cả hai bàn tay.</h3><p>Dùng một camera để tìm meme theo mặt và tay.<br/>Pixel vùng miệng được gửi đến backend máy bạn để nhận diện, không lưu khi tìm meme.</p><button className="button primary" disabled={starting||!templates.length} onClick={start}>{starting?'Đang tải bộ theo dõi…':'Bắt đầu theo động tác'}</button></div>}</div><div className="camera-bottom"><span>Không ghi hình · Không lưu khuôn mặt</span>{(active||starting)&&<button className="button small secondary" onClick={stop}>{starting?'Hủy':'Dừng camera'}</button>}</div></section>
      <label className="landmark-toggle"><input type="checkbox" checked={showLandmarks} onChange={event=>setShowLandmarks(event.target.checked)}/><span>Hiện điểm và đường mặt / tay</span><small>Giúp chỉnh tư thế, không phải điểm chính xác</small></label>
      <div className="eye-calibration"><button className="button small secondary" disabled={!active||tracking?.calibration==='collecting'} onClick={calibrateEyes}>{tracking?.calibration==='collecting'?'Đang lấy mốc…':'Lấy mốc mắt tự nhiên'}</button><span>{tracking?.calibration==='ready'?'Đã lấy mốc riêng cho bạn. Không cần trợn mắt.':tracking?.calibration==='failed'?'Chưa lấy được mốc. Nhìn thẳng camera và thử lại.':'Mẫu ngạc nhiên ưu tiên miệng chữ O; không yêu cầu mắt mở hết cỡ.'}</span></div>
      <div className="tracking-info" aria-live="polite"><span>Mặt: {tracking?.signals.face?'đã thấy':'chưa thấy'}</span><span>Tay: {tracking?.signals.hands??0}/2</span><span>Mở: {tracking?.signals.openHands??0}</span><span>Nắm: {tracking?.signals.fists??0}</span></div>
      {active&&tracking?.diagnostic&&<p className="fine-print" role="status">{tracking.diagnostic}</p>}
      <div className="hold-track"><div style={{width:`${(tracking?.progress??0)*100}%`}}/></div><p className="camera-tip">Giữ rõ động tác khoảng 0,7 giây và ít nhất 4 lần xử lý. Không cần làm quá nhanh.</p>
      {error&&<div role="alert" className="error">{error}</div>}
    </div><section className="card meme-card"><div className="card-top"><h3><Icon name="spark" size={18}/>Meme khớp động tác</h3><span className="mode-badge">{pinned?'Đã ghim':'Theo mẫu'}</span></div><div className="meme-stage">{current?<img src={current.url} alt={name(current)}/>:<div className="meme-empty"><span className="cat-face">ᓚᘏᗢ</span><h3>Chưa khớp mẫu nào.</h3><p>Mỗi động tác gọi đúng ảnh đã liên kết. Không lấy ngẫu nhiên từ nhóm cảm xúc.</p></div>}</div><div className="meme-actions"><button className="button secondary" disabled={!current} onClick={()=>{setPinned(pinned?null:current??null);setNotice('')}}><Icon name="pin" size={16}/>{pinned?'Bỏ ghim':'Ghim meme'}</button><button className="button primary download" disabled={!current||saving} onClick={download}><Icon name="download" size={16}/>{saving?'Đang tải…':'Tải ảnh'}</button></div><div className="pin-explainer"><p>{current?name(current):'Ghim ảnh để giữ lại ngay cả khi bạn chuyển sang động tác khác.'}</p></div>{notice&&<p className="notice" role="status">{notice}</p>}</section></div>
    <details className="tongue-pilot-section"><summary>Thu dữ liệu huấn luyện · dành cho nhóm phát triển</summary><GestureCollector mouthPreview={active?tracking?.mouthPreview:null} starting={starting} cameraError={error} onStart={start} onStop={stop} active={active} latest={tracking?{features:tracking.combinedFeatures,timestamp:tracking.timestamp}:null}/></details>
    <section className="card gesture-templates"><div className="section-heading"><div><span className="small-label">CHỌN MỘT MẪU ĐỂ XEM HƯỚNG DẪN</span><h3>Các động tác đang hỗ trợ · {templates.length} ảnh</h3></div></div><p className="fine-print">Chọn ảnh chỉ mở hướng dẫn, không ép hệ thống nhận ảnh đó. Danh sách tự cập nhật sau khi train. Khi danh sách đổi, camera dừng để bạn bắt đầu lại với mô hình mới.</p>{catalogError&&<div className="error" role="alert">{catalogError}<button className="button secondary small" onClick={loadTemplates}>Tải lại mẫu</button></div>}<div className="gesture-grid">{templates.map(t=><button key={t.id} className={`gesture-tile ${target===t.id?'chosen':''} ${match?.id===t.id?'matched':''}`} onClick={()=>setTarget(t.id)}><img src={t.meme.url} alt={t.description}/><b>{t.id.replace('_',' ')}</b><span>{t.description}</span>{match?.id===t.id&&<small>Đang khớp</small>}</button>)}</div>{guide&&<div className="gesture-guide"><b>{guide.description}</b><p>{guide.notes}</p></div>}</section>
    <section className="card gesture-history"><div className="section-heading"><h3>Meme động tác gần đây</h3><span className="session-label">Trong phiên này</span></div>{history.length?<div className="recent-grid">{history.map(m=><button className="recent-item" key={m.id} onClick={()=>setPinned(m)} title={`Ghim ${name(m)}`}><img src={m.url} alt={name(m)}/><span>{name(m)}</span></button>)}</div>:<p className="fine-print">Chưa có mẫu khớp. Các ảnh vừa gọi sẽ được giữ ở đây để bạn ghim lại.</p>}</section>
  </section>
}
