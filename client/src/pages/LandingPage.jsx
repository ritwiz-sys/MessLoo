import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(null)

  function goRole(role) {
    setExiting(role)
    setTimeout(() => navigate('/login', { state: { role } }), 420)
  }

  return (
    <div className="lp-page">

      {/* ── Background image ─────────────────────────────────── */}
      {/* Left overlay so text + cards are readable */}
      <div className="lp-overlay" />

      {/* ── Top brand ────────────────────────────────────────── */}
      <div className="lp-brand">
        <span className="lp-eyebrow">VIT-AP University</span>
        <h1 className="lp-title">MESSLOO</h1>
        <p className="lp-tagline">Your daily mess companion</p>
      </div>

      {/* ── Bottom role cards ─────────────────────────────────── */}
      <div className="lp-cards">
        <div className="lp-cards-head">
          <p className="lp-cards-eye">VIT-AP · MessLoo</p>
          <h2 className="lp-cards-title">Who are you?</h2>
        </div>

        <button
          className={`lp-card lp-card--s${exiting === 'student' ? ' lp-exit' : ''}`}
          onClick={() => goRole('student')}
        >
          <div className="lp-icon lp-icon--s">🎓</div>
          <div className="lp-card-text">
            <strong>Student</strong>
            <span>View menu · track attendance · rate meals</span>
          </div>
          <div className="lp-chevron lp-chev--s">
            <svg viewBox="0 0 20 20" fill="none">
              <path d="M7 5l5 5-5 5" stroke="currentColor"
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        <button
          className={`lp-card lp-card--a${exiting === 'admin' ? ' lp-exit' : ''}`}
          onClick={() => goRole('admin')}
        >
          <div className="lp-icon lp-icon--a">🔑</div>
          <div className="lp-card-text">
            <strong>Admin / Staff</strong>
            <span>Post menus · manage feedback · analytics</span>
          </div>
          <div className="lp-chevron lp-chev--a">
            <svg viewBox="0 0 20 20" fill="none">
              <path d="M7 5l5 5-5 5" stroke="currentColor"
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        <p className="lp-footer">VIT–AP University · Mess Management System</p>
      </div>

    </div>
  )
}
