import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Activity, ArrowDownToLine, ArrowUpRight, BookOpen, Check, CheckCircle2,
  ChevronDown, CircleHelp, FlaskConical, Gauge, GitBranch, Layers3, LoaderCircle,
  MessageSquareText, Plus, RotateCcw, Send, Settings2, SlidersHorizontal,
  Sparkles, Trash2, X, Zap,
} from 'lucide-react'
import { checkConnection, complete, type ChatMessage, type ModelSettings } from './model'

type View = 'playground' | 'skills' | 'evaluations'
type Skill = { id: string; name: string; description: string; prompt: string; enabled: boolean }
type EvalCase = { id: string; name: string; prompt: string; expected: string }
type EvalResult = { id: string; output: string; passed: boolean; error?: string }

const initialSkills: Skill[] = [
  {
    id: 'research-brief', name: 'Research brief', description: 'Clear, sourced-feeling summaries without the fluff.', enabled: true,
    prompt: 'Write a compact research brief. Lead with the key finding, separate facts from uncertainty, and use short sections when useful.',
  },
  {
    id: 'careful-coder', name: 'Careful coder', description: 'Small, explained changes with edge cases in view.', enabled: true,
    prompt: 'Act as a careful software engineer. Prefer the smallest correct change, explain relevant tradeoffs, and call out assumptions or edge cases.',
  },
  {
    id: 'plain-language', name: 'Plain language', description: 'Make complex ideas easy to scan and understand.', enabled: false,
    prompt: 'Explain the answer in plain language. Use concrete examples, avoid jargon, and keep paragraphs short.',
  },
]

const initialCases: EvalCase[] = [
  { id: 'summary', name: 'Short summary', prompt: 'Summarize: The observatory opened in 1984. It now hosts 12 researchers and tracks near-Earth asteroids every clear night.', expected: 'research' },
  { id: 'format', name: 'Follow format', prompt: 'Give exactly three benefits of local AI, as a numbered list.', expected: '3.' },
  { id: 'uncertainty', name: 'State uncertainty', prompt: 'Will it rain in Tokyo tomorrow? You have no access to current weather data.', expected: 'cannot' },
]

const defaultSettings: ModelSettings = {
  baseUrl: 'http://localhost:11434/v1',
  model: 'qwen2.5:7b',
  apiKey: '',
}

