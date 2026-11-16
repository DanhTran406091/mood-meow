import {MouthDecision} from '../services/mouthDecision'
import {trainedGestureAllowed,mergeGestureIds} from '../services/gestureDecision'
import {GestureHold} from '../services/gestureRules'
import memeSchema from '../config/memeFeatures.json'
import mouthSchema from '../config/tongueFeatures.json'
import {useCallback,useEffect,useRef,useState} from 'react'
import type {Meme} from '../types/recognition'
import type {Signals, Point, EyeBaseline} from '../services/gestureRules'
export type GestureTemplate={recognition?:{engine:string;label:string;min_score?:number;min_gap?:number;hold_ms?:number}|null;id:string;description:string;notes:string;meme:Meme}
type Tracking={diagnostic?:string;combinedFeatures:number[]|null;mouthPreview:Uint8ClampedArray|null;tongueFeatures:number[]|null;features:number[]|null;timestamp:number;schemaId:string;calibration:'idle'|'collecting'|'ready'|'failed';eyeBaseline:EyeBaseline|null;id:string|null;stable:boolean;progress:number;ids:string[];signals:Signals;landmarks:{face:Point[];hands:Point[][];width:number;height:number}}
export function useGestureRecognition(){
  const videoRef=useRef<HTMLVideoElement>(null)
  const stream=useRef<MediaStream|null>(null)
  const worker=useRef<Worker|null>(null)
  const generation=useRef(0)
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const watchdog=useRef<ReturnType<typeof setTimeout>|null>(null)
  const [templates,setTemplates]=useState<GestureTemplate[]>([])
  const [catalogError,setCatalogError]=useState('')
  const [error,setError]=useState('')
  const [active,setActive]=useState(false)
  const [starting,setStarting]=useState(false)
  const [tracking,setTracking]=useState<Tracking|null>(null)
  const loadTemplates=useCallback(async()=>{
    try{const res=await fetch('/api/gestures',{cache:'no-store'});if(!res.ok)throw new Error();const rows:GestureTemplate[]=await res.json();if(!Array.isArray(rows)||!rows.length)throw new Error();setCatalogError('');setTemplates(rows)}
    catch{setCatalogError('Chưa tải được danh mục động tác. Khởi động lại backend rồi bấm Tải lại mẫu.')}
  },[])
  useEffect(()=>{
    const controller=new AbortController()
    fetch('/api/gestures',{signal:controller.signal,cache:'no-store'})
      .then(res=>{if(!res.ok)throw new Error();return res.json() as Promise<GestureTemplate[]>})
      .then(rows=>{if(!Array.isArray(rows)||!rows.length)throw new Error();if(!controller.signal.aborted)setTemplates(rows)})
      .catch(()=>{if(!controller.signal.aborted)setCatalogError('Chưa tải được danh mục động tác. Khởi động lại backend rồi bấm Tải lại mẫu.')})
    return()=>controller.abort()
  },[])
  const stop=useCallback(()=>{
    generation.current++
    worker.current?.terminate();worker.current=null
    if(timer.current)clearTimeout(timer.current)
    if(watchdog.current)clearTimeout(watchdog.current)
    stream.current?.getTracks().forEach(t=>t.stop());stream.current=null
    if(videoRef.current)videoRef.current.srcObject=null
    setActive(false);setStarting(false);setTracking(null)
  },[])
  // Training changes the backend catalog without reloading this page.
  // Replace the old rule catalog and stop its worker so closures cannot keep
  // selecting the previous set of memes.
  useEffect(()=>{
    let disposed=false
    const controller=new AbortController()
    const refresh=async()=>{
      if(starting)return
      try{
        const response=await fetch('/api/gestures',{cache:'no-store',signal:controller.signal})
        if(!response.ok)return
        const rows:GestureTemplate[]=await response.json()
        if(disposed||!Array.isArray(rows)||!rows.length)return
        if(JSON.stringify(rows)!==JSON.stringify(templates)){
          stop();setTemplates(rows);setCatalogError('')
        }
      }catch{/* A temporary outage must not replace a valid catalog. */}
    }
    const interval=setInterval(()=>void refresh(),5000)
    const onFocus=()=>void refresh()
    window.addEventListener('focus',onFocus)
    return()=>{disposed=true;controller.abort();clearInterval(interval);window.removeEventListener('focus',onFocus)}
  },[templates,starting,stop])
  const calibrateEyes=useCallback(()=>{
    worker.current?.postMessage({type:'calibrate-eyes'})
    setTracking(t=>t?{...t,calibration:'collecting',stable:false,id:null,progress:0}:t)
  },[])
  const start=useCallback(async()=>{
    stop();setError('');setStarting(true)
    const token=generation.current
    let runTemplates=templates
    try{
      const response=await fetch('/api/gestures',{cache:'no-store',signal:AbortSignal.timeout(3000)})
      if(!response.ok)throw new Error()
      const rows:GestureTemplate[]=await response.json()
      if(!Array.isArray(rows)||!rows.length)throw new Error()
      if(generation.current!==token)return
      runTemplates=rows;setTemplates(rows);setCatalogError('')
    }catch{
      if(generation.current!==token)return
      setError('Chưa cập nhật được danh mục mô hình. Kiểm tra backend rồi bắt đầu lại.');setStarting(false);return
    }
    if(!runTemplates.length){setError('Cần tải được danh sách mẫu từ backend trước.');setStarting(false);return}
    const w=new Worker(new URL('../services/gesture.worker.ts',import.meta.url),{type:'module'})
    worker.current=w
    let mouthSince:number|null=null,mouthFrames=0
    const mouthDecision=new MouthDecision()
    let mouthRequestFailed=false
    const combinedHold=new GestureHold()
    const current=()=>worker.current===w&&generation.current===token
    const fail=(message:string)=>{if(current()){stop();setError(message)}}
    const capture=async()=>{
      if(!current()||!videoRef.current||videoRef.current.readyState<2)return
      try{
        const image=await createImageBitmap(videoRef.current,{resizeWidth:640,resizeHeight:480})
        if(!current()){image.close();return}
        w.postMessage({type:'frame',bitmap:image,timestamp:performance.now(),sourceWidth:videoRef.current!.videoWidth,sourceHeight:videoRef.current!.videoHeight},[image])
        watchdog.current=setTimeout(()=>fail('Bộ theo dõi phản hồi quá lâu. Dừng và thử lại nhé.'),20000)
      }catch{fail('Không đọc được khung hình camera.')}
    }
    w.onmessage=async event=>{
      if(!current())return
      if(watchdog.current)clearTimeout(watchdog.current)
      const data=event.data
      if(data.type==='error'){fail('Không chạy được bộ theo dõi mặt/tay. Hãy dùng Chrome hoặc Edge mới và thử lại.');return}
      if(data.type==='ready'){
        try{
          const media=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:'user'},audio:false})
          if(!current()){media.getTracks().forEach(t=>t.stop());return}
          stream.current=media;videoRef.current!.srcObject=media;await videoRef.current!.play()
          if(!current())return
          setActive(true);setStarting(false);void capture()
        }catch{fail('Không mở được camera. Cho phép camera và đóng ứng dụng đang dùng thiết bị.')}
      }
      if(data.type==='result'){
        const trainedLabels=runTemplates.filter(t=>t.recognition?.engine==='trained_meme').map(t=>t.id)
        const useTrained=trainedLabels.length>0
        if(useTrained){
          const fallbackIds=[...data.ids]
          let prediction:string|null=null
          data.diagnostic=data.combinedFeatures?'Đang kiểm tra động tác…':'Chưa lấy đủ điểm mặt/tay và ảnh miệng.'
          if(data.combinedFeatures&&data.calibration!=='collecting'){
            try{
              const response=await fetch('/api/meme-training/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schema_id:memeSchema.schema_id,frame:{t_ms:0,values:data.combinedFeatures}}),signal:AbortSignal.timeout(3000)})
              if(!response.ok)throw new Error()
              const result=await response.json();if(!current())return
              prediction=result.id??null
              const raw=(result.predictions??[]) as {label:string;confidence:number;gap:number}[]
              const details=raw.map(item=>item.label+': '+Math.round(item.confidence*100)+'% (cách nhãn sau '+Math.round(item.gap*100)+' điểm)').join(' · ')
              data.diagnostic=result.ambiguous?'Nhiều bộ nhận diện cùng khớp. '+details:prediction
                ?trainedGestureAllowed(prediction,data)?'Model chọn '+prediction+'. '+details:'Model chọn '+prediction+' nhưng chưa đủ điều kiện tay/miệng. '+details
                :raw.some(item=>item.label==='none')?'Model đang nghiêng về không khớp động tác. '+details:'Điểm model chưa đủ rõ để chọn ảnh. '+details
              setError('')
            }catch{if(!current())return;setError('Chưa gọi được mô hình mới; các động tác dự phòng vẫn hoạt động.')}
          }
          const ids=data.calibration==='collecting'?[]:mergeGestureIds(fallbackIds,prediction,trainedLabels,data)
          Object.assign(data,{ids},combinedHold.update(ids,data.timestamp))
        }
        const mouthTemplates=runTemplates.filter(t=>t.recognition?.engine==='mouth_pixels_v2')
        if(mouthTemplates.length&&data.calibration!=='collecting'&&data.signals.face&&data.signals.hands===0&&data.tongueFeatures&&data.ids.every((id:string)=>id==='surprise_04')){
          try{
            const r=await fetch('/api/tongue-pixels/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({values:data.tongueFeatures,schema_id:mouthSchema.schema_id}),signal:AbortSignal.timeout(3000)})
            if(!r.ok)throw new Error()
            const result=await r.json()
            if(!current())return
            if(mouthRequestFailed){setError('');mouthRequestFailed=false}
            const decision=mouthDecision.update(result.scores?.the_luoi??NaN,result.scores?.mo_mieng??NaN)
            const candidate=decision==='tongue'?mouthTemplates.find(t=>t.recognition?.label==='the_luoi'):undefined
            if(candidate){
              const holdMs=candidate.recognition?.hold_ms??900
              mouthSince??=data.timestamp;mouthFrames++
              data.id=candidate.id;data.ids=[candidate.id];data.progress=Math.min(1,(data.timestamp-(mouthSince??data.timestamp))/holdMs)
              data.stable=mouthFrames>=4&&data.timestamp-(mouthSince??data.timestamp)>=holdMs
            }else{
              mouthSince=null;mouthFrames=0
              // Uncertain tongue predictions must not fall through to surprise.
              if(decision!=='open'){data.id=null;data.ids=[];data.stable=false;data.progress=0;data.diagnostic=(data.diagnostic??'')+' · Bộ miệng chưa phân biệt rõ thè lưỡi / mở miệng.'}
            }
          }catch{
            if(!current())return
            mouthSince=null;mouthFrames=0;mouthDecision.reset();mouthRequestFailed=true
            setError('Chưa gọi được bộ nhận diện thè lưỡi. Kiểm tra backend; các động tác tay vẫn dùng được.')
            data.id=null;data.ids=[];data.stable=false;data.progress=0
          }
        }else{mouthSince=null;mouthFrames=0;mouthDecision.reset()}
        if(!current())return
        setTracking(data)
        timer.current=setTimeout(()=>void capture(),100)
      }
    }
    w.onerror=()=>fail('Không tải được bộ theo dõi. Kiểm tra tệp mô hình và tải lại trang.')
    watchdog.current=setTimeout(()=>fail('Tải bộ theo dõi quá lâu. Bạn thử lại nhé.'),60000)
    w.postMessage({type:'init',origin:location.origin})
  },[stop,templates])
  useEffect(()=>()=>{
    generation.current++;worker.current?.terminate();stream.current?.getTracks().forEach(t=>t.stop())
    if(timer.current)clearTimeout(timer.current)
    if(watchdog.current)clearTimeout(watchdog.current)
  },[])
  return{videoRef,templates,catalogError,loadTemplates,error,active,starting,tracking,start,stop,calibrateEyes}
}
