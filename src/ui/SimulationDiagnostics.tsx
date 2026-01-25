import { useState, useEffect, useRef } from 'react'
import { useAudioStore } from '../store/audioStore'
import { runOfficialCorpus } from '../fv1/validation/corpusRunner'

export default function SimulationDiagnostics() {
  const { 
    corpusStatus, 
    corpusResult, 
    renderResult, 
    setCorpusStatus, 
    setCorpusResult 
  } = useAudioStore()
  const [expanded, setExpanded] = useState(false)
  const [playingTest, setPlayingTest] = useState<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  
  useEffect(() => {
    // Run corpus validation on mount
    const runValidation = async () => {
      setCorpusStatus('running')
      try {
        const result = await runOfficialCorpus()
        setCorpusResult(result)
        setCorpusStatus('complete')
      } catch (error) {
        console.error('Corpus validation failed:', error)
        setCorpusStatus('error')
      }
    }
    
    if (corpusStatus === 'idle') {
      runValidation()
    }
  }, [corpusStatus, setCorpusStatus, setCorpusResult])
  
  const handleRunCorpus = async () => {
    setCorpusStatus('running')
    try {
      const result = await runOfficialCorpus()
      setCorpusResult(result)
      setCorpusStatus('complete')
    } catch (error) {
      console.error('Corpus validation failed:', error)
      setCorpusStatus('error')
    }
  }
  
  const handlePlayTest = (testName: string, buffer: AudioBuffer | undefined) => {
    if (!buffer) return
    
    // Stop any currently playing audio
    if (currentSourceRef.current) {
      currentSourceRef.current.stop()
      currentSourceRef.current = null
    }
    
    // Create audio context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    
    // Play the buffer
    const source = audioContextRef.current.createBufferSource()
    source.buffer = buffer
    source.connect(audioContextRef.current.destination)
    source.onended = () => {
      setPlayingTest(null)
      currentSourceRef.current = null
    }
    source.start()
    
    currentSourceRef.current = source
    setPlayingTest(testName)
  }
  
  const handleStopTest = () => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop()
      currentSourceRef.current = null
      setPlayingTest(null)
    }
  }
  
  if (corpusStatus === 'idle' || corpusStatus === 'running') {
    return (
      <section className="diagnostics-panel">
        <div className="panel-header">
          <h2>Simulation Diagnostics</h2>
          <span className="panel-meta">Validating interpreter...</span>
        </div>
        <div className="diagnostics-loading">
          <p>Running validation against official corpus...</p>
        </div>
      </section>
    )
  }
  
  if (corpusStatus === 'error' || !corpusResult) {
    return (
      <section className="diagnostics-panel">
        <div className="panel-header">
          <h2>Simulation Diagnostics</h2>
          <span className="panel-meta status-error">Validation failed</span>
        </div>
        <div className="diagnostics-error">
          <p>⚠️ Failed to run corpus validation</p>
        </div>
      </section>
    )
  }
  
  const { total, passed, failed, errors } = corpusResult
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
  const slowRenderWarning = renderResult?.warnings.find(w => w.code === 'slow-render')
  
  return (
    <section className="diagnostics-panel">
      <div className="panel-header">
        <h2>Simulation Diagnostics</h2>
        <button
          className="expand-toggle"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? '▼' : '▶'} Details
        </button>
      </div>
      
      {/* Render Performance */}
      {renderResult && (
        <div className="diagnostics-section">
          <h3 className="section-title">Last Render</h3>
          <div className="diagnostics-stats">
            <div className="stat-item">
              <span className="stat-label">Elapsed Time</span>
              <span className="stat-value">{renderResult.elapsedMs.toFixed(0)} ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Duration</span>
              <span className="stat-value">{renderResult.duration.toFixed(1)} s</span>
            </div>
          </div>
          {slowRenderWarning && (
            <div className="diagnostics-warning">
              ⚠️ {slowRenderWarning.message}
            </div>
          )}
        </div>
      )}
      
      {/* Corpus Validation */}
      <div className="diagnostics-section">
        <div className="section-header">
          <h3 className="section-title">Corpus Validation</h3>
          <button
            className="run-corpus-button"
            onClick={handleRunCorpus}
            type="button"
          >
            Re-run Validation
          </button>
        </div>
        
        <div className="corpus-stats">
          <div className="stat-item">
            <span className="stat-label">Tests</span>
            <span className="stat-value">{total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Passed</span>
            <span className="stat-value status-pass">{passed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Failed</span>
            <span className="stat-value status-fail">{failed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Errors</span>
            <span className="stat-value status-error">{errors}</span>
          </div>
        </div>
        
        <div className="corpus-pass-rate">
          <div className="pass-rate-bar">
            <div 
              className="pass-rate-fill"
              style={{ width: `${passRate}%` }}
            />
          </div>
          <span className="pass-rate-label">{passRate}% pass rate</span>
        </div>
      </div>
      
      {expanded && (
        <div className="corpus-details">
          <table className="corpus-results-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Listen</th>
              </tr>
            </thead>
            <tbody>
              {corpusResult.results.map((result) => (
                <tr key={result.name} className={`result-${result.status}`}>
                  <td className="result-name">{result.name}</td>
                  <td className="result-status">
                    {result.status === 'pass' && '✓ Pass'}
                    {result.status === 'fail' && '✗ Fail'}
                    {result.status === 'error' && '⚠ Error'}
                  </td>
                  <td className="result-duration">
                    {result.duration ? `${result.duration.toFixed(0)}ms` : '-'}
                  </td>
                  <td className="result-actions">
                    {result.renderedBuffer && (
                      playingTest === result.name ? (
                        <button 
                          onClick={handleStopTest}
                          className="play-button playing"
                          title="Stop playback"
                        >
                          ⏹
                        </button>
                      ) : (
                        <button 
                          onClick={() => handlePlayTest(result.name, result.renderedBuffer)}
                          className="play-button"
                          title="Listen to rendered output"
                        >
                          ▶
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {corpusResult.results.some(r => r.errors.length > 0) && (
            <div className="corpus-errors">
              <h3>Errors</h3>
              {corpusResult.results
                .filter(r => r.errors.length > 0)
                .map((result) => (
                  <div key={result.name} className="error-detail">
                    <strong>{result.name}:</strong>
                    <ul>
                      {result.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
