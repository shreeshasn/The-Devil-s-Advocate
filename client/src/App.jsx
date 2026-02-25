import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Lightbulb, ShieldAlert, Scale, Swords, Sun, Moon } from 'lucide-react'
import './App.css'

function App() {
  const [topic, setTopic] = useState('')
  const [step, setStep] = useState('idle')
  const [proposal, setProposal] = useState(null)
  const [critique, setCritique] = useState(null)
  const [judge, setJudge] = useState(null)
  const [error, setError] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const textareaRef = useRef(null)

  useEffect(() => {
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleInput = (e) => {
    setTopic(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 250)}px`
    }
  }

  const fillExample = () => {
    setTopic("Who is better Virat Kohli or Sachin Tendulkar?")
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const startDebate = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return
    
    setProposal(null)
    setCritique(null)
    setJudge(null)
    setError(null)
    
    try {
      setStep('proposer-thinking')
      const res1 = await fetch('http://localhost:5000/api/proposer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      })
      const data1 = await res1.json()
      if (!res1.ok || data1.error) throw new Error(data1.error || 'Failed to fetch Proposer')
      setProposal(data1.proposal)

      setStep('critic-thinking')
      const res2 = await fetch('http://localhost:5000/api/critic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, proposal: data1.proposal })
      })
      const data2 = await res2.json()
      if (!res2.ok || data2.error) throw new Error(data2.error || 'Failed to fetch Critic')
      setCritique(data2.critique)

      setStep('judge-thinking')
      const res3 = await fetch('http://localhost:5000/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, proposal: data1.proposal, critique: data2.critique })
      })
      const data3 = await res3.json()
      if (!res3.ok || data3.error) throw new Error(data3.error || 'Failed to fetch Judge')
      setJudge(data3.final_answer)

      setStep('done')
    } catch (err) {
      setError(err.message)
      setStep('idle')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      startDebate(e)
    }
  }

  return (
    <div className="app-container">
      
      <div className="theme-switch-wrapper">
        <Sun size={20} color={isDarkMode ? '#64748b' : '#f59e0b'} />
        <label className="theme-switch">
          <input type="checkbox" checked={isDarkMode} onChange={toggleTheme} />
          <span className="slider round"></span>
        </label>
        <Moon size={20} color={isDarkMode ? '#a78bfa' : '#64748b'} />
      </div>

      <div className="header-container">
        <header className="hero-section">
          <div className="title-container">
            <Swords className="title-icon" size={44} />
            <h1>The Devil's Advocate</h1>
          </div>
          <p className="subtitle">An Autonomous Multi-Agent Consensus System</p>
        </header>
      </div>

      <div className="form-wrapper">
        <form onSubmit={startDebate} className="debate-form">
          <div className="input-group">
            <textarea 
              ref={textareaRef}
              placeholder="Enter a complex topic here..." 
              value={topic}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              required
              disabled={step !== 'idle' && step !== 'done'}
              rows={2}
            />
            <button type="submit" disabled={(step !== 'idle' && step !== 'done') || !topic.trim()}>
              Initiate Debate
            </button>
          </div>
        </form>
        <div className="example-text" onClick={fillExample}>
          💡 Try example: "Who is better Virat Kohli or Sachin Tendulkar?"
        </div>
      </div>

      {error && <div className="error-banner">Error: {error}</div>}

      <div className="arena-grid">
        <div className="grid-col proposer-col">
          {(step !== 'idle' || proposal) && (
            <div className="agent-card proposer">
              <div className="card-header">
                <Lightbulb className="header-icon" />
                <h2>The Visionary</h2>
              </div>
              <div className="card-content markdown-body">
                {step === 'proposer-thinking' ? (
                  <div className="thinking-container">
                    <img src="/avatars/visionary.png" alt="Visionary Thinking" className="thinking-avatar red-glow pulse-anim" />
                    <p>Analyzing facts...</p>
                  </div>
                ) : proposal ? (
                  <ReactMarkdown>{proposal}</ReactMarkdown>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="grid-col judge-col">
          {(step === 'judge-thinking' || step === 'done') && (
            <div className="agent-card judge">
              <div className="card-header">
                <Scale className="header-icon" />
                <h2>The Arbiter</h2>
              </div>
              <div className="card-content markdown-body">
                {step === 'judge-thinking' ? (
                  <div className="thinking-container">
                    <img src="/avatars/arbiter.png" alt="Arbiter Thinking" className="thinking-avatar green-glow pulse-anim" />
                    <p>Weighing arguments...</p>
                  </div>
                ) : judge ? (
                  <ReactMarkdown>{judge}</ReactMarkdown>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="grid-col critic-col">
          {(step === 'critic-thinking' || step === 'judge-thinking' || step === 'done') && (
            <div className="agent-card critic">
              <div className="card-header">
                <ShieldAlert className="header-icon" />
                <h2>The Inquisitor</h2>
              </div>
              <div className="card-content markdown-body">
                {step === 'critic-thinking' ? (
                  <div className="thinking-container">
                    <img src="/avatars/inquisitor.png" alt="Inquisitor Thinking" className="thinking-avatar blue-glow pulse-anim" />
                    <p>Finding flaws...</p>
                  </div>
                ) : critique ? (
                  <ReactMarkdown>{critique}</ReactMarkdown>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App