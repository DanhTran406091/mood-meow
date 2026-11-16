import { useCallback, useEffect, useRef, useState } from 'react'
import type { Result } from '../types/recognition'

export function useRecognition() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const generation = useRef(0)
  const [active, setActive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const stop = useCallback(() => {
    generation.current++
    socketRef.current?.close()
    socketRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
    setStarting(false)
    setResult(null)
  }, [])

  const start = useCallback(async () => {
    stop()
    const token = generation.current
    setStarting(true)
    setError('')
    try {
      const health = await fetch('/api/health')
      if (!health.ok || !(await health.json()).ready) throw new Error('Backend chưa sẵn sàng. Hãy chạy máy chủ Python trước.')
      if (token !== generation.current) return
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
      if (token !== generation.current) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      if (token !== generation.current) return
      const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/recognize`)
      socketRef.current = socket
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      let timeout: ReturnType<typeof setTimeout>
      let next: ReturnType<typeof setTimeout>
      const send = () => {
        if (socketRef.current !== socket || socket.readyState !== WebSocket.OPEN) return
        const context = canvas.getContext('2d')!
        context.drawImage(video, 0, 0, 640, 480)
        canvas.toBlob(blob => {
          if (blob && socketRef.current === socket && socket.readyState === WebSocket.OPEN) {
            socket.send(blob)
            timeout = setTimeout(() => { if (socketRef.current === socket) { stop(); setError('Nhận diện quá lâu. Bạn thử bắt đầu lại nhé.') } }, 20000)
          }
        }, 'image/jpeg', .8)
      }
      socket.onopen = () => { if (socketRef.current === socket) { setActive(true); setStarting(false); send() } }
      socket.onmessage = event => {
        if (socketRef.current !== socket) return
        clearTimeout(timeout)
        try {
          const response: Result = JSON.parse(event.data)
          if (response.status === 'error') throw new Error(response.message)
          setResult(response)
          next = setTimeout(send, 180)
        } catch { stop(); setError('Không xử lý được ảnh. Bạn thử bắt đầu lại nhé.') }
      }
      socket.onerror = () => { if (socketRef.current === socket) { stop(); setError('Không kết nối được bộ nhận diện.') } }
      socket.onclose = () => {
        clearTimeout(timeout); clearTimeout(next)
        if (socketRef.current === socket) { stop(); setError('Kết nối nhận diện đã đóng. Bạn có thể bắt đầu lại.') }
      }
    } catch (err) {
      if (token === generation.current) {
        stop()
        setError(err instanceof DOMException ? 'Không mở được camera. Kiểm tra quyền truy cập và đóng chương trình khác đang dùng camera.' : err instanceof Error ? err.message : 'Không thể bắt đầu nhận diện.')
      }
    }
  }, [stop])
  useEffect(() => () => { generation.current++; socketRef.current?.close(); streamRef.current?.getTracks().forEach(t => t.stop()) }, [])
  return { videoRef, active, starting, error, result, start, stop }
}
