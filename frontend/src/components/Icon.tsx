type Name = 'camera' | 'spark' | 'pin' | 'download' | 'refresh' | 'pause' | 'play' | 'arrow' | 'check' | 'chart'
const paths: Record<Name, string> = {
  camera: 'M14 4h-4L8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  spark: 'm12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7z',
  pin: 'm16 3 5 5-4 2-3 6-3-3-6 3 3-6-2-4z M8 16l-5 5',
  download: 'M12 3v12m-5-5 5 5 5-5 M4 16v5h16v-5',
  refresh: 'M20 7v5h-5 M4 17v-5h5 M5 7a8 8 0 0 1 13-2l2 3 M4 16l2 3a8 8 0 0 0 13-2',
  pause: 'M8 5v14 M16 5v14', play: 'm8 4 12 8-12 8z',
  arrow: 'M4 12h16m-6-6 6 6-6 6', check: 'm5 12 4 4L19 6', chart: 'M5 20V10m7 10V4m7 16v-7',
}
export function Icon({ name, size = 20 }: { name: Name; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
