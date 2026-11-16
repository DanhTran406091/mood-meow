import {MouthPreview} from './MouthPreview'
import {useEffect,useRef,useState} from 'react'
import schema from '../config/memeFeatures.json'

type Frame={t_ms:number;values:number[]}
type Stats={clips:number;frames:number;subjects:number;sessions:number;by_label:Record<string,number>}
type Latest={features:number[]|null;timestamp:number}|null
export function GestureCollector({mouthPreview,active,starting,cameraError,onStart,onStop,latest}:{mouthPreview?:Uint8ClampedArray|null;active:boolean;starting:boolean;cameraError:string|null;onStart:()=>void;onStop:()=>void;latest:Latest}){
 const [collectionTemplates,setCollectionTemplates]=useState<{id:string;description:string;notes?:string;url?:string}[]>([])
 const [catalogMessage,setCatalogMessage]=useState('')
 useEffect(()=>{const controller=new AbortController();fetch('/api/meme-training/templates',{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error();return r.json()}).then(rows=>setCollectionTemplates(rows)).catch(()=>{if(!controller.signal.aborted)setCatalogMessage('Chưa tải được danh mục 35 nhãn. Khởi động lại backend rồi tải lại trang.');});return()=>controller.abort()},[])
 const endpoint='/api/meme-training'
 const options=[...collectionTemplates,{id:'none',description:'Ngoài động tác mục tiêu: nói chuyện, chuyển tư thế, nhìn quanh; không giữ tư thế meme'}]
 const [subject,setSubject]=useState('P01'),[session,setSession]=useState('S01'),[label,setLabel]=useState('angry_02')
 const [hasPending,setHasPending]=useState(false)
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[stats,setStats]=useState<Stats|null>(null)
 const latestRef=useRef(latest),activeRef=useRef(active),buffer=useRef<Frame[]>([]),timer=useRef<ReturnType<typeof setInterval>|null>(null)
 const mounted=useRef(true),savingPayload=useRef<object|null>(null)
 useEffect(()=>{latestRef.current=latest},[latest]);useEffect(()=>{activeRef.current=active},[active])
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(timer.current)clearInterval(timer.current)}},[])
 async function refresh(){try{const r=await fetch(`${endpoint}/summary`);if(!r.ok)throw new Error();setStats(await r.json())}catch{setMessage('Chưa tải được thống kê. Khởi động lại backend rồi thử lại.')}}
 async function save(payload:object){
   try{
     const r=await fetch(`${endpoint}/clips`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
     if(!r.ok)throw new Error()
     const data=await r.json();savingPayload.current=null
     if(mounted.current){setHasPending(false);setMessage(`Đã lưu ${data.frames} mẫu đặc trưng. Thả lỏng, chuẩn bị lần lặp tiếp theo.`);void refresh()}
   }catch{if(mounted.current)setMessage('Chưa lưu được. Giữ nguyên nhãn và bấm Lưu lại; không cần thu lại clip này.')}
   finally{if(mounted.current)setBusy(false)}
 }
 function record(){
   if(busy)return
   if(!active&&!savingPayload.current)return
   if(!/^[A-Za-z0-9_-]{1,32}$/.test(subject)||!/^[A-Za-z0-9_-]{1,32}$/.test(session)){setMessage('Mã người/buổi chỉ gồm chữ không dấu, số, _ hoặc -.');return}
   if(savingPayload.current){void save(savingPayload.current);setBusy(true);return}
   buffer.current=[];setBusy(true)
   const metadata={clip_id:crypto.randomUUID(),subject,session,label,schema_id:schema.schema_id}
   const start=performance.now();let lastTimestamp=-Infinity
   setMessage('Chuẩn bị động tác. Bắt đầu thu sau 2 giây…')
   timer.current=setInterval(()=>{
     if(!activeRef.current){clearInterval(timer.current!);setBusy(false);setMessage('Đã hủy vì camera dừng. Không lưu clip dở.');return}
     const elapsed=performance.now()-start
     if(elapsed<2000){setMessage(`Chuẩn bị… ${Math.ceil((2000-elapsed)/1000)}`);return}
     const t=elapsed-2000
     if(t<4000){
       const frame=latestRef.current
       const previous=buffer.current[buffer.current.length-1]
       if((!previous||t-previous.t_ms>=195)&&frame?.features&&frame.timestamp>lastTimestamp+195&&performance.now()-frame.timestamp<1000){buffer.current.push({t_ms:t,values:[...frame.features]});lastTimestamp=frame.timestamp}
       setMessage(`Đang thu ${Math.ceil((4000-t)/1000)} giây — ${buffer.current.length} mẫu hợp lệ`);return
     }
     clearInterval(timer.current!);timer.current=null
     const frames=buffer.current
     if(frames.length<8||frames[frames.length-1].t_ms-frames[0].t_ms<2500){setBusy(false);setMessage('Chưa đủ mẫu liên tục. Để camera thấy mặt, giữ động tác và thu lại.');return}
     const payload={...metadata,frames};savingPayload.current=payload;setHasPending(true);void save(payload)
   },100)
 }
 return <section className="card collector"><div className="section-heading"><div><span className="small-label">TỰ HUẤN LUYỆN BỘ PHÂN LOẠI</span><h3>Thu dữ liệu động tác cho kho meme</h3></div><button className="button small secondary" disabled={busy} onClick={refresh}>Xem thống kê</button></div><p className="fine-print">Một lần thu lưu đồng thời điểm mặt/tay và pixel ảnh miệng 48 × 32 vào backend máy bạn. Pixel có thể khôi phục thành ảnh vùng miệng; không lưu toàn bộ mặt hay video. Chỉ bấm Thu mẫu khi đồng ý. Dữ liệu cũ được giữ riêng, không tự trộn vì khác định dạng.</p><MouthPreview pixels={active?mouthPreview:null}/><p className="fine-print">Thu các nhãn muốn train qua ít nhất 3 buổi thực sự khác nhau hoặc 3 người. Mỗi nhãn 5 clip/buổi. Luôn thu thêm none. Động tác là quy ước tìm meme, không khẳng định cảm xúc thật.</p>{catalogMessage&&<p className="error">{catalogMessage}</p>}<div className="collector-fields"><label>Mã người<input value={subject} disabled={busy||hasPending} onChange={e=>setSubject(e.target.value)} placeholder="P01"/></label><label>Mã buổi<input value={session} disabled={busy||hasPending} onChange={e=>setSession(e.target.value)} placeholder="S01"/></label><label>Động tác thực hiện<select value={label} disabled={busy||hasPending} onChange={e=>setLabel(e.target.value)}>{options.map(t=><option key={t.id} value={t.id}>{t.id} — {t.description}</option>)}</select></label></div>{label!=='none'&&collectionTemplates.find(t=>t.id===label)?.url&&<img style={{width:120,height:100,objectFit:'contain'}} src={collectionTemplates.find(t=>t.id===label)?.url} alt="Ảnh meme đang thu mẫu"/>}<p className="fine-print">{label==='none'?'Nói chuyện, chuyển tư thế, nhìn quanh; tránh giữ đúng một động tác mục tiêu.':'Làm đúng hướng dẫn của nhãn, giữ suốt 4 giây; chỉ thay đổi góc rất nhẹ. Mắt mở tự nhiên trừ khi hướng dẫn yêu cầu chủ động nhắm/nheo. Không cần hệ thống đoán đúng khi thu.'}</p><div className="collector-actions">{!active&&<button className="button secondary" disabled={starting} onClick={onStart}>{starting?'Đang tải bộ theo dõi…':'Bật camera để thu mẫu'}</button>}{starting&&<button className="button secondary" onClick={onStop}>Hủy bật camera</button>}<button className="button primary" disabled={busy||(!hasPending&&(!active||!collectionTemplates.length))} onClick={record}>{busy?'Đang thu / lưu…':hasPending?'Lưu lại clip vừa thu':'Thu mẫu · 4 giây'}</button><span>Mỗi nhãn nên thu ít nhất 5 lần/buổi; thả lỏng giữa các lần.</span></div><p className="fine-print" role="status">{active?(latest?.features?'Camera đã bật · Đã lấy được đặc trưng, có thể thu mẫu.':'Camera đã bật · Cần thấy rõ cả mặt và vùng miệng để thu.'):starting?'Đang khởi động camera và mô hình. Chờ tải xong rồi cho phép truy cập camera.':'Camera chưa bật. Bấm “Bật camera để thu mẫu” ở trên; sau đó bấm “Thu mẫu · 4 giây”.'}</p>{cameraError&&<p className="error" role="alert">{cameraError}</p>}{message&&<p className="notice" role="status">{message}</p>}{stats&&<div className="dataset-summary"><b>{stats.clips} clip · {stats.frames} khung đặc trưng · {stats.subjects} người · {stats.sessions} buổi</b><div>{options.map(option=>option.id).map(l=><span key={l}>{l}: <strong>{stats.by_label[l]??0}</strong> clip</span>)}</div></div>}<p className="fine-print">Đổi mã buổi khi thực sự đổi lần ghi/điều kiện. Giữ cùng mã người cho cùng một người. Không đổi mã để giả làm nhiều người; các khung trong cùng clip không phải mẫu độc lập.</p></section>
}
