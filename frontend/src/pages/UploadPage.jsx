import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import './UploadPage.css'

export default function UploadPage({ onFile, onManual, error }) {
  const [dragging, setDragging] = useState(false)

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) onFile(accepted[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDragEnter: () => setDragging(true),
    onDragLeave: () => setDragging(false),
  })

  return (
    <div className="upload-page">
      {/* Hero */}
      <div className="hero">
        <div className="hero-badge">🇮🇳 Made for Indian Taxpayers</div>
        <h1 className="hero-title">
          Find every rupee<br />
          <span className="hero-accent">you're leaving behind</span>
        </h1>
        <p className="hero-sub">
          Upload your Form 16. AI analyzes your deductions, compares tax regimes,
          and tells you exactly what to do — in 10 seconds.
        </p>
      </div>

      {/* Upload card */}
      <div className="upload-card">
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="dz-icon">📄</div>
          <div className="dz-title">
            {isDragActive ? 'Drop your Form 16 here' : 'Upload Form 16 PDF'}
          </div>
          <div className="dz-sub">Drag & drop or click to browse · PDF only · 100% private</div>
          <button className="dz-btn" onClick={e => e.stopPropagation()}>
            Choose File
          </button>
        </div>

        {error && (
          <div className="upload-error">
            ⚠️ {error}
          </div>
        )}

        <div className="upload-divider">
          <span>or</span>
        </div>

        <button className="manual-btn" onClick={onManual}>
          Enter salary details manually →
        </button>
      </div>

      {/* Trust badges */}
      <div className="trust-row">
        {[
          { icon: '🔒', text: 'PDF never stored' },
          { icon: '⚡', text: 'Results in 10 seconds' },
          { icon: '🤖', text: 'Powered by Llama 3.3' },
          { icon: '📊', text: 'Old vs New regime' },
        ].map((b, i) => (
          <div key={i} className="trust-badge">
            <span>{b.icon}</span>
            <span>{b.text}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="stats-row">
        {[
          { num: '₹47,000', label: 'avg missed deductions' },
          { num: '95%',     label: 'Indians lack a tax plan' },
          { num: '₹14,100', label: 'avg extra tax paid' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
