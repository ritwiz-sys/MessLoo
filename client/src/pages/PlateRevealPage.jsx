/**
 * PlateRevealPage.jsx
 * Static image hero + features + CTA landing page
 */

import './PlateRevealPage.css'

export default function PlateRevealPage() {
  return (
    <div className="prp-page">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="prp-hero">
        {/* Left gradient overlay for text legibility */}
        <div className="prp-hero-overlay" />

        {/* Wordmark */}
        <div className="prp-wordmark">
          <span className="prp-wordmark-name">MessLoo</span>
          <span className="prp-wordmark-tag">VIT-AP</span>
        </div>

        {/* Left-side text */}
        <div className="prp-hero-text">
          <p className="prp-hero-eyebrow">VIT-AP University · Mess Companion</p>
          <h1 className="prp-hero-title">Know what's on<br /><em>the plate.</em></h1>
          <p className="prp-hero-sub">
            Daily menu, attendance tracking, and meal ratings —<br />
            all from your phone. No more guessing.
          </p>
          <div className="prp-hero-pills">
            <span className="prp-pill">🍛 Live menu updates</span>
            <span className="prp-pill">📅 Attendance in one tap</span>
            <span className="prp-pill">⭐ Rate every meal</span>
          </div>
          <a href="/" className="prp-hero-cta">Open MessLoo →</a>
        </div>

        {/* Floating badges over the plate */}
        <div className="prp-hero-badges">
          <div className="prp-badge prp-badge--top">
            <span className="prp-badge-dot prp-badge-dot--green" />
            <span>Menu updated · Today 8:00 AM</span>
          </div>
          <div className="prp-badge prp-badge--mid">
            <span className="prp-badge-num">4.2</span>
            <span className="prp-badge-label">avg rating this week</span>
          </div>
          <div className="prp-badge prp-badge--bot">
            <span className="prp-badge-icon">🎓</span>
            <span>1,200+ students checked in today</span>
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ─────────────────────────────────────────────── */}
      <div className="prp-marquee-wrap" aria-hidden="true">
        <div className="prp-marquee-track">
          {[
            '🍛 Never guess what’s for lunch',
            '📋 Full menu · every day',
            '⭐ Rate your meals',
            '📅 Track your attendance',
            '🔔 Get notified for favourites',
            '🏠 Built for VIT-AP hostels',
            '🍛 Never guess what’s for lunch',
            '📋 Full menu · every day',
            '⭐ Rate your meals',
            '📅 Track your attendance',
            '🔔 Get notified for favourites',
            '🏠 Built for VIT-AP hostels',
          ].map((item, i) => (
            <span key={i} className="prp-marquee-item">{item}</span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ──────────────────────────────────────────────── */}
      <section className="prp-after">
        <div className="prp-features">
          <div className="prp-feature-eyebrow">Built for VIT-AP Students</div>
          <h2 className="prp-feature-title">
            Your mess, <em>finally organised.</em>
          </h2>

          <div className="prp-feature-grid">
            {[
              { icon: '📋', head: 'Live Menu',        body: "See today's full meal plan — breakfast through dinner — updated in real time." },
              { icon: '📅', head: 'Track Attendance', body: 'Mark yourself in or out and see your monthly mess usage at a glance.' },
              { icon: '⭐', head: 'Rate Your Meal',   body: 'Give instant feedback on every dish. Your hostel management listens.' },
              { icon: '🔔', head: 'Smart Alerts',     body: 'Get notified when your favourite meal is on the menu.' },
            ].map(({ icon, head, body }) => (
              <div key={head} className="prp-feature-card">
                <span className="prp-feature-icon">{icon}</span>
                <h3 className="prp-feature-head">{head}</h3>
                <p  className="prp-feature-body">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="prp-cta">
          <p className="prp-cta-eye">READY TO START?</p>
          <h2 className="prp-cta-title">Every meal, tracked.</h2>
          <p className="prp-cta-sub">
            Join thousands of VIT-AP students who never miss a meal.
          </p>
          <a href="/" className="prp-cta-btn">
            Open MessLoo →
          </a>
          <p className="prp-cta-fine">No account needed · Open for all VIT-AP students</p>
        </div>

        <footer className="prp-footer">
          <span>© {new Date().getFullYear()} MessLoo · VIT-AP University</span>
        </footer>
      </section>
    </div>
  )
}