function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [view, setView] = useState<View>('playground')
  const [settings, setSettings] = useState<ModelSettings>(() => loadStored('tidepool:model', defaultSettings))
  const [skills, setSkills] = useState<Skill[]>(() => loadStored('tidepool:skills', initialSkills))
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [connectionState, setConnectionState] = useState<'unknown' | 'checking' | 'connected' | 'error'>('unknown')
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const [temperature, setTemperature] = useState(0.4)
  const [cases, setCases] = useState<EvalCase[]>(initialCases)
  const [results, setResults] = useState<EvalResult[]>([])
  const [runningEvals, setRunningEvals] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const messageEnd = useRef<HTMLDivElement>(null)

  useEffect(() => { localStorage.setItem('tidepool:model', JSON.stringify(settings)) }, [settings])
  useEffect(() => { localStorage.setItem('tidepool:skills', JSON.stringify(skills)) }, [skills])
  useEffect(() => { messageEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  const activeSkill = skills.find((skill) => skill.id === selectedSkill && skill.enabled)
  const activeCount = skills.filter((skill) => skill.enabled).length

  async function sendMessage(event?: FormEvent, prompt = draft) {
    event?.preventDefault()
    const content = prompt.trim()
    if (!content || sending) return
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setDraft('')
    setSending(true)
    setNotice('')
    try {
      const answer = await complete(settings, nextMessages, activeSkill?.prompt, temperature)
      setMessages([...nextMessages, { role: 'assistant', content: answer }])
      setConnectionState('connected')
    } catch (error) {
      setMessages(nextMessages)
      setNotice(error instanceof Error ? error.message : 'Could not reach the model server.')
      setConnectionState('error')
    } finally {
      setSending(false)
    }
  }

  async function testConnection() {
    setConnectionState('checking')
    setNotice('')
    try {
      await checkConnection(settings)
      setConnectionState('connected')
      setNotice('Connected. The model server is responding.')
    } catch (error) {
      setConnectionState('error')
      setNotice(error instanceof Error ? error.message : 'Could not reach the model server.')
    }
  }

  async function runEvaluations() {
    setRunningEvals(true)
    setResults([])
    setNotice('')
    const nextResults: EvalResult[] = []
    for (const testCase of cases) {
      try {
        const output = await complete(settings, [{ role: 'user', content: testCase.prompt }], undefined, temperature)
        nextResults.push({ id: testCase.id, output, passed: output.toLowerCase().includes(testCase.expected.toLowerCase()) })
      } catch (error) {
        nextResults.push({ id: testCase.id, output: '', passed: false, error: error instanceof Error ? error.message : 'Request failed' })
        setNotice('Evaluation stopped early. Check your model connection and run again.')
        break
      }
      setResults([...nextResults])
    }
    setRunningEvals(false)
  }

  function addSkill() {
    const skill: Skill = { id: crypto.randomUUID(), name: 'New skill', description: '', prompt: '', enabled: true }
    setSkills([...skills, skill])
    setEditingSkill(skill)
  }

  function saveSkill(updated: Skill) {
    setSkills((current) => current.map((skill) => skill.id === updated.id ? updated : skill))
    setEditingSkill(null)
  }

  function addEvalCase() {
    setCases((current) => [...current, { id: crypto.randomUUID(), name: 'New test', prompt: '', expected: '' }])
  }

  const nav = [
    { id: 'playground' as const, label: 'Playground', icon: MessageSquareText, count: '' },
    { id: 'skills' as const, label: 'Agent skills', icon: Layers3, count: String(activeCount).padStart(2, '0') },
    { id: 'evaluations' as const, label: 'Evaluations', icon: FlaskConical, count: String(cases.length).padStart(2, '0') },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#playground" onClick={() => setView('playground')} aria-label="Tidepool home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span className="brand-name">tidepool<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-switcher">
          <span className="workspace-icon">T</span>
          <span className="workspace-copy"><strong>Personal space</strong><small>Local workspace</small></span>
          <ChevronDown size={15} />
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Workspace">
          {nav.map(({ id, label, icon: Icon, count }) => (
            <button className={`nav-item ${view === id ? 'active' : ''}`} key={id} onClick={() => setView(id)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{count && <small>{count}</small>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-icon"><GitBranch size={15} /></span>
            <div><strong>Runs on your machine</strong><span>No data leaves by default</span></div>
            <span className="status-dot" />
          </div>
          <button className="profile-button" onClick={() => setSettingsOpen(true)}>
            <span className="avatar">T</span><span className="profile-copy"><strong>Local setup</strong><small>Model preferences</small></span><Settings2 size={16} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Personal space</span><span className="crumb-slash">/</span><strong>{nav.find((item) => item.id === view)?.label}</strong></div>
          <div className="topbar-actions">
            <span className={`connection-pill ${connectionState === 'connected' ? 'is-connected' : connectionState === 'error' ? 'is-error' : ''}`}>
              <span className="connection-dot" />{connectionState === 'connected' ? 'Model ready' : connectionState === 'checking' ? 'Checking' : connectionState === 'error' ? 'Not connected' : 'No model'}
            </span>
            <button className="icon-button top-settings" onClick={() => setSettingsOpen(true)} title="Model settings"><SlidersHorizontal size={17} /></button>
            <a className="github-link" href="https://github.com" target="_blank" rel="noreferrer" title="GitHub project"><ArrowUpRight size={16} /><span>GitHub</span></a>
          </div>
        </header>

        <div className="page-content">
          {view === 'playground' && (
            <>
              <section className="page-heading">
                <div><div className="eyebrow"><span className="eyebrow-line" />OPEN MODEL STUDIO</div><h1>Make a little room<br />for <em>big ideas.</em></h1><p>Try a model, shape an agent, see what holds up.</p></div>
                <div className="heading-illustration" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-core"><Sparkles size={20} /></div><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><span className="orbit-dot dot-three" /></div>
              </section>

              <div className="workbench-grid">
                <section className="chat-panel" aria-label="Model playground">
                  <div className="panel-toolbar">
                    <div className="toolbar-model"><span className="model-glyph"><Zap size={14} fill="currentColor" /></span><span><strong>{settings.model || 'Choose a model'}</strong><small>{settings.baseUrl.replace(/^https?:\/\//, '')}</small></span><ChevronDown size={14} /></div>
                    <div className="toolbar-right"><span className="context-label"><span className="status-dot" />READY</span><button className="icon-button" title="Clear conversation" onClick={() => { setMessages([]); setNotice('') }}><RotateCcw size={15} /></button></div>
                  </div>

                  <div className={`conversation ${messages.length ? 'has-messages' : ''}`}>
                    {messages.length === 0 ? (
                      <div className="empty-conversation">
                        <div className="empty-mark"><Sparkles size={22} /></div>
                        <h2>Start with a question.</h2>
                        <p>Your messages stay in this browser session.</p>
                        <div className="prompt-suggestions">
                          {['Explain embeddings like I build things.', 'What should I know before fine-tuning a model?', 'Help me plan a tiny weekend project.'].map((prompt) => <button key={prompt} onClick={() => { setDraft(prompt); void sendMessage(undefined, prompt) }}><span>{prompt}</span><ArrowUpRight size={14} /></button>)}
                        </div>
                      </div>
                    ) : (
                      <div className="message-list">
                        {messages.map((message, index) => <article className={`message ${message.role}`} key={`${message.role}-${index}`}><span className="message-avatar">{message.role === 'user' ? 'Y' : <Sparkles size={14} />}</span><div><span className="message-author">{message.role === 'user' ? 'You' : settings.model}</span><p>{message.content}</p></div></article>)}
                        {sending && <article className="message assistant"><span className="message-avatar"><Sparkles size={14} /></span><div><span className="message-author">{settings.model}</span><p className="thinking"><span /><span /><span /></p></div></article>}
                        <div ref={messageEnd} />
                      </div>
                    )}
                  </div>

                  {notice && <div className={`notice ${connectionState === 'error' ? 'notice-error' : ''}`}><CircleHelp size={15} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
                  <form className="composer" onSubmit={(event) => void sendMessage(event)}>
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage() } }} placeholder="Ask your model something…" rows={2} aria-label="Message" />
                    <div className="composer-footer"><div className="composer-context"><BookOpen size={14} /><select aria-label="Choose agent skill" value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)}><option value="">No skill</option>{skills.filter((skill) => skill.enabled).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select><span className="composer-separator" /><span>↵ to send</span></div><button className="send-button" type="submit" disabled={!draft.trim() || sending} title="Send message"><Send size={15} /></button></div>
                  </form>
                </section>

                <aside className="run-sidebar">
                  <div className="run-sidebar-heading"><span>RUN CONTEXT</span><button className="icon-button" title="Model settings" onClick={() => setSettingsOpen(true)}><Settings2 size={15} /></button></div>
                  <div className="context-block"><span className="context-label-small">MODEL</span><div className="context-model"><span className="context-model-icon"><Zap size={14} /></span><span><strong>{settings.model}</strong><small>OpenAI compatible</small></span></div><button className="text-action" onClick={() => setSettingsOpen(true)}>Configure connection <ArrowUpRight size={13} /></button></div>
                  <div className="context-block"><div className="context-title-row"><span className="context-label-small">AGENT SKILL</span><span className="muted-count">{activeCount} ACTIVE</span></div><label className="skill-select-wrap"><BookOpen size={15} /><select aria-label="Select skill" value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)}><option value="">No skill selected</option>{skills.filter((skill) => skill.enabled).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select><ChevronDown size={14} /></label><p className="context-hint">{activeSkill?.description || 'Add a skill to shape your agent’s behavior.'}</p><button className="text-action" onClick={() => setView('skills')}>Manage skills <ArrowUpRight size={13} /></button></div>
                  <div className="context-block temperature-block"><div className="context-title-row"><span className="context-label-small">TEMPERATURE</span><span className="temperature-value">{temperature.toFixed(1)}</span></div><input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} aria-label="Temperature" /><div className="range-labels"><span>Precise</span><span>Creative</span></div><p className="context-hint">Controls are saved per conversation.</p></div>
                  <div className="privacy-note"><span className="privacy-check"><Check size={12} /></span><span><strong>Your keys stay yours.</strong><br />Settings are stored in this browser.</span></div>
                </aside>
              </div>
              <footer className="page-footer"><span><span className="footer-wave">≈</span> A small harbor for open models.</span><span>Built for local-first experiments <span className="footer-spark">✳</span></span></footer>
            </>
          )}

          {view === 'skills' && (
            <section className="library-view">
              <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" />REUSABLE INSTRUCTIONS</div><h1>Agent <em>skills.</em></h1><p>Give your model a point of view. Keep it portable.</p></div><button className="primary-button" onClick={addSkill}><Plus size={16} />New skill</button></div>
              <div className="skills-layout">
                <div className="skill-list-panel"><div className="list-panel-heading"><span>YOUR SKILLS</span><span>{String(skills.length).padStart(2, '0')}</span></div>{skills.map((skill) => <button className={`skill-list-item ${editingSkill?.id === skill.id ? 'selected' : ''}`} key={skill.id} onClick={() => setEditingSkill(skill)}><span className="skill-list-icon"><Layers3 size={16} /></span><span className="skill-list-copy"><strong>{skill.name}</strong><small>{skill.description || 'Add a description'}</small></span><span className={`tiny-toggle ${skill.enabled ? 'on' : ''}`} /></button>)}<button className="add-skill-row" onClick={addSkill}><Plus size={15} /> Create a skill</button></div>
                {editingSkill ? <SkillEditor key={editingSkill.id} skill={editingSkill} onSave={saveSkill} onDelete={() => { setSkills((current) => current.filter((item) => item.id !== editingSkill.id)); setEditingSkill(null) }} /> : <div className="skill-empty"><div className="empty-mark"><Layers3 size={21} /></div><h2>Choose a skill to edit</h2><p>Or create one from scratch with your own instructions.</p><button className="text-action" onClick={addSkill}>Create a skill <ArrowUpRight size={13} /></button></div>}
              </div>
              <div className="portable-note"><ArrowDownToLine size={15} /><span>Skills live in this browser for now. Export and import are coming soon.</span></div>
            </section>
          )}

          {view === 'evaluations' && (
            <section className="library-view eval-view">
              <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" />CHECK YOUR ASSUMPTIONS</div><h1>Evaluation <em>bench.</em></h1><p>Small tests. Clear signals. Fewer vibes-based launches.</p></div><button className="primary-button" onClick={() => void runEvaluations()} disabled={runningEvals}><FlaskConical size={16} />{runningEvals ? 'Running tests…' : 'Run evaluations'}</button></div>
              <div className="eval-summary"><div className="eval-stat"><span className="context-label-small">TEST CASES</span><strong>{String(cases.length).padStart(2, '0')}</strong></div><div className="eval-stat"><span className="context-label-small">LAST RUN</span><strong>{results.length ? `${results.filter((result) => result.passed).length}/${results.length}` : '—'}</strong><small>{results.length ? 'passed' : 'Not run yet'}</small></div><div className="eval-stat"><span className="context-label-small">MODEL</span><strong className="eval-model-name">{settings.model}</strong><small>OpenAI compatible</small></div><div className="eval-stat"><span className="context-label-small">HARNESS</span><strong className="eval-model-name">Keyword match</strong><small>Case-insensitive</small></div></div>
              {notice && <div className="notice notice-error"><CircleHelp size={15} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
              <div className="eval-table-wrap"><div className="eval-table-head"><span>CASE</span><span>INPUT</span><span>EXPECTED CONTAINS</span><span>RESULT</span><span /></div>{cases.map((testCase) => { const result = results.find((item) => item.id === testCase.id); return <div className="eval-row" key={testCase.id}><div className="eval-case-name"><span className="eval-case-icon"><Activity size={15} /></span><strong>{testCase.name}</strong></div><textarea aria-label={`${testCase.name} prompt`} value={testCase.prompt} onChange={(event) => setCases((current) => current.map((item) => item.id === testCase.id ? { ...item, prompt: event.target.value } : item))} placeholder="Prompt for the model" rows={2} /><input className="expected-input" aria-label={`${testCase.name} expected text`} value={testCase.expected} onChange={(event) => setCases((current) => current.map((item) => item.id === testCase.id ? { ...item, expected: event.target.value } : item))} placeholder="Text to look for" /><div className="eval-result">{runningEvals && !result ? <LoaderCircle className="spin" size={16} /> : result ? <span className={`result-pill ${result.passed ? 'passed' : 'failed'}`}>{result.passed ? <CheckCircle2 size={13} /> : <X size={13} />}{result.error ? 'Error' : result.passed ? 'Pass' : 'Fail'}</span> : <span className="result-pending">Not run</span>}</div><button className="icon-button delete-case" title="Remove test case" onClick={() => { setCases((current) => current.filter((item) => item.id !== testCase.id)); setResults((current) => current.filter((item) => item.id !== testCase.id)) }}><Trash2 size={15} /></button>{result?.output && <details className="eval-output"><summary>View model output</summary><p>{result.output}</p></details>}</div> })}</div>
              <button className="add-eval-button" onClick={addEvalCase}><Plus size={15} />Add test case</button>
              <div className="harness-note"><Gauge size={16} /><span><strong>Simple on purpose.</strong> Each test passes when the model’s response contains the expected text. No hidden judge model.</span></div>
            </section>
          )}
        </div>
      </main>

      {settingsOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false) }}><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="modal-heading"><div><div className="eyebrow"><span className="eyebrow-line" />CONNECTION</div><h2 id="settings-title">Model settings</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={18} /></button></div><p className="modal-description">Connect any OpenAI-compatible server. For local inference, try Ollama or LM Studio.</p><label className="field-label">API base URL<input value={settings.baseUrl} onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })} placeholder="http://localhost:11434/v1" /></label><label className="field-label">Model name<input value={settings.model} onChange={(event) => setSettings({ ...settings, model: event.target.value })} placeholder="qwen2.5:7b" /></label><label className="field-label">API key <span className="optional-label">OPTIONAL</span><input type="password" autoComplete="off" value={settings.apiKey} onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })} placeholder="Only needed by some providers" /></label><div className="modal-note"><CheckCircle2 size={15} /><span>Stored in local browser storage. Requests go directly from your browser to the endpoint.</span></div>{notice && <div className={`notice ${connectionState === 'error' ? 'notice-error' : ''}`}><CircleHelp size={15} /><span>{notice}</span></div>}<div className="modal-actions"><button className="secondary-button" onClick={() => void testConnection()} disabled={connectionState === 'checking'}>{connectionState === 'checking' ? <LoaderCircle className="spin" size={15} /> : <Activity size={15} />}Test connection</button><button className="primary-button" onClick={() => { setSettingsOpen(false); setNotice('Settings saved in this browser.') }}><Check size={15} />Done</button></div></section></div>}
    </div>
  )
}

function SkillEditor({ skill, onSave, onDelete }: { skill: Skill; onSave: (skill: Skill) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(skill)
  return <div className="skill-editor"><div className="editor-topline"><span className="context-label-small">SKILL DETAILS</span><button className="icon-button delete-skill" title="Delete skill" onClick={onDelete}><Trash2 size={15} /></button></div><label className="field-label">Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="A concise skill name" /></label><label className="field-label">Description<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What does this skill help with?" /></label><label className="field-label">Instructions<textarea className="skill-prompt-input" value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} placeholder="Write the system instructions for your agent…" rows={9} /></label><div className="skill-editor-footer"><label className="toggle-label"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} /><span className="toggle-switch" />Use in playground</label><button className="primary-button" onClick={() => onSave(draft)} disabled={!draft.name.trim()}><Check size={15} />Save skill</button></div></div>
}

export default App