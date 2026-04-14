import { Link } from 'react-router-dom'
import { RiBrainLine } from 'react-icons/ri'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <div className="footer__logo">
            <RiBrainLine size={18} />
            <span>NeuroLens</span>
          </div>
          <p>Real-time EEG brain signal analysis for clinicians, researchers, and innovators.</p>
        </div>

        <div className="footer__links">
          <div className="footer__col">
            <h4>Product</h4>
            <Link to="/dashboard">Dashboard</Link>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
          </div>
          <div className="footer__col">
            <h4>Science</h4>
            <a href="#">Research</a>
            <a href="#">Signal Bands</a>
            <a href="#">Neural Mapping</a>
          </div>
          <div className="footer__col">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Contact</a>
            <a href="#">Privacy</a>
          </div>
        </div>
      </div>

      <div className="footer__bottom container">
        <span>© 2026 NeuroLens. All rights reserved.</span>
        <span className="footer__status">
          <span className="footer__dot" />
          System Nominal
        </span>
      </div>
    </footer>
  )
}
