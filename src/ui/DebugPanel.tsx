import { useMemo } from 'react'
import type { DebugEntry } from '../store/debugStore'

interface DebugPanelProps {
  enabled: boolean
  entries: DebugEntry[]
  onToggle: (enabled: boolean) => void
  onClear: () => void
}

function formatEntry(entry: DebugEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString()
  const data = Object.entries(entry.data)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ')
  return `[${time}] ${entry.label}.${entry.phase} ${data}`
}

export default function DebugPanel({ enabled, entries, onToggle, onClear }: DebugPanelProps) {
  const text = useMemo(() => entries.map(formatEntry).join('\n'), [entries])

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Ignore clipboard errors
    }
  }

  return (
    <section className="debug-panel">
      <div className="panel-header">
        <div>
          <h2>Debug Console</h2>
          <p className="panel-meta">Structured render logs for troubleshooting</p>
        </div>
        <div className="debug-controls">
          <label className="debug-toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
            />
            Enable logs
          </label>
          <button className="ghost-button" type="button" onClick={handleCopy} disabled={!entries.length}>
            Copy
          </button>
          <button className="ghost-button" type="button" onClick={onClear} disabled={!entries.length}>
            Clear
          </button>
        </div>
      </div>
      <div className="debug-log" role="log" aria-live="polite">
        {entries.length === 0 ? (
          <p className="panel-meta">No logs yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="debug-line">
              {formatEntry(entry)}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
