/**
 * AppBackground — fixed full-screen Grainient layer.
 * Swaps color palettes based on the current light/dark theme.
 * Sits behind all page content via z-index: -1.
 */
import { useTheme } from '../hooks/useTheme'
import Grainient from './Grainient'

// ── Theme palettes ────────────────────────────────────────────────────────────
//
// LIGHT — Warm sunrise: coral → peach → golden yellow
//   Feels like a bright mess hall morning.
//   lightMode:true strips out the dark tones so it stays airy and pastel.
//
const LIGHT = {
  color1: '#F97316',   // vivid orange
  color2: '#FBCFE8',   // blush pink
  color3: '#FDE68A',   // warm gold
  lightMode: true,
  contrast: 1.25,
  saturation: 1.3,
  gamma: 1.2,
  grainAmount: 0.055,
  grainScale: 1.8,
  warpStrength: 0.8,
  warpAmplitude: 70,
  warpFrequency: 3.5,
  warpSpeed: 1.0,
  rotationAmount: 260,
  timeSpeed: 0.15,
  zoom: 0.88,
  blendSoftness: 0.12,
  blendAngle: 15,
  colorBalance: 0.05,
  noiseScale: 1.8,
}

// DARK — Deep cosmos: electric indigo → teal abyss → ember red
//   Rich, deep, almost cinematic. High contrast grain for drama.
//
const DARK = {
  color1: '#2D1B69',   // deep indigo-purple
  color2: '#0D3B3B',   // dark teal
  color3: '#4A0010',   // ember crimson
  lightMode: false,
  contrast: 1.8,
  saturation: 1.4,
  gamma: 0.85,
  grainAmount: 0.10,
  grainScale: 2.2,
  warpStrength: 1.2,
  warpAmplitude: 38,
  warpFrequency: 5.5,
  warpSpeed: 1.8,
  rotationAmount: 460,
  timeSpeed: 0.20,
  zoom: 0.92,
  blendSoftness: 0.04,
  blendAngle: -20,
  colorBalance: -0.1,
  noiseScale: 2.2,
}

export default function AppBackground() {
  const { theme } = useTheme()

  // Resolve actual mode: explicit override or system preference
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme !== 'light' && prefersDark)

  const palette = isDark ? DARK : LIGHT

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    >
      <Grainient
        color1={palette.color1}
        color2={palette.color2}
        color3={palette.color3}
        lightMode={palette.lightMode}
        contrast={palette.contrast}
        saturation={palette.saturation}
        gamma={palette.gamma}
        grainAmount={palette.grainAmount}
        grainScale={palette.grainScale}
        grainAnimated={false}
        warpStrength={palette.warpStrength}
        warpAmplitude={palette.warpAmplitude}
        warpFrequency={palette.warpFrequency}
        warpSpeed={palette.warpSpeed}
        rotationAmount={palette.rotationAmount}
        timeSpeed={palette.timeSpeed}
        zoom={palette.zoom}
        blendSoftness={palette.blendSoftness}
        blendAngle={palette.blendAngle}
        colorBalance={palette.colorBalance}
        noiseScale={palette.noiseScale}
        centerX={0}
        centerY={0}
      />
    </div>
  )
}
