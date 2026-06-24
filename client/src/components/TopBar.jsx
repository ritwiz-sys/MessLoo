import { UserButton } from '@clerk/react'

export default function TopBar({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-8 py-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-lg">
          🍽️
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-100 leading-tight">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 leading-tight">{subtitle}</p>}
        </div>
      </div>
      <UserButton
        appearance={{
          elements: {
            userButtonPopoverCard: 'bg-[#15151c] border border-white/10',
            userButtonPopoverText: 'text-gray-200',
            userButtonPopoverActionButtonText: 'text-gray-200',
          },
        }}
      />
    </div>
  )
}
