import { SignIn } from '@clerk/react'

const clerkAppearance = {
  variables: {
    colorPrimary: '#c084fc',
    colorBackground: '#15151c',
    colorInputBackground: '#1f1f29',
    colorInputText: '#f3f4f6',
    colorText: '#f3f4f6',
    colorTextSecondary: '#9ca3af',
    colorDanger: '#f87171',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full',
    card: 'bg-[#15151c] border border-white/10 shadow-2xl shadow-black/40',
    headerTitle: 'text-gray-100',
    headerSubtitle: 'text-gray-400',
    socialButtonsBlockButton: 'border border-white/10 hover:bg-white/5 text-gray-200',
    formButtonPrimary: 'bg-purple-500 hover:bg-purple-400 text-black font-medium',
    formFieldInput: 'bg-[#1f1f29] border border-white/10 text-gray-100',
    formFieldLabel: 'text-gray-300',
    footerActionText: 'text-gray-400',
    footerActionLink: 'text-purple-400 hover:text-purple-300',
    identityPreviewText: 'text-gray-300',
    identityPreviewEditButton: 'text-purple-400',
    dividerLine: 'bg-white/10',
    dividerText: 'text-gray-500',
  },
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#0b0b10] flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="h-12 w-12 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-2xl">
          🍽️
        </div>
        <h1 className="text-2xl font-semibold text-gray-100 tracking-tight">MessLoo</h1>
        <p className="text-sm text-gray-500">VIT-AP mess, sorted out.</p>
      </div>

      <div className="w-full max-w-sm">
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/login"
          forceRedirectUrl="/"
          fallbackRedirectUrl="/"
          appearance={clerkAppearance}
        />
      </div>

      <p className="mt-8 text-xs text-gray-600">© {new Date().getFullYear()} MessLoo · VIT-AP</p>
    </div>
  )
}
