"use client"

import { useState } from 'react'
import { X, Hash, Lock } from 'lucide-react'
import { Button } from '../ui/button'
import { createThread } from '@/lib/services/threads'
import { useAuth } from '@/hooks/useAuth'
import type { ThreadType } from '@/app/data'

interface CreateThreadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loomId: string
  onThreadCreated: (threadId: string) => void
}

export function CreateThreadDialog({ open, onOpenChange, loomId, onThreadCreated }: CreateThreadDialogProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ThreadType>('open')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!user || !name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const thread = await createThread({
        loomId,
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        createdBy: String(user.id),
      })
      if (thread) {
        onThreadCreated(thread.id)
        onOpenChange(false)
        resetForm()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create Thread')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setType('open')
    setError(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-white/10">
      <div className="bg-white dark:bg-[#111] border border-black/15 dark:border-white/15 rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-lg font-semibold text-black dark:text-white">New Thread</h2>
          <button
            onClick={() => { onOpenChange(false); resetForm() }}
            className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5 uppercase tracking-wide">
              Thread Name
            </label>
            <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 px-3">
              <Hash size={16} className="text-black/40 dark:text-white/40 shrink-0" />
              <input
                type="text"
                placeholder="general"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null) }}
                autoFocus
                className="flex-1 bg-transparent py-2.5 text-sm outline-none text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5 uppercase tracking-wide">
              Description
            </label>
            <input
              type="text"
              placeholder="What's this thread about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2.5 text-sm outline-none border border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-2 uppercase tracking-wide">
              Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setType('open')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  type === 'open'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <Hash size={14} />
                Open
              </button>
              <button
                onClick={() => setType('private')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  type === 'private'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <Lock size={14} />
                Private
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-black/10 dark:border-white/10">
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="w-full"
          >
            {creating ? 'Creating...' : 'Create Thread'}
          </Button>
        </div>
      </div>
    </div>
  )
}
