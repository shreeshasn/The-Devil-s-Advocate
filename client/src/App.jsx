import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Lightbulb, ShieldAlert, Scale, Swords, Sun, Moon, Menu, X, MessageSquare, Plus, SlidersHorizontal, Volume2, Play, Pause, Square, Settings, Github } from 'lucide-react'
import './App.css'

const TTSPlayer = ({ text, agentType, colorClass }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const synth = window.speechSynthesis

  useEffect(() => {
    return () => { if (synth.speaking) synth.cancel() }
  }, [synth])

  const handlePlayPause = () => {
    if (isPlaying && !isPaused) {
      synth.pause()
      setIsPaused(true)
    } else if (isPlaying && isPaused) {
      synth.resume()
      setIsPaused(false)
    } else {
      startSpeaking()
    }
  }

  const stopSpeaking = () => {
    synth.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
  }

  const startSpeaking = () => {
    synth.cancel() 
    const cleanText = text.replace(/[*_#`~]/g, '')
    const utterance = new SpeechSynthesisUtterance(cleanText)

    if (agentType === 'visionary') {
      utterance.pitch = 1.3 
      utterance.rate = 1.15
    } else if (agentType === 'inquisitor') {
      utterance.pitch = 0.7 
      utterance.rate = 1.0
    } else if (agentType === 'arbiter') {
      utterance.pitch = 1.0 
      utterance.rate = 0.85
    }

    utterance.onstart = () => { setIsPlaying(true); setIsPaused(false); setProgress(0) }
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        setProgress((event.charIndex / cleanText.length) * 100)
      }
    }
    utterance.onend = () => { setIsPlaying(false); setIsPaused(false); setProgress(0) }
    utterance.onerror = () => { setIsPlaying(false); setIsPaused(false); setProgress(0) }

    synth.speak(utterance)
  }

  return (
    <div className={`tts-container ${colorClass}`}>
      {!isPlaying ? (
        <button className="tts-btn play-btn" onClick={handlePlayPause} title="Listen">
          <Volume2 size={18} />
        </button>
      ) : (
        <div className="tts-active-controls">
          <button className="tts-btn" onClick={handlePlayPause}>
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button className="tts-btn stop-btn" onClick={stopSpeaking}>
            <Square size={14} fill="currentColor" />
          </button>
          <div className="tts-progress-bg">
            <div className="tts-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  const [topic, setTopic] = useState('')
  const [step, setStep] = useState('idle')
  const [proposal, setProposal] = useState(null)
  const [critique, setCritique] = useState(null)
  const [judge, setJudge] = useState(null)
  const [error, setError] = useState(null)
  
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [responseLength, setResponseLength] = useState('medium')
  
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState(localStorage.getItem('geminiApiKey') || '')
  const [aiModel, setAiModel] = useState(localStorage.getItem('geminiModel') || 'gemini-2.5-pro')
  const [serverHasDefaultKey, setServerHasDefaultKey] = useState(true)
  
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('debateHistory')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      console.error("Failed to load history", e)
      return []
    }
  })

  const textareaRef = useRef(null)

  useEffect(() => {
    fetch('http://localhost:5000/api/status')
      .then(res => res.json())
      .then(data => {
        setServerHasDefaultKey(data.hasDefaultKey)
        if (!data.hasDefaultKey && !apiKey) {
          setShowSettings(true)
        }
      })
      .catch(err => console.log("Backend offline", err))
  }, [])

  useEffect(() => {
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  useEffect(() => {
    localStorage.setItem('debateHistory', JSON.stringify(history))
  }, [history])

  useEffect(() => {
    return () => window.speechSynthesis.cancel()
  }, [])

  const saveSettings = () => {
    localStorage.setItem('geminiApiKey', apiKey)
    localStorage.setItem('geminiModel', aiModel)
    setShowSettings(false)
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

  const startNewDebate = () => {
    window.speechSynthesis.cancel() 
    setTopic('')
    setProposal(null)
    setCritique(null)
    setJudge(null)
    setStep('idle')
    setError(null)
    setIsSidebarOpen(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const loadHistoryItem = (item) => {
    window.speechSynthesis.cancel() 
    setTopic(item.topic)
    setProposal(item.proposal)
    setCritique(item.critique)
    setJudge(item.judge)
    setResponseLength(item.length || 'medium')
    setStep('done')
    setError(null)
    setIsSidebarOpen(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const startDebate = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return

    if (!serverHasDefaultKey && !apiKey.trim()) {
      setShowSettings(true)
      return
    }

    window.speechSynthesis.cancel() 
    setProposal(null)
    setCritique(null)
    setJudge(null)
    setError(null)
    
    const payloadBase = { 
      topic, 
      length: responseLength,
      api_key: apiKey.trim() || undefined,
      model: aiModel
    }
    
    try {
      setStep('proposer-thinking')
      const res1 = await fetch('http://localhost:5000/api/proposer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBase)
      })
      const data1 = await res1.json()
      if (!res1.ok || data1.error) throw new Error(data1.error || 'Failed to fetch Proposer')
      setProposal(data1.proposal)

      setStep('critic-thinking')
      const res2 = await fetch('http://localhost:5000/api/critic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payloadBase, proposal: data1.proposal })
      })
      const data2 = await res2.json()
      if (!res2.ok || data2.error) throw new Error(data2.error || 'Failed to fetch Critic')
      setCritique(data2.critique)

      setStep('judge-thinking')
      const res3 = await fetch('http://localhost:5000/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payloadBase, proposal: data1.proposal, critique: data2.critique })
      })
      const data3 = await res3.json()
      if (!res3.ok || data3.error) throw new Error(data3.error || 'Failed to fetch Judge')
      setJudge(data3.final_answer)

      setStep('done')

      const newHistoryItem = {
        id: Date.now(),
        topic: topic,
        proposal: data1.proposal,
        critique: data2.critique,
        judge: data3.final_answer,
        length: responseLength
      }
      setHistory(prevHistory => [newHistoryItem, ...prevHistory])

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

  let visibleCards = 0;
  if (step === 'proposer-thinking') visibleCards = 1;
  else if (step === 'critic-thinking') visibleCards = 2;
  else if (step === 'judge-thinking' || step === 'done') visibleCards = 3;

  return (
    <div className="app-container">
      
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2><Settings size={22} style={{marginRight: '8px', verticalAlign: 'bottom'}}/> Settings</h2>
              {serverHasDefaultKey && (
                <button className="icon-btn" onClick={() => setShowSettings(false)}><X size={20} /></button>
              )}
            </div>
            <div className="modal-body">
              {!serverHasDefaultKey && !apiKey && (
                <div className="warning-box">
                  Please provide a Gemini API key to use this application. Your key is stored securely in your local browser.
                </div>
              )}
              <label>Gemini API Key</label>
              <input 
                type="password" 
                placeholder="AIzaSy..." 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                className="settings-input"
              />
              <p className="helper-text">Get your free key from Google AI Studio.</p>

              <label style={{marginTop: '1.5rem'}}>Select AI Model</label>
              <select 
                value={aiModel} 
                onChange={(e) => setAiModel(e.target.value)}
                className="settings-select"
              >
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Powerful, but strict rate limits)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Faster, higher rate limits)</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="save-btn" onClick={saveSettings} disabled={!serverHasDefaultKey && !apiKey.trim()}>
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Debate History</h2>
          <button className="icon-btn" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
        </div>
        <button className="new-debate-btn" onClick={startNewDebate}>
          <Plus size={20} /><span>New Debate</span>
        </button>
        <div className="history-list">
          {history.length === 0 ? (
            <p className="empty-history">No previous debates yet.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="history-item" onClick={() => loadHistoryItem(item)}>
                <MessageSquare size={18} className="history-icon" />
                <span className="history-text">{item.topic}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="menu-btn-wrapper">
        <button className="icon-btn" onClick={() => setIsSidebarOpen(true)}><Menu size={28} /></button>
      </div>

      <div className="top-right-controls">
        <div className="theme-switch-wrapper">
          <Sun size={20} color={isDarkMode ? '#64748b' : '#f59e0b'} />
          <label className="theme-switch">
            <input type="checkbox" checked={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)} />
            <span className="slider round"></span>
          </label>
          <Moon size={20} color={isDarkMode ? '#a78bfa' : '#64748b'} />
        </div>
        <button className="icon-btn settings-btn" onClick={() => setShowSettings(true)} title="Settings">
          <Settings size={24} />
        </button>
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
          <div className="debate-settings">
            <div className="setting-group">
              <SlidersHorizontal size={18} className="setting-icon" />
              <span className="setting-label">Depth:</span>
              <div className="pills-container">
                <button type="button" className={`pill ${responseLength === 'short' ? 'active' : ''}`} onClick={() => setResponseLength('short')} disabled={step !== 'idle' && step !== 'done'}>Short</button>
                <button type="button" className={`pill ${responseLength === 'medium' ? 'active' : ''}`} onClick={() => setResponseLength('medium')} disabled={step !== 'idle' && step !== 'done'}>Medium</button>
                <button type="button" className={`pill ${responseLength === 'enhanced' ? 'active' : ''}`} onClick={() => setResponseLength('enhanced')} disabled={step !== 'idle' && step !== 'done'}>Enhanced</button>
              </div>
            </div>
          </div>

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

      <div className={`arena-grid cards-${visibleCards}`}>
        {visibleCards >= 1 && (
          <div className="grid-col">
            <div className="agent-card proposer">
              <div className="card-header">
                <div className="header-title-group">
                  <Lightbulb className="header-icon" />
                  <h2>The Visionary</h2>
                  {proposal && <TTSPlayer text={proposal} agentType="visionary" colorClass="tts-red" />}
                </div>
                {proposal && <img src="/avatars/visionary.png" alt="Visionary" className="static-avatar red-border" />}
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
          </div>
        )}

        {visibleCards >= 3 && (
          <div className="grid-col">
            <div className="agent-card judge">
              <div className="card-header">
                <div className="header-title-group">
                  <Scale className="header-icon" />
                  <h2>The Arbiter</h2>
                  {judge && <TTSPlayer text={judge} agentType="arbiter" colorClass="tts-green" />}
                </div>
                {judge && <img src="/avatars/arbiter.png" alt="Arbiter" className="static-avatar green-border" />}
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
          </div>
        )}

        {visibleCards >= 2 && (
          <div className="grid-col">
            <div className="agent-card critic">
              <div className="card-header">
                <div className="header-title-group">
                  <ShieldAlert className="header-icon" />
                  <h2>The Inquisitor</h2>
                  {critique && <TTSPlayer text={critique} agentType="inquisitor" colorClass="tts-blue" />}
                </div>
                {critique && <img src="/avatars/inquisitor.png" alt="Inquisitor" className="static-avatar blue-border" />}
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
          </div>
        )}
      </div>

      <footer className="app-footer">
        <p className="footer-quote">"Truth emerges from the clash of opposing ideas."</p>
        <a href="https://github.com/shreeshasn/The-Devil-s-Advocate" target="_blank" rel="noopener noreferrer" className="github-link">
          <Github size={16} />
          <span>View on GitHub</span>
        </a>
      </footer>

    </div>
  )
}

export default App