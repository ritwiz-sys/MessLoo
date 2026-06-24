import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../context/UserContext'
import BlockPicker from '../components/BlockPicker'

/**
 * Shown right after sign-in, before the student ever sees their dashboard,
 * so we know which specific block (MH1, MH2, LH3, ...) they belong to.
 */
export default function OnboardingPage() {
  const navigate = useNavigate()
  const { profile, updateBlock } = useUserContext()

  const handleSelect = async (blockId) => {
    await updateBlock(blockId)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen w-full bg-[#0b0b10] flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="h-12 w-12 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-2xl">
          🍽️
        </div>
        <h1 className="text-2xl font-semibold text-gray-100 tracking-tight">
          {profile?.name ? `Welcome, ${profile.name.split(' ')[0]}` : 'Welcome to MessLoo'}
        </h1>
        <p className="text-sm text-gray-500">
          One last step — tell us which block you live in, MH or LH, and we'll automatically know your catering company.
        </p>
      </div>

      <div className="w-full max-w-lg">
        <BlockPicker onSelect={handleSelect} />
      </div>
    </div>
  )
}
