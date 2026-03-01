import { useState, useEffect } from 'react'
import { llmService } from '@/services/llm/llm-service'
import { OpenAICompatibleProvider } from '@/services/llm/providers/openai-compatible'
import { AnthropicProvider } from '@/services/llm/providers/anthropic'
import { saveProviders } from '@/services/persistence-service'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { generateId } from '@/lib/uuid'
import type { LLMProvider, LLMProviderType, PersistedProvider } from '@/types'

const inputClass =
  'bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1 text-xs text-ctp-subtext1 outline-none focus:border-ctp-accent transition-colors w-full'

interface ProviderFormState {
  name: string
  type: LLMProviderType
  apiBase: string
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

const DEFAULT_FORM: ProviderFormState = {
  name: '',
  type: 'openai-compatible',
  apiBase: '',
  apiKey: '',
  model: '',
  maxTokens: 2048,
  temperature: 0.7,
}

const DEFAULTS_BY_TYPE: Record<LLMProviderType, Partial<ProviderFormState>> = {
  'openai-compatible': { apiBase: 'http://localhost:11434/v1', model: 'llama3.2' },
  'anthropic': { apiBase: 'https://api.anthropic.com', model: 'claude-haiku-4-5-20251001' },
}

function buildProvider(id: string, form: ProviderFormState): LLMProvider {
  const config = {
    apiBase: form.apiBase,
    apiKey: form.apiKey,
    model: form.model,
    maxTokens: form.maxTokens,
    temperature: form.temperature,
  }
  if (form.type === 'anthropic') {
    return new AnthropicProvider(id, form.name, config)
  }
  return new OpenAICompatibleProvider(id, form.name, config)
}

function persistProviders(providers: LLMProvider[]) {
  const persisted: PersistedProvider[] = providers.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    config: { apiBase: p.config.apiBase, model: p.config.model, maxTokens: p.config.maxTokens, temperature: p.config.temperature },
    apiKey: p.config.apiKey,
  }))
  saveProviders(persisted).catch((err) => console.error('Failed to save providers:', err))
}

interface ProviderRowProps {
  provider: LLMProvider
  isActive: boolean
  onSetActive: () => void
  onEdit: () => void
  onDelete: () => void
}

