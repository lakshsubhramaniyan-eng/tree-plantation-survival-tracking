import { useState } from 'react'
import './AiNoteAssistant.css'

type AiNoteAssistantProps = { token: string }
type AutocompleteResponse = { suggestion?: string; error?: string }

const sampleDetails = 'Leaves on several seedlings are yellowing and the soil around the roots is dry. No tree counts were taken.'

export function AiNoteAssistant({ token }: AiNoteAssistantProps) {
  const [details, setDetails] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  async function generateSuggestion() {
    setError('')
    setSuggestion('')
    setIsGenerating(true)
    try {
      const response = await fetch('/api/auth/autocomplete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: details }),
      })
      const result = await response.json() as AutocompleteResponse
      if (!response.ok || !result.suggestion) {
        setError(result.error ?? 'Could not generate a note. Please try again.')
        return
      }
      setSuggestion(result.suggestion)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function copySuggestion() {
    try {
      await navigator.clipboard.writeText(suggestion)
      setError('Copied. Review the draft before adding it to your observation.')
    } catch {
      setError('Could not copy the draft. Select the text and copy it manually.')
    }
  }

  return (
    <section className="panel ai-note-panel" aria-labelledby="ai-note-title">
      <div className="panel-heading">
        <div><p className="eyebrow">AI-assisted writing</p><h2 id="ai-note-title">Field note autocomplete</h2></div>
        <span className="ai-note-badge" aria-hidden="true">AI</span>
      </div>
      <p className="ai-note-description">Describe what you observed. AI will draft a concise note using only your details; review it before recording.</p>
      <label className="ai-note-label" htmlFor="ai-note-details">Observation details</label>
      <textarea
        id="ai-note-details"
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        maxLength={600}
        placeholder="For example: several seedlings have yellow leaves; soil is dry around the roots."
        rows={3}
      />
      <div className="ai-note-actions">
        <button className="upload-template" type="button" onClick={() => setDetails(sampleDetails)}>Use sample</button>
        <button className="button button--primary" type="button" onClick={generateSuggestion} disabled={details.trim().length < 10 || isGenerating}>
          {isGenerating ? 'Generating…' : 'Generate note'}
        </button>
      </div>
      {error && <p className="ai-note-message" role="status">{error}</p>}
      {suggestion && (
        <div className="ai-note-result">
          <label className="ai-note-label" htmlFor="ai-note-suggestion">Suggested note (editable)</label>
          <textarea id="ai-note-suggestion" value={suggestion} onChange={(event) => setSuggestion(event.target.value)} rows={3} />
          <button className="button button--outline" type="button" onClick={copySuggestion}>Copy note</button>
        </div>
      )}
      <p className="ai-note-footnote">AI drafts may be inaccurate. Confirm every detail; do not include sensitive personal information.</p>
    </section>
  )
}
