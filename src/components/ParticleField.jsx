import { useEffect, useRef } from 'react'
import './ParticleField.css'

export default function ParticleField({ count = 120 }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const particles = []

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div')
      p.className = 'pf__particle'

      const size = Math.random() * 2.5 + 0.5
      const x    = Math.random() * 100
      const y    = Math.random() * 100
      const dur  = Math.random() * 14 + 8
      const del  = Math.random() * 10

      const dx = (Math.random() - 0.5) * 200
      const dy = (Math.random() - 0.5) * 200

      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${x}%; top:${y}%;
        animation-duration:${dur}s;
        animation-delay:-${del}s;
        --dx:${dx}px; --dy:${dy}px;
        opacity:${Math.random() * 0.7 + 0.1};
      `
      container.appendChild(p)
      particles.push(p)
    }

    return () => particles.forEach(p => p.remove())
  }, [count])

  return <div className="pf__container" ref={containerRef} />
}