function ProviderRow({ provider, isActive, onSetActive, onEdit, onDelete }: ProviderRowProps) {
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  async function handleTest() {
    setTestState('testing')
    setTestError(null)
    const result = await llmService.testConnection(provider.id)
    if (result.success) {
      setTestState('ok')
    } else {
      setTestState('error')
      setTestError(result.error ?? 'Unknown error')
    }
  }

  const maskedKey = provider.config.apiKey
    ? `${provider.config.apiKey.slice(0, 4)}${'•'.repeat(Math.min(16, provider.config.apiKey.length - 4))}`
    : '(none)'

  return (
    <div className={`rounded border p-2.5 space-y-1.5 ${isActive ? 'border-ctp-accent bg-ctp-surface0' : 'border-ctp-surface1 bg-ctp-base'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-ctp-text truncate">{provider.name}</span>
            <span className="text-[10px] text-ctp-overlay0 shrink-0">{provider.type}</span>
            {isActive && (
              <span className="text-[10px] text-ctp-accent shrink-0 font-medium">default</span>
            )}
          </div>
          <div className="text-[10px] text-ctp-overlay1 truncate">{provider.config.apiBase} · {provider.config.model}</div>
          <div className="text-[10px] text-ctp-overlay0">Key: {maskedKey}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleTest}
            disabled={testState === 'testing'}
            className="px-1.5 py-0.5 rounded text-[10px] bg-ctp-surface1 text-ctp-subtext0 hover:bg-ctp-surface2 disabled:opacity-50 transition-colors"
          >
            {testState === 'testing' ? 'Testing…' : 'Test'}
          </button>
          {!isActive && (
            <button
              onClick={onSetActive}
              className="px-1.5 py-0.5 rounded text-[10px] bg-ctp-surface1 text-ctp-subtext0 hover:bg-ctp-surface2 transition-colors"
            >
              Set default
            </button>
          )}
          <button
            onClick={onEdit}
            className="px-1.5 py-0.5 rounded text-[10px] text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-1.5 py-0.5 rounded text-[10px] text-ctp-red hover:bg-ctp-red/10 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
      {testState === 'ok' && (
        <p className="text-[10px] text-ctp-green">Connection successful</p>
      )}
      {testState === 'error' && (
        <p className="text-[10px] text-ctp-red">Error: {testError}</p>
      )}
    </div>
  )
}

interface ProviderFormProps {
  initial: ProviderFormState
  onSave: (form: ProviderFormState) => void
  onCancel: () => void
}

function ProviderForm({ initial, onSave, onCancel }: ProviderFormProps) {
  const [form, setForm] = useState<ProviderFormState>(initial)

  function update<K extends keyof ProviderFormState>(key: K, value: ProviderFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleTypeChange(type: LLMProviderType) {
    const defaults = DEFAULTS_BY_TYPE[type]
    setForm((f) => ({ ...f, type, ...defaults }))
  }

  return (
    <div className="border border-ctp-surface1 rounded p-3 space-y-2 bg-ctp-surface0/50">
      <p className="text-[10px] font-semibold text-ctp-overlay0 uppercase tracking-widest mb-2">
        {initial.name ? 'Edit Provider' : 'New Provider'}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-ctp-overlay1">Name</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="My Ollama"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-ctp-overlay1">Type</label>
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => handleTypeChange(e.target.value as LLMProviderType)}
          >
            <option value="openai-compatible">OpenAI-compatible</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-ctp-overlay1">API Base URL</label>
        <input
          className={inputClass}
          value={form.apiBase}
          onChange={(e) => update('apiBase', e.target.value)}
          placeholder="http://localhost:11434/v1"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-ctp-overlay1">API Key</label>
        <input
          className={inputClass}
          type="password"
          autoComplete="off"
          value={form.apiKey}
          onChange={(e) => update('apiKey', e.target.value)}
          placeholder="Leave empty for keyless endpoints"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-ctp-overlay1">Model</label>
          <input
            className={inputClass}
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            placeholder="llama3.2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-ctp-overlay1">Max Tokens</label>
          <input
            className={inputClass}
            type="number"
            min={1}
            max={128000}
            value={form.maxTokens}
            onChange={(e) => update('maxTokens', Number(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-ctp-overlay1">Temperature</label>
          <input
            className={inputClass}
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={form.temperature}
            onChange={(e) => update('temperature', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={!form.name || !form.apiBase || !form.model}
          className="px-3 py-1 rounded text-xs bg-ctp-accent text-ctp-base font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded text-xs text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function ProviderSettingsPanel() {
  const [providers, setProviders] = useState<LLMProvider[]>(() => llmService.listProviders())
  const activeLlmProviderId = useWorkspaceStore((s) => s.activeLlmProviderId)
  const setActiveLlmProviderId = useWorkspaceStore((s) => s.setActiveLlmProviderId)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function refresh() {
    setProviders(llmService.listProviders())
  }

  // Sync active provider if it was deleted
  useEffect(() => {
    if (activeLlmProviderId && !providers.some((p) => p.id === activeLlmProviderId)) {
      setActiveLlmProviderId(providers[0]?.id ?? null)
    }
  }, [providers, activeLlmProviderId, setActiveLlmProviderId])

  function handleSaveNew(form: ProviderFormState) {
    const id = generateId()
    const provider = buildProvider(id, form)
    llmService.registerProvider(provider)
    if (!activeLlmProviderId) {
      setActiveLlmProviderId(id)
    }
    refresh()
    persistProviders(llmService.listProviders())
    setShowForm(false)
  }

  function handleSaveEdit(id: string, form: ProviderFormState) {
    llmService.removeProvider(id)
    const provider = buildProvider(id, form)
    llmService.registerProvider(provider)
    refresh()
    persistProviders(llmService.listProviders())
    setEditingId(null)
  }

  function handleDelete(id: string) {
    llmService.removeProvider(id)
    if (activeLlmProviderId === id) {
      const remaining = llmService.listProviders()
      setActiveLlmProviderId(remaining[0]?.id ?? null)
    }
    refresh()
    persistProviders(llmService.listProviders())
  }

  function formStateFromProvider(p: LLMProvider): ProviderFormState {
    return {
      name: p.name,
      type: p.type,
      apiBase: p.config.apiBase,
      apiKey: p.config.apiKey,
      model: p.config.model,
      maxTokens: p.config.maxTokens,
      temperature: p.config.temperature,
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-semibold text-ctp-overlay0 uppercase tracking-widest">
        LLM Providers
      </p>
      <p className="text-[10px] text-ctp-overlay1 -mt-1">
        Configure AI providers for Deep Analysis. The default provider is used when running AI-powered rules.
      </p>

      {providers.length === 0 && !showForm && (
        <p className="text-xs text-ctp-overlay1 py-2">No providers configured.</p>
      )}

      <div className="space-y-2">
        {providers.map((p) =>
          editingId === p.id ? (
            <ProviderForm
              key={p.id}
              initial={formStateFromProvider(p)}
              onSave={(form) => handleSaveEdit(p.id, form)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <ProviderRow
              key={p.id}
              provider={p}
              isActive={activeLlmProviderId === p.id}
              onSetActive={() => setActiveLlmProviderId(p.id)}
              onEdit={() => { setShowForm(false); setEditingId(p.id) }}
              onDelete={() => handleDelete(p.id)}
            />
          )
        )}
      </div>

      {showForm && !editingId && (
        <ProviderForm
          initial={DEFAULT_FORM}
          onSave={handleSaveNew}
          onCancel={() => setShowForm(false)}
        />
      )}

      {!showForm && !editingId && (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs text-ctp-accent hover:underline self-start"
        >
          + Add Provider
        </button>
      )}
    </div>
  )
}
