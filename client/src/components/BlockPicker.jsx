import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

// Normalizes whatever field names the blocks table actually uses, so this
// keeps working regardless of exact column naming in Supabase.
function normalizeBlock(b) {
  return {
    id: b.id,
    name: b.name || b.block_name || b.label || `Block ${b.id}`,
    category: b.block_category || b.category || 'Other',
    cateringCompany: b.catering_company || null,
  }
}

export default function BlockPicker({ onSelect }) {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .getBlocks()
      .then((res) => {
        if (cancelled) return
        setBlocks((res?.data || []).map(normalizeBlock))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load blocks')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const grouped = useMemo(() => {
    const map = {}
    for (const block of blocks) {
      map[block.category] = map[block.category] || []
      map[block.category].push(block)
    }
    return map
  }, [blocks])

  const categories = Object.keys(grouped).sort()

  const handleConfirm = async () => {
    if (!selectedId) return
    setSubmitting(true)
    setError(null)
    try {
      await onSelect(selectedId)
    } catch (err) {
      setError(err.message || 'Failed to save your block')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#15151c] p-6 max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-100 mb-1">Which block are you in?</h2>
      <p className="text-sm text-gray-500 mb-5">
        Pick your hostel block — MH or LH — and we'll automatically know which catering company serves you.
      </p>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 text-sm p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg border border-white/5 bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No blocks have been set up yet. Contact your mess admin.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {categories.map((category) => (
            <div key={category}>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{category}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {grouped[category].map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => setSelectedId(block.id)}
                    className={`flex flex-col items-start rounded-lg border text-sm py-2 px-3 transition-colors ${
                      selectedId === block.id
                        ? 'border-purple-400 bg-purple-500/15 text-purple-200'
                        : 'border-white/10 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{block.name}</span>
                    {block.cateringCompany && (
                      <span className="text-[11px] text-gray-500">{block.cateringCompany}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedId && (() => {
        const selected = blocks.find((b) => b.id === selectedId)
        return selected?.cateringCompany ? (
          <p className="mt-4 text-xs text-gray-500">
            Catering company: <span className="text-gray-300">{selected.cateringCompany}</span>
          </p>
        ) : null
      })()}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selectedId || submitting}
        className="mt-6 w-full rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-black text-sm font-medium py-2.5 transition-colors"
      >
        {submitting ? 'Saving…' : 'Confirm my block'}
      </button>
    </div>
  )
}
