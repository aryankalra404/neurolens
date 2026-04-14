import { Suspense, lazy, useState } from 'react'
import './BrainViewer.css'

const Spline = lazy(() => import('@splinetool/react-spline'))

const SCENE_URL = 'https://prod.spline.design/tXwOZd3HwGDjTaYA/scene.splinecode'

function SplineLoader() {
  return (
    <div className="brain-viewer__loading">
      <div className="brain-viewer__pulse" />
      <div className="brain-viewer__pulse brain-viewer__pulse--2" />
      <div className="brain-viewer__pulse brain-viewer__pulse--3" />
      <span className="brain-viewer__loading-label">Loading 3D Model…</span>
    </div>
  )
}

export default function BrainViewer() {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="brain-viewer">
      <div className="brain-viewer__spline-slot">
        {!loaded && <SplineLoader />}
        <Suspense fallback={null}>
          <Spline
            scene={SCENE_URL}
            onLoad={() => setLoaded(true)}
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.6s ease' }}
          />
        </Suspense>
      </div>
    </div>
  )
}
