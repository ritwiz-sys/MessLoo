import { SignIn } from '../lib/clerk'

const clerkAppearance = {
  variables: {
    colorPrimary: '#E23744',
    colorBackground: '#FFFFFF',
    colorInputBackground: '#FFF8F0',
    colorInputText: '#1C1C1E',
    colorText: '#1C1C1E',
    colorTextSecondary: '#6B6B6B',
    colorDanger: '#E23744',
    borderRadius: '0.875rem',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none border-0 bg-transparent',
    headerTitle: 'text-[#1C1C1E] font-bold',
    headerSubtitle: 'text-[#6B6B6B]',
    socialButtonsBlockButton: 'border border-[#F0E6D3] hover:bg-[#FFF8F0] text-[#1C1C1E] font-medium',
    formButtonPrimary: 'font-semibold',
    formFieldInput: 'border border-[#F0E6D3] text-[#1C1C1E] focus:border-[#E23744]',
    formFieldLabel: 'text-[#1C1C1E] font-medium text-sm',
    footerActionText: 'text-[#6B6B6B]',
    footerActionLink: 'text-[#E23744] font-semibold hover:text-[#c5313d]',
    dividerLine: 'bg-[#F0E6D3]',
    dividerText: 'text-[#6B6B6B]',
  },
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'transparent' }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-0 left-0 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: '#E23744', transform: 'translate(-40%, -40%)' }}
      />
      <div
        className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: '#FF8C00', transform: 'translate(40%, 40%)' }}
      />

      {/* Logo */}
      <div className="relative mb-6 flex flex-col items-center gap-2 text-center">
        <div
          className="h-16 w-16 rounded-3xl flex items-center justify-center text-3xl mb-1"
          style={{ background: '#E23744', boxShadow: '0 8px 24px rgba(226,55,68,0.3)' }}
        >
          🍱
        </div>
        <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>MessLoo</h1>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Your VIT-AP mess, reimagined.
        </p>
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-3xl p-6"
        style={{
          background: '#FFFFFF',
          border: '1px solid #F0E6D3',
          boxShadow: '0 8px 40px rgba(226,55,68,0.1)',
        }}
      >
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/login"
          forceRedirectUrl="/"
          fallbackRedirectUrl="/"
          appearance={clerkAppearance}
        />
      </div>

      <p className="relative mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        © {new Date().getFullYear()} MessLoo · VIT-AP
      </p>
    </div>
  )
}
