export const labels = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise'] as const
export type Emotion = typeof labels[number]
export type Meme = { id: string; emotion: Emotion; url: string; downloadUrl: string }
export type Result = {
  status: 'stable' | 'uncertain' | 'no_face' | 'error'
  emotion?: Emotion
  confidence?: number
  probs: Partial<Record<Emotion, number>>
  meme?: Meme | null
  message?: string
}
export const emotions: Record<Emotion, { name: string; sentence: string; color: string; face: string }> = {
  happy: { name: 'Vui vẻ', sentence: 'Nụ cười của bạn đang lên tiếng.', color: '#d99822', face: '☺' },
  neutral: { name: 'Bình thường', sentence: 'Một khoảnh khắc thật bình thản.', color: '#648a82', face: '◡' },
  sad: { name: 'Buồn', sentence: 'Bạn đang thể hiện nét buồn.', color: '#6a8bc5', face: '☂' },
  angry: { name: 'Tức giận', sentence: 'Biểu cảm của bạn có vẻ tức giận.', color: '#cf7969', face: 'ϟ' },
  fear: { name: 'Sợ hãi', sentence: 'Bạn đang thể hiện sự sợ hãi.', color: '#9c85b8', face: '!' },
  surprise: { name: 'Ngạc nhiên', sentence: 'Có điều gì làm bạn bất ngờ?', color: '#cb9560', face: '✦' },
  disgust: { name: 'Ghê tởm', sentence: 'Bạn đang thể hiện sự ghê tởm.', color: '#8e9b60', face: '≈' },
}
