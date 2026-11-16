import {useEffect,useRef} from 'react'

export function MouthPreview({pixels}:{pixels?:Uint8ClampedArray|null}){
 const canvas=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{
  const context=canvas.current?.getContext('2d')
  if(!context)return
  context.clearRect(0,0,48,32)
  if(pixels?.length===48*32*4)context.putImageData(new ImageData(new Uint8ClampedArray(pixels),48,32),0,0)
 },[pixels])
 return <div className="mouth-preview-panel">
  <div className="mouth-preview-image"><canvas ref={canvas} width={48} height={32} aria-label="Vùng miệng thực tế dùng để trích đặc trưng"/>{pixels&&<div className="mouth-preview-grid" aria-hidden="true">{Array.from({length:16},(_,i)=><span key={i}/>)}</div>}{!pixels&&<span className="mouth-preview-empty">Chưa có vùng miệng</span>}</div>
  <div><b>Vùng miệng đưa vào bộ trích đặc trưng</b><p className="fine-print">Ảnh 48 × 32 pixel phóng to, giữ nguyên vị trí các pixel RGB để huấn luyện. Lưới 4 × 4 chỉ để quan sát, không được đưa vào mô hình. Ảnh giữ đúng chiều đầu vào, không lật như camera.</p><p className="fine-print">Thử mở miệng rồi thè lưỡi: kiểm tra lưỡi có nằm trọn trong ô này không. Nếu bị cắt mất hoặc khung nhảy lệch, chưa thu thêm mẫu. Phần xem này chạy cục bộ, chỉ gửi pixel vùng miệng lên backend máy bạn khi bấm Thu mẫu.</p></div>
 </div>
}
