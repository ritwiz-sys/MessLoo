import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/react'
import { api } from '../lib/api'
import { useUserContext } from '../context/UserContext'
import TopBar from '../components/TopBar'

const MEAL_TYPES = ['breakfast', 'lunch', 'snacks', 'dinner']

function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

const emptyForm = {
  block_category: '',
  date: todayISO(),
  meal_type: 'breakfast',
  items: '',
  is_special: false,
}

const emptyNewBlock = { block_name: '', block_category: '', catering_company: '' }

export default function AdminDashboard() {
  const { getToken } = useAuth()
  const { profile } = useUserContext()

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState(null)
  const [formError, setFormError] = useState(null)

  const [summaryCategory, setSummaryCategory] = useState('')
  const [summaryRows, setSummaryRows] = useState([])
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState(null)

  // Full block management — list + create/edit/delete, so admins never have
  // to touch Supabase directly to add a block or change its catering company.
  const [blocks, setBlocks] = useState([])
  const [blocksLoading, setBlocksLoading] = useState(true)
  const [blocksError, setBlocksError] = useState(null)
  const [newBlock, setNewBlock] = useState(emptyNewBlock)
  const [addingBlock, setAddingBlock] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyNewBlock)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadBlocks = useCallback(async () => {
    setBlocksLoading(true)
    setBlocksError(null)
    try {
      const res = await api.getBlocks()
      const list = res?.data || []
      setBlocks(list)

      const unique = [...new Set(list.map((b) => b.block_category).filter(Boolean))]
      const fallback = unique.length ? unique : ['MH', 'LH']
      setCategories(fallback)
      setForm((f) => ({ ...f, block_category: f.block_category || fallback[0] }))
      setSummaryCategory((c) => c || fallback[0])
      setNewBlock((nb) => ({ ...nb, block_category: nb.block_category || fallback[0] }))
    } catch (err) {
      setBlocksError(err.message || 'Failed to load blocks')
      setCategories((c) => (c.length ? c : ['MH', 'LH']))
    } finally {
      setBlocksLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBlocks()
  }, [loadBlocks])

  const loadSummary = useCallback(async () => {
    if (!summaryCategory) return
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const token = await getToken()
      const today = todayISO()
      const menusRes = await api.getMenus(token, { date: today, block_category: summaryCategory })
      const menus = menusRes?.data || []

      const rows = await Promise.all(
        MEAL_TYPES.map(async (mealType) => {
          const menu = menus.find((m) => m.meal_type === mealType)
          if (!menu) {
            return { mealType, menu: null, summary: null }
          }
          try {
            const summaryRes = await api.getAttendanceSummary(token, menu.id)
            return { mealType, menu, summary: summaryRes?.data || null }
          } catch (err) {
            return { mealType, menu, summary: null, error: err.message }
          }
        }),
      )

      setSummaryRows(rows)
    } catch (err) {
      setSummaryError(err.message || 'Failed to load attendance summary')
    } finally {
      setSummaryLoading(false)
    }
  }, [getToken, summaryCategory])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormMessage(null)
    setFormError(null)
    try {
      const token = await getToken()
      await api.addMenu(token, {
        block_category: form.block_category,
        date: form.date,
        meal_type: form.meal_type,
        items: form.items,
        is_special: form.is_special,
      })
      setFormMessage('Menu item added.')
      setForm((f) => ({ ...emptyForm, block_category: f.block_category, date: f.date }))
      if (form.block_category === summaryCategory && form.date === todayISO()) {
        loadSummary()
      }
    } catch (err) {
      setFormError(err.message || 'Failed to add menu item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddBlock = async (e) => {
    e.preventDefault()
    if (!newBlock.block_name || !newBlock.block_category) return
    setAddingBlock(true)
    setBlocksError(null)
    try {
      const token = await getToken()
      await api.addBlock(token, {
        block_name: newBlock.block_name,
        block_category: newBlock.block_category,
        catering_company: newBlock.catering_company || null,
      })
      setNewBlock((nb) => ({ ...emptyNewBlock, block_category: nb.block_category }))
      await loadBlocks()
    } catch (err) {
      setBlocksError(err.message || 'Failed to add block')
    } finally {
      setAddingBlock(false)
    }
  }

  const startEditBlock = (block) => {
    setEditingId(block.id)
    setEditForm({
      block_name: block.block_name || '',
      block_category: block.block_category || '',
      catering_company: block.catering_company || '',
    })
  }

  const cancelEditBlock = () => {
    setEditingId(null)
    setEditForm(emptyNewBlock)
  }

  const handleSaveEditBlock = async (id) => {
    setSavingEdit(true)
    setBlocksError(null)
    try {
      const token = await getToken()
      await api.updateBlock(token, id, {
        block_name: editForm.block_name,
        block_category: editForm.block_category,
        catering_company: editForm.catering_company || null,
      })
      cancelEditBlock()
      await loadBlocks()
    } catch (err) {
      setBlocksError(err.message || 'Failed to update block')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteBlock = async (id) => {
    setDeletingId(id)
    setBlocksError(null)
    try {
      const token = await getToken()
      await api.deleteBlock(token, id)
      await loadBlocks()
    } catch (err) {
      setBlocksError(err.message || 'Failed to delete block')
    } finally {
      setDeletingId(null)
    }
  }

  const totals = useMemo(() => {
    return summaryRows.reduce(
      (acc, row) => {
        if (!row.summary) return acc
        acc.total += row.summary.total_responses || 0
        acc.eating += row.summary.eating || 0
        acc.skipping += row.summary.skipping || 0
        return acc
      },
      { total: 0, eating: 0, skipping: 0 },
    )
  }, [summaryRows])

  // Combine each meal's per-block breakdown into one block-level view for
  // the whole day, so admins can see exactly how MH1 vs MH2 (and their
  // catering companies) are doing, not just the MH category overall.
  const blockTotals = useMemo(() => {
    const map = {}
    for (const row of summaryRows) {
      for (const b of row.summary?.by_block || []) {
        const key = b.block_id ?? b.block_name
        if (!map[key]) {
          map[key] = {
            block_name: b.block_name,
            catering_company: b.catering_company,
            total: 0,
            eating: 0,
            skipping: 0,
            ratingSum: 0,
            ratingCount: 0,
          }
        }
        map[key].total += b.total || 0
        map[key].eating += b.eating || 0
        map[key].skipping += b.skipping || 0
        if (b.avg_rating) {
          map[key].ratingSum += Number(b.avg_rating) * b.total
          map[key].ratingCount += b.total
        }
      }
    }
    return Object.values(map)
      .map((b) => ({
        ...b,
        avgRating: b.ratingCount ? (b.ratingSum / b.ratingCount).toFixed(1) : null,
      }))
      .sort((a, b) => a.block_name.localeCompare(b.block_name))
  }, [summaryRows])

  return (
    <div className="min-h-screen bg-[#0b0b10]">
      <TopBar title={profile?.name || 'Admin'} subtitle="MessLoo · Admin Dashboard" />

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-10">
        <section>
          <h1 className="text-xl font-semibold text-gray-100 mb-1">Manage Blocks</h1>
          <p className="text-sm text-gray-500 mb-5">
            Add new blocks and set or change which catering company serves each one.
          </p>

          {blocksError && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 text-sm p-4 mb-4">
              {blocksError}
            </div>
          )}

          <form
            onSubmit={handleAddBlock}
            className="rounded-2xl border border-white/10 bg-[#15151c] p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Block Name</label>
              <input
                type="text"
                required
                value={newBlock.block_name}
                onChange={(e) => setNewBlock((nb) => ({ ...nb, block_name: e.target.value }))}
                placeholder="e.g. MH8"
                className="rounded-lg bg-[#1f1f29] border border-white/10 text-gray-100 text-sm px-3 py-2"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Category</label>
              <input
                type="text"
                required
                value={newBlock.block_category}
                onChange={(e) => setNewBlock((nb) => ({ ...nb, block_category: e.target.value }))}
                placeholder="MH or LH"
                className="rounded-lg bg-[#1f1f29] border border-white/10 text-gray-100 text-sm px-3 py-2"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Catering Company</label>
              <input
                type="text"
                value={newBlock.catering_company}
                onChange={(e) => setNewBlock((nb) => ({ ...nb, catering_company: e.target.value }))}
                placeholder="e.g. CRCL"
                className="rounded-lg bg-[#1f1f29] border border-white/10 text-gray-100 text-sm px-3 py-2"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={addingBlock}
                className="w-full rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-black text-sm font-medium px-4 py-2 transition-colors"
              >
                {addingBlock ? 'Adding…' : 'Add Block'}
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-white/10 bg-[#15151c] overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 text-gray-500">
                  <th className="px-4 py-3 font-medium">Block</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Catering Company</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blocksLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : blocks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-600 italic">
                      No blocks yet — add one above.
                    </td>
                  </tr>
                ) : (
                  blocks.map((block) => {
                    const isEditing = editingId === block.id
                    return (
                      <tr key={block.id} className="border-b border-white/5 text-gray-200">
                        {isEditing ? (
                          <>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={editForm.block_name}
                                onChange={(e) => setEditForm((f) => ({ ...f, block_name: e.target.value }))}
                                className="w-full rounded-lg bg-[#1f1f29] border border-white/10 text-gray-100 text-sm px-2 py-1.5"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={editForm.block_category}
                                onChange={(e) => setEditForm((f) => ({ ...f, block_category: e.target.value }))}
                                className="w-full rounded-lg bg-[#1f1f29] border border-white/10 text-gray-100 text-sm px-2 py-1.5"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={editForm.catering_company}
                                onChange={(e) => setEditForm((f) => ({ ...f, catering_company: e.target.value }))}
                                className="w-full rounded-lg bg-[#1f1f29] border border-white/10 text-gray-100 text-sm px-2 py-1.5"
                              />
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleSaveEditBlock(block.id)}
                                disabled={savingEdit}
                                className="text-xs text-emerald-400 hover:text-emerald-300 mr-3 disabled:opacity-50"
                              >
                                {savingEdit ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditBlock}
                                className="text-xs text-gray-400 hover:text-gray-300"
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3">{block.block_name}</td>
                            <td className="px-4 py-3">{block.block_category}</td>
                            <td className="px-4 py-3 text-gray-400">{block.catering_company || '—'}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => startEditBlock(block)}
                                className="text-xs text-purple-400 hover:text-purple-300 mr-3"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBlock(block.id)}
                                disabled={deletingId === block.id}
                                className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-50"
                              >
                                {deletingId === block.id ? 'Deleting…' : 'Delete'}
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h1 className="text-xl font-semibold text-gray-100 mb-1">Add Menu Item</h1>
          <p className="text-sm text-gray-500 mb-5">Post today's (or any day's) menu for a block category.</p>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-[#15151c] p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Block Category</label>
              <select
                value={form.block_category}
                onChange={(e) => setForm((f) => ({ ...f, block_category: e.target.value }))}
                className="rounded-lg bg-[#1f1f29] border border-white/10 text-gray-100 text-sm px-3 py-2"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="rounded-lg bg-[#1f1f29] border border-white/10 text-gray-100 text-sm px-3 py-2"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Meal Type</label>
              <select
                value={form.meal_type}
                onChange={(e) => setForm((f) => ({ ...f, meal_type: e.target.value }))}
                className="rounded-lg bg-[#1f1f29] border border-white/10 text-gray-100 text-sm px-3 py-2"
              >
                {MEAL_TYPES.map((m) => (
                  <option key={m} value={m}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2.5 text-sm text-gray-300 select-none cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={form.is_special}
                  onChange={(e) => setForm((f) => ({ ...f, is_special: e.target.checked }))}
                  className="h-4 w-4 rounded accent-purple-500"
                />
                Special meal
              </label>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Items</label>
              <textarea
                required
                value={form.items}
                onChange={(e) => setForm((f) => ({ ...f, items: e.target.value }))}
                placeholder="e.g. Idli, Sambar, Coconut Chutney, Filter Coffee"
                rows={3}
                className="rounded-lg bg-[#1f1f29] border border-white/10 text-gray-100 text-sm px-3 py-2 resize-none"
              />
            </div>

            {formError && <p className="sm:col-span-2 text-xs text-red-400">{formError}</p>}
            {formMessage && <p className="sm:col-span-2 text-xs text-emerald-400">{formMessage}</p>}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-black text-sm font-medium px-5 py-2.5 transition-colors"
              >
                {submitting ? 'Adding…' : 'Add Menu Item'}
              </button>
            </div>
          </form>
        </section>

        <section>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-100 mb-1">Today's Attendance Summary</h1>
              <p className="text-sm text-gray-500">Responses recorded per meal for today.</p>
            </div>
            <select
              value={summaryCategory}
              onChange={(e) => setSummaryCategory(e.target.value)}
              className="rounded-lg bg-[#1f1f29] border border-white/10 text-gray-100 text-sm px-3 py-2"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  Block {c}
                </option>
              ))}
            </select>
          </div>

          {summaryError && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 text-sm p-4 mb-4">
              {summaryError}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-[#15151c] overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 text-gray-500">
                  <th className="px-4 py-3 font-medium">Meal</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Eating</th>
                  <th className="px-4 py-3 font-medium">Skipping</th>
                  <th className="px-4 py-3 font-medium">Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {summaryLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : (
                  summaryRows.map((row) => (
                    <tr key={row.mealType} className="border-b border-white/5 text-gray-200">
                      <td className="px-4 py-3 capitalize">{row.mealType}</td>
                      {row.menu ? (
                        <>
                          <td className="px-4 py-3">{row.summary?.total_responses ?? '—'}</td>
                          <td className="px-4 py-3 text-emerald-400">{row.summary?.eating ?? '—'}</td>
                          <td className="px-4 py-3 text-rose-400">{row.summary?.skipping ?? '—'}</td>
                          <td className="px-4 py-3">
                            {row.summary?.avg_rating ? `★ ${row.summary.avg_rating}` : '—'}
                          </td>
                        </>
                      ) : (
                        <td colSpan={4} className="px-4 py-3 text-gray-600 italic">
                          No menu posted today
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {!summaryLoading && summaryRows.some((r) => r.menu) && (
                <tfoot>
                  <tr className="border-t border-white/10 text-gray-400 font-medium">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3">{totals.total}</td>
                    <td className="px-4 py-3 text-emerald-400">{totals.eating}</td>
                    <td className="px-4 py-3 text-rose-400">{totals.skipping}</td>
                    <td className="px-4 py-3">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <section>
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-gray-100 mb-1">By Block</h1>
            <p className="text-sm text-gray-500">
              Same day's responses, broken down by specific block — and the catering company serving it.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#15151c] overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 text-gray-500">
                  <th className="px-4 py-3 font-medium">Block</th>
                  <th className="px-4 py-3 font-medium">Catering Company</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Eating</th>
                  <th className="px-4 py-3 font-medium">Skipping</th>
                  <th className="px-4 py-3 font-medium">Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {summaryLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : blockTotals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-600 italic">
                      No responses yet for this category today.
                    </td>
                  </tr>
                ) : (
                  blockTotals.map((b) => (
                    <tr key={b.block_name} className="border-b border-white/5 text-gray-200">
                      <td className="px-4 py-3">{b.block_name}</td>
                      <td className="px-4 py-3 text-gray-400">{b.catering_company || '—'}</td>
                      <td className="px-4 py-3">{b.total}</td>
                      <td className="px-4 py-3 text-emerald-400">{b.eating}</td>
                      <td className="px-4 py-3 text-rose-400">{b.skipping}</td>
                      <td className="px-4 py-3">{b.avgRating ? `★ ${b.avgRating}` : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
