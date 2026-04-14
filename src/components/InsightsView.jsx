import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { RiLightbulbFlashLine, RiCloseLine, RiDownloadLine, RiArrowLeftLine, RiArrowRightLine } from 'react-icons/ri'
import html2pdf from 'html2pdf.js'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import './InsightsView.css'

export default function InsightsView({ user }) {
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [error, setError] = useState(null)
  
  const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const localStorageKey = `eeg_insights_report_${user?.id}`

  // Load from local storage on mount
  useEffect(() => {
    if (!user?.id) return
    const saved = localStorage.getItem(localStorageKey)
    if (saved) {
      try {
        setReportData(JSON.parse(saved))
        // Do not auto-set hasGenerated to true, so user sees popup first
      } catch (err) {
        console.error('Failed to parse cached report data')
      }
    }
  }, [user?.id, localStorageKey])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // 1. Fetch sessions from last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: sessions, error: dbError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      
      if (!sessions || sessions.length === 0) {
        throw new Error("No session data found in the past 30 days. Please record some sessions first.")
      }

      // 2. Group by Date and select the longest session per day
      const dailyMap = {}
      sessions.forEach(s => {
        // Parse date string (remove time)
        const dateKey = new Date(s.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric'
        })
        
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = s
        } else {
          // Keep the longest session
          if (s.duration_seconds > dailyMap[dateKey].duration_seconds) {
            dailyMap[dateKey] = s
          }
        }
      })

      // Convert map to sorted array by actual timestamp chronological order
      const chartData = Object.values(dailyMap).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(s => ({
        date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        focus: Math.round(s.focus_avg),
        relaxation: Math.round(s.relaxation_avg),
        stress: Math.round(s.stress_avg),
        fatigue: Math.round(s.cog_fatigue_avg)
      }))

      if (chartData.length < 2) {
        throw new Error("Need at least 2 distinct days of recordings to generate a trend analysis.")
      }

      // 3. Send via strict prompt to OpenAI
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (!apiKey) throw new Error("Missing OpenAI API Key.")

      const promptData = chartData.map(d => `${d.date} - Focus: ${d.focus}%, Relax: ${d.relaxation}%, Stress: ${d.stress}%, Fatigue: ${d.fatigue}%`).join('\n')
      
      const prompt = `
        You are an expert neuroscientist and performance coach analyzing a user's recent EEG readings.
        Here is the data (Longest session chosen per day):
        ${promptData}

        Generate a detailed, supportive report using a friendly tone that is accessible and easy for a student to understand. Avoid medical diagnoses.
        IMPORTANT: Address the user directly using "you" and "your" (e.g., "Your focus was...", rather than "The individual's focus was...").
        Format EXACTLY using these sections as Markdown headers (##):
        ## Overall Brain Activity Summary
        ## Focus Trends
        ## Relaxation Patterns
        ## Stress Indicators
        ## Cognitive Fatigue Analysis
        ## Key Insights
        ## Personalized Tips
        
        Provide 1-2 paragraphs under each header analyzing the trends mathematically and highlighting any correlations. 
        Under "Personalized Tips", give meaningful, actionable advice that specifically helps with mental health improvement and overall well-being based on the analysis of these daily longest sessions.
      `

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.7
        })
      })

      const aiData = await response.json()
      if (!response.ok) throw new Error(aiData.error?.message || 'Failed to fetch AI analysis')

      const newReportData = {
        charts: chartData,
        markdown: aiData.choices[0].message.content
      }

      setReportData(newReportData)
      setHasGenerated(true)
      
      // Save newly generated report to localStorage (automatically overwrites previous)
      localStorage.setItem(localStorageKey, JSON.stringify(newReportData))
      
    } catch (err) {
      console.error('Insights generation failed:', err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportPDF = async () => {
    const element = document.getElementById('insights-export-content')
    if (!element) return

    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const opt = {
      margin:       [15, 18, 15, 18],
      filename:     `Neural_Analysis_${userName.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        windowWidth: 900,
        onclone: (clonedDoc) => {
          const container = clonedDoc.getElementById('insights-export-content')
          if (!container) return

          // Re-skin for white-background professional report
          container.style.cssText = 'background:#fff; color:#1a1a2e; padding:0; font-family:Georgia,serif;'

          // Dynamically inject a professional header at the top
          const headerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; text-align:center; padding:30px 20px 24px; margin-bottom:24px; background:#fff; border-bottom:3px solid #00b4d8;">
              <div style="font-size:12px; color:#888; text-transform:uppercase; letter-spacing:0.15em; margin-bottom:16px; font-family:Helvetica,Arial,sans-serif; font-weight:600;">NeuroLens</div>
              <h1 style="font-size:28px; font-weight:700; color:#1a1a2e; margin:0 0 12px 0; letter-spacing:-0.02em; font-family:Georgia,serif;">Your Neural Analysis</h1>
              <p style="color:#555; font-size:13px; margin:0 0 4px 0; font-family:Helvetica,Arial,sans-serif;">Prepared for: <strong style="color:#00b4d8; font-weight:600;">${userName}</strong></p>
              <p style="color:#555; font-size:13px; margin:0; font-family:Helvetica,Arial,sans-serif;">Report Date: ${reportDate}</p>
            </div>
          `
          container.insertAdjacentHTML('afterbegin', headerHTML)

          // Style chart cards
          container.querySelectorAll('.insights-chart-card').forEach(card => {
            card.style.cssText = 'background:#f8f9fa; border:1px solid #e0e0e0; border-radius:8px; padding:18px;'
          })
          container.querySelectorAll('.insights-chart-card h3').forEach(h3 => {
            h3.style.cssText = 'font-size:13px; color:#555; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:14px; font-family:Helvetica,Arial,sans-serif;'
          })

          // Style the charts grid
          const grid = container.querySelector('.insights-charts-grid')
          if (grid) grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:28px;'

          // Style report content
          const reportContent = container.querySelector('.insights-report-content')
          if (reportContent) reportContent.style.cssText = 'background:#fff; border:none; border-radius:0; padding:8px 0 0 0; color:#333; line-height:1.8; font-family:Georgia,serif;'

          // Style AI report sections
          container.querySelectorAll('.ai-report-header').forEach((h2, i) => {
            h2.style.cssText = `font-size:18px; font-weight:700; color:#1a1a2e; margin-top:${i === 0 ? '0' : '24px'}; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #ddd; font-family:Georgia,serif;`
          })

          container.querySelectorAll('.ai-report-subheader').forEach(h3 => {
            h3.style.cssText = 'font-size:15px; font-weight:600; color:#333; margin-top:16px; margin-bottom:8px; font-family:Georgia,serif;'
          })

          container.querySelectorAll('.ai-report-text').forEach(p => {
            p.style.cssText = 'font-size:13px; color:#333; margin-bottom:12px; line-height:1.8; font-family:Georgia,serif;'
          })
          container.querySelectorAll('.ai-report-text strong').forEach(s => {
            s.style.cssText = 'color:#1a1a2e; font-weight:700;'
          })

          container.querySelectorAll('.ai-report-list-item').forEach(li => {
            li.style.cssText = 'font-size:13px; color:#333; margin-left:20px; margin-bottom:6px; line-height:1.7; font-family:Georgia,serif;'
          })
          container.querySelectorAll('.ai-report-list-item strong').forEach(s => {
            s.style.cssText = 'color:#1a1a2e; font-weight:700;'
          })
        }
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    }

    html2pdf().set(opt).from(element).save()
  }

  const handleGoBack = () => {
    // Optionally remove from local storage if they shouldn't see it again immediately:
    // localStorage.removeItem(localStorageKey)
    setHasGenerated(false)
  }

  // Parses markdown headers and bold text for rendering
  const renderMarkdown = (text) => {
    return text.split('\n').map((line, ix) => {
      if (line.startsWith('## ')) {
        return <h2 key={ix} className="ai-report-header">{line.replace('## ', '')}</h2>
      } else if (line.startsWith('### ')) {
        return <h3 key={ix} className="ai-report-subheader">{line.replace('### ', '')}</h3>
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        // bold parsing within list
        const content = line.substring(2).split(/(\*\*.*?\*\*)/g).map((part, j) => 
          part.startsWith('**') && part.endsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part
        )
        return <li key={ix} className="ai-report-list-item">{content}</li>
      } else if (line.trim().length > 0) {
        // basic bold parsing
        const content = line.split(/(\*\*.*?\*\*)/g).map((part, j) => 
          part.startsWith('**') && part.endsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part
        )
        return <p key={ix} className="ai-report-text">{content}</p>
      }
      return null
    })
  }

  if (!hasGenerated) {
    return (
      <div className="insights-view__modal-container animation-fade-in">
        <div className="insights-ambient-bg" />
        
        {reportData && (
          <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}>
            <button className="insights-simple-btn" onClick={() => setHasGenerated(true)}>
              View Previous Report <RiArrowRightLine size={16} />
            </button>
          </div>
        )}

        <div className="insights-modal">
          <div className="insights-modal-glow" />
          <div className="insights-modal__icon">
            <RiLightbulbFlashLine size={42} />
          </div>
          <h2 className="insights-modal__title">Generate Your Insights & Tips</h2>
          <p className="insights-modal__msg">
            Would you like to generate a personalized insights report based on your past EEG readings? 
            The AI will analyze trends in focus, relaxation, cognitive fatigue, and stress levels to provide 
            helpful insights and recommendations.
          </p>

          {error && <div className="insights-modal__error">{error}</div>}

          <div className="insights-modal__actions">
            <button className="insights-modal__btn-primary" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? 'Analyzing data...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="insights-report animation-fade-in">
      <div className="insights-header-actions">
        <div>
          <h2>Your Neural Analysis</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>{userName}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="insights-simple-btn" onClick={handleGoBack}>
            <RiArrowLeftLine size={16} /> New Report
          </button>
          <button className="dashboard__connect-btn" onClick={handleExportPDF}>
            <RiDownloadLine size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div id="insights-export-content" className="pdf-export-container">

        {/* Charts Section */}
        <div className="insights-charts-grid">
        <div className="insights-chart-card">
          <h3>Focus Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={reportData.charts}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="focus" stroke="#00f0ff" strokeWidth={3} dot={{ fill: '#00f0ff', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="insights-chart-card">
          <h3>Relaxation Pattern</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={reportData.charts}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="relaxation" stroke="#44dd88" strokeWidth={3} dot={{ fill: '#44dd88', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="insights-chart-card">
          <h3>Stress Indicator</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={reportData.charts}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="stress" stroke="#ff88cc" strokeWidth={3} dot={{ fill: '#ff88cc', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="insights-chart-card">
          <h3>Cognitive Fatigue</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={reportData.charts}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="fatigue" stroke="#ffaa44" strokeWidth={3} dot={{ fill: '#ffaa44', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Report Section */}
      <div className="insights-report-content">
        {renderMarkdown(reportData.markdown)}
        
        {/* Disclaimer */}
        <div style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderLeft: '4px solid var(--border-subtle)',
          borderRadius: '0 8px 8px 0',
          fontSize: '13px',
          color: 'var(--text-muted)',
          lineHeight: '1.6'
        }}>
          <strong>Disclaimer:</strong> This report is machine-generated based on consumer-grade EEG data and is intended for informational and personal improvement purposes only. It does not constitute a medical diagnosis, medical advice, or psychiatric evaluation. If you are experiencing severe mental distress, anxiety, or depression, please consult a qualified healthcare professional or mental health provider.
        </div>
      </div>
      </div>
    </div>
  )
}
