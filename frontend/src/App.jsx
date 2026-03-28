import { useState } from 'react'
import UploadPage   from './pages/UploadPage'
import ResultsPage  from './pages/ResultsPage'
import ManualPage   from './pages/ManualPage'
import './App.css'

const API = 'http://localhost:8000'

export default function App() {
  const [screen, setScreen]   = useState('upload') // upload | manual | loading | results
  const [result, setResult]   = useState(null)
  const [error,  setError]    = useState(null)

  const handleFile = async (file) => {
    setScreen('loading')
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch(`${API}/api/analyze`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
      setScreen('results')
    } catch (e) {
      setError(e.message)
      setScreen('upload')
    }
  }

  const handleManual = async (formData) => {
    setScreen('loading')
    setError(null)
    try {
      const res  = await fetch(`${API}/api/manual`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
      setScreen('results')
    } catch (e) {
      setError(e.message)
      setScreen('manual')
    }
  }

  const reset = () => { setScreen('upload'); setResult(null); setError(null) }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand" onClick={reset} style={{ cursor: 'pointer' }}>
          <span className="brand-icon">⚡</span>
          <span className="brand-name">TaxWizard</span>
          <span className="brand-tag">AI</span>
        </div>
        <div className="nav-links">
          {screen === 'results' && (
            <button className="nav-btn" onClick={reset}>← Analyze Another</button>
          )}
          <a href="https://groq.com" target="_blank" rel="noreferrer" className="nav-powered">
            Powered by Groq · Llama 3.3
          </a>
        </div>
      </nav>

      <main className="main">
        {screen === 'upload' && (
          <UploadPage
            onFile={handleFile}
            onManual={() => setScreen('manual')}
            error={error}
          />
        )}
        {screen === 'manual' && (
          <ManualPage
            onSubmit={handleManual}
            onBack={() => setScreen('upload')}
            error={error}
          />
        )}
        {screen === 'loading' && <LoadingScreen />}
        {screen === 'results' && result && (
          <ResultsPage data={result} onReset={reset} />
        )}
      </main>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div className="loading-spinner" />
        <div className="loading-title">Analyzing your Form 16</div>
        <div className="loading-steps">
          {['Extracting salary data', 'Computing deductions', 'Comparing tax regimes', 'Generating AI recommendations'].map((s, i) => (
            <div key={i} className="loading-step" style={{ animationDelay: `${i * 0.6}s` }}>
              <span className="step-dot" />
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
