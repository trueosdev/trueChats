"use client"

import { useState } from 'react'
import { ArrowLeft, Search, X, Globe, Lock, Mail } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Button } from '../ui/button'
import { createLoom } from '@/lib/services/looms'
import { useAuth } from '@/hooks/useAuth'
import type { LoomVisibility } from '@/app/data'

const LOOM_ICONS = [
  'Users', 'UsersRound', 'MessageCircle', 'MessagesSquare', 'Hash',
  'Heart', 'Star', 'Crown', 'Trophy', 'Award',
  'Coffee', 'Pizza', 'Gamepad2', 'Music', 'Headphones',
  'Briefcase', 'GraduationCap', 'Building', 'School',
  'Home', 'Camera', 'Film', 'Book', 'BookOpen',
  'Code', 'Terminal', 'Cpu', 'Palette', 'Paintbrush',
  'Sparkles', 'Zap', 'Flame', 'Globe', 'Compass',
  'Shield', 'Rocket', 'Atom',
] as const

interface CreateLoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoomCreated: (loomId: string) => void
}

export function CreateLoomDialog({ open, onOpenChange, onLoomCreated }: CreateLoomDialogProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<'name' | 'icon'>('name')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<LoomVisibility>('private')
  const [iconName, setIconName] = useState('Users')
  const [iconSearch, setIconSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredIcons = LOOM_ICONS.filter(name =>
    name.toLowerCase().includes(iconSearch.toLowerCase())
  )

  const handleCreate = async () => {
    if (!user || !name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const loom = await createLoom({
        name: name.trim(),
        description: description.trim() || undefined,
        iconName,
        visibility,
        createdBy: String(user.id),
      })
      if (loom) {
        onLoomCreated(loom.id)
        onOpenChange(false)
        resetForm()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create Loom')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setVisibility('private')
    setIconName('Users')
    setIconSearch('')
    setStep('name')
    setError(null)
  }

  if (!open) return null

  const visibilityOptions: { value: LoomVisibility; label: string; icon: typeof Globe; desc: string }[] = [
    { value: 'public', label: 'Public', icon: Globe, desc: 'Anyone can find and join' },
    { value: 'private', label: 'Private', icon: Lock, desc: 'Members only, hidden from search' },
    { value: 'invite_only', label: 'Invite Only', icon: Mail, desc: 'Join by invitation' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-white/10">
      <div className="bg-white dark:bg-[#111] border border-black/15 dark:border-white/15 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/10 dark:border-white/10">
          {step === 'icon' && (
            <button onClick={() => setStep('name')} className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="text-lg font-semibold text-black dark:text-white flex-1">
            Create a Loom
          </h2>
          <button
            onClick={() => { onOpenChange(false); resetForm() }}
            className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {step === 'name' ? (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">{error}</p>
              )}

              {/* Icon preview + picker trigger */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setStep('icon')}
                  className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 border-2 border-dashed border-black/20 dark:border-white/20 flex items-center justify-center hover:border-black/40 dark:hover:border-white/40 transition-colors shrink-0"
                >
                  {(() => {
                    const Icon = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>
                    return Icon ? <Icon size={28} className="text-black/60 dark:text-white/60" /> : null
                  })()}
                </button>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Loom name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(null) }}
                    autoFocus
                    className="w-full bg-transparent text-lg font-medium outline-none border-none text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
                  />
                  <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">Click icon to customize</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  placeholder="What's this Loom about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2 text-sm outline-none border border-black/10 dark:border-white/10 focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-2 uppercase tracking-wide">
                  Visibility
                </label>
                <div className="space-y-1.5">
                  {visibilityOptions.map((opt) => {
                    const Icon = opt.icon
                    const selected = visibility === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setVisibility(opt.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          selected
                            ? 'bg-black/10 dark:bg-white/10'
                            : 'hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <Icon size={16} className="text-black/60 dark:text-white/60 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black dark:text-white">{opt.label}</p>
                          <p className="text-xs text-black/50 dark:text-white/50">{opt.desc}</p>
                        </div>
                        {selected && (
                          <div className="w-2 h-2 rounded-full bg-black dark:bg-white shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-black/10 dark:border-white/10">
              <Button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="w-full"
              >
                {creating ? 'Creating...' : 'Create Loom'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-black/10 dark:border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
                <input
                  type="text"
                  placeholder="Search icons..."
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 bg-black/5 dark:bg-white/5 rounded-lg text-sm outline-none border border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-6 gap-2">
                {filteredIcons.map((name) => {
                  const Icon = LucideIcons[name as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>
                  const selected = iconName === name
                  return (
                    <button
                      key={name}
                      onClick={() => { setIconName(name); setStep('name') }}
                      className={`p-3 rounded-lg flex items-center justify-center transition-colors ${
                        selected
                          ? 'bg-black/10 dark:bg-white/10 ring-2 ring-black dark:ring-white'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      title={name}
                    >
                      {Icon && <Icon size={22} className="text-black dark:text-white" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
