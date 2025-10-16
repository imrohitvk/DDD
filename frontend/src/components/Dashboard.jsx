import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import Plot from 'react-plotly.js'
import './Dashboard.css'
import SectionWiseLeaderboard from './SectionWiseLeaderboard'
import QuizWiseLeaderboard from './QuizWiseLeaderboard'

function numeric(v) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

export default function Dashboard() {
  const [rawCsv, setRawCsv] = useState(null)
  const [dataRows, setDataRows] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(1)
  const [activeTab, setActiveTab] = useState('quiz')

  useEffect(() => {
    axios.get('/api/data/tableau')
      .then(res => {
        setRawCsv(res.data)
      })
      .catch(err => {
        console.error('Failed to fetch CSV:', err)
      })
  }, [])

  useEffect(() => {
    if (!rawCsv) return
    Papa.parse(rawCsv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        setDataRows(results.data)
      }
    })
  }, [rawCsv])

  // detect quiz numbers from headers
  const quizNumbers = useMemo(() => {
    if (!dataRows || dataRows.length === 0) return []
    const first = dataRows[0]
    const keys = Object.keys(first)
    const nums = new Set()
    keys.forEach(k => {
      const m = k.match(/Quiz(\d+)_/) || k.match(/Quiz(\d+)_Score/) || k.match(/Quiz(\d+)_Score/)
      if (m && m[1]) nums.add(Number(m[1]))
    })
    // fallback: scan for "Quiz1_Score (in %)" style
    keys.forEach(k => {
      const m = k.match(/Quiz(\d+)_Score/) || k.match(/Quiz(\d+)_Score \(in %\)/)
      if (m && m[1]) nums.add(Number(m[1]))
    })
    return Array.from(nums).sort((a,b) => a-b)
  }, [dataRows])

  // transform to long format: {name,email,quiz,score,attempts}
  const longData = useMemo(() => {
    const out = []
    if (!dataRows || dataRows.length === 0 || quizNumbers.length === 0) return out
    dataRows.forEach(r => {
      quizNumbers.forEach(n => {
        // header names in the file
        const scoreKey = `Quiz${n}_Score (in %)`
        const scoreKeyAlt = `Quiz${n}_Score`
        const attemptsKey = `Quiz${n}_Total attempts`
        const scoreVal = r.hasOwnProperty(scoreKey) ? r[scoreKey] : (r.hasOwnProperty(scoreKeyAlt) ? r[scoreKeyAlt] : null)
        const attemptsVal = r.hasOwnProperty(attemptsKey) ? r[attemptsKey] : r[attemptsKey]
        const score = numeric(scoreVal)
        const attempts = numeric(attemptsVal)
        out.push({
          name: r.Name || r.name || '',
          email: r.Email || r.email || '',
          quiz: n,
          score,
          attempts
        })
      })
    })
    return out
  }, [dataRows, quizNumbers])

  const avgByQuiz = useMemo(() => {
    const map = {}
    quizNumbers.forEach(n => { map[n] = { sum:0, cnt:0, attemptsSum:0, attemptsCnt:0, scores:[] } })
    longData.forEach(d => {
      // Only include data if the student actually attempted the quiz (attempts > 0)
      if (d.attempts !== null && d.attempts > 0) {
        if (d.score !== null && d.score !== undefined) {
          map[d.quiz].sum += d.score
          map[d.quiz].cnt += 1
          map[d.quiz].scores.push(d.score)
        }
        map[d.quiz].attemptsSum += d.attempts
        map[d.quiz].attemptsCnt += 1
      }
    })
    const res = quizNumbers.map(n => ({
      quiz: n,
      avgScore: map[n].cnt ? map[n].sum / map[n].cnt : null,
      avgAttempts: map[n].attemptsCnt ? map[n].attemptsSum / map[n].attemptsCnt : null,
      scores: map[n].scores
    }))
    return res
  }, [longData, quizNumbers])

  const selectedScores = useMemo(() => {
    const row = avgByQuiz.find(r => r.quiz === Number(selectedQuiz))
    return row ? row.scores : []
  }, [avgByQuiz, selectedQuiz])

  const topPerformers = useMemo(() => {
    const filtered = longData.filter(d => d.quiz === Number(selectedQuiz) && d.score !== null)
    const sorted = filtered.sort((a,b) => (b.score||0) - (a.score||0))
    return sorted.slice(0, 10)
  }, [longData, selectedQuiz])

  return (
    <div className="dashboard-root">
      <div className="dashboard-header">
        <div>
          <div className="dashboard-title">Dashboard</div>
          <div className="small-muted">Interactive insights from the CSV — colorful visual summary</div>
        </div>
        <div className="badge">CSV data</div>
      </div>

      {!rawCsv && <p className="small-muted">Loading CSV...</p>}
      {rawCsv && quizNumbers.length === 0 && <p className="small-muted">No quiz columns detected</p>}

      {quizNumbers.length > 0 && (
        <>
          <div className="controls">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div className="tabs">
                <button className={`tab-btn ${activeTab==='quiz'?'active':''}`} onClick={() => setActiveTab('quiz')}>Section-wise</button>
                <button className={`tab-btn ${activeTab==='section'?'active':''}`} onClick={() => setActiveTab('section')}>Quiz-wise</button>
              </div>
              <div className="small-muted">Participants: {dataRows.length}</div>
            </div>
          </div>

          {activeTab === 'section' && (
            <>
              <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(91, 33, 182, 0.1), rgba(139, 92, 246, 0.1))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#dbeafe' }}>Quiz-wise Overview</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>Select a quiz to view detailed analytics</p>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    <label style={{ 
                      fontWeight: 600, 
                      color: '#e2e8f0',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap'
                    }}>Select Quiz:</label>
                    <select 
                      value={selectedQuiz} 
                      onChange={e => setSelectedQuiz(Number(e.target.value))}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '6px',
                        color: '#e2e8f0',
                        padding: '6px 12px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        minWidth: '100px'
                      }}
                    >
                      {quizNumbers.map(n => <option key={n} value={n}>Quiz {n}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(91, 33, 182, 0.1), rgba(139, 92, 246, 0.1))' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '700', color: '#dbeafe' }}>Quiz Statistics — Quiz {selectedQuiz}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  {(() => {
                    const stats = {
                      'Total Participants': selectedScores.length,
                      'Average Score': selectedScores.length > 0 ? `${(selectedScores.reduce((a,b) => a+b, 0) / selectedScores.length).toFixed(1)}%` : 'N/A',
                      'Highest Score': selectedScores.length > 0 ? `${Math.max(...selectedScores)}%` : 'N/A',
                      'Lowest Score': selectedScores.length > 0 ? `${Math.min(...selectedScores)}%` : 'N/A',
                      'Pass Rate (≥70%)': selectedScores.length > 0 ? `${((selectedScores.filter(s => s >= 70).length / selectedScores.length) * 100).toFixed(1)}%` : 'N/A',
                      'Avg Attempts': (() => {
                        const attempts = longData.filter(d => d.quiz === selectedQuiz && d.attempts !== null).map(d => d.attempts);
                        return attempts.length > 0 ? (attempts.reduce((a,b) => a+b, 0) / attempts.length).toFixed(1) : 'N/A';
                      })()
                    };
                    return Object.entries(stats).map(([key, value]) => (
                      <div key={key} style={{ 
                        background: 'rgba(139, 92, 246, 0.1)', 
                        padding: '12px', 
                        borderRadius: '8px',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '4px' }}>{value}</div>
                        <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{key}</div>
                      </div>
                    ));
                  })()}
                </div>
                <div className="footer-note">Key statistical insights for Quiz {selectedQuiz}.</div>
              </div>

              <QuizWiseLeaderboard longData={longData} selectedQuiz={selectedQuiz} />

              <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(91, 33, 182, 0.1), rgba(139, 92, 246, 0.1))' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '700', color: '#dbeafe' }}>Detailed Analytics — Quiz {selectedQuiz}</h3>
                <div>
                  {(() => {
                    const scores = selectedScores.sort((a,b) => a-b);
                    const attempts = longData.filter(d => d.quiz === selectedQuiz && d.attempts !== null).map(d => d.attempts);
                    const q1 = scores.length > 0 ? scores[Math.floor(scores.length * 0.25)] : 0;
                    const median = scores.length > 0 ? scores[Math.floor(scores.length * 0.5)] : 0;
                    const q3 = scores.length > 0 ? scores[Math.floor(scores.length * 0.75)] : 0;
                    const stdDev = scores.length > 1 ? Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - (scores.reduce((a,b) => a+b, 0) / scores.length), 2), 0) / (scores.length - 1)) : 0;
                    
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                          <h4 style={{ margin: '0 0 12px 0', color: '#3b82f6' }}>Score Statistics</h4>
                          <div style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                            <div><strong>Median:</strong> {median.toFixed(1)}%</div>
                            <div><strong>Q1 (25th):</strong> {q1.toFixed(1)}%</div>
                            <div><strong>Q3 (75th):</strong> {q3.toFixed(1)}%</div>
                            <div><strong>Std Dev:</strong> {stdDev.toFixed(1)}%</div>
                            <div><strong>Range:</strong> {scores.length > 0 ? (Math.max(...scores) - Math.min(...scores)).toFixed(1) : 0}%</div>
                          </div>
                        </div>
                        
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          <h4 style={{ margin: '0 0 12px 0', color: '#10b981' }}>Performance Insights</h4>
                          <div style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                            <div><strong>Excellence Rate:</strong> {scores.length > 0 ? ((scores.filter(s => s >= 90).length / scores.length) * 100).toFixed(1) : 0}% (≥90%)</div>
                            <div><strong>Pass Rate:</strong> {scores.length > 0 ? ((scores.filter(s => s >= 70).length / scores.length) * 100).toFixed(1) : 0}% (≥70%)</div>
                            <div><strong>Fail Rate:</strong> {scores.length > 0 ? ((scores.filter(s => s < 50).length / scores.length) * 100).toFixed(1) : 0}% (&lt;50%)</div>
                            <div><strong>Most Common Score:</strong> {(() => {
                              if (scores.length === 0) return 'N/A';
                              const freq = {};
                              scores.forEach(s => freq[Math.floor(s/10)*10] = (freq[Math.floor(s/10)*10] || 0) + 1);
                              const mostCommon = Object.entries(freq).reduce((a,b) => freq[a[0]] > freq[b[0]] ? a : b);
                              return `${mostCommon[0]}-${parseInt(mostCommon[0])+9}%`;
                            })()}</div>
                          </div>
                        </div>
                        
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <h4 style={{ margin: '0 0 12px 0', color: '#f59e0b' }}>Attempt Patterns</h4>
                          <div style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                            <div><strong>Max Attempts:</strong> {attempts.length > 0 ? Math.max(...attempts) : 'N/A'}</div>
                            <div><strong>Min Attempts:</strong> {attempts.length > 0 ? Math.min(...attempts) : 'N/A'}</div>

                            <div><strong>Persistent Learners:</strong> {attempts.length > 0 ? attempts.filter(a => a >= 3).length : 0} (≥3 attempts)</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="footer-note">Comprehensive statistical analysis and learning behavior insights.</div>
              </div>

              <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '700', color: '#dbeafe' }}>Performance Badges — Quiz {selectedQuiz}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                  {(() => {
                    const scores = selectedScores;
                    const attempts = longData.filter(d => d.quiz === selectedQuiz && d.attempts !== null).map(d => d.attempts);
                    const badges = [
                      {
                        label: 'Perfect Scorers',
                        count: scores.filter(s => s === 100).length,
                        icon: '✅',
                        color: '#10b981',
                        bgColor: 'rgba(16, 185, 129, 0.15)',
                        tooltip: 'Students who scored 100% (answered both questions correctly) and can progress to the next quiz.'
                      },
                      {
                        label: 'Ace on First Shot',
                        count: longData.filter(d => d.quiz === selectedQuiz && d.attempts === 1 && d.score === 100).length,
                        icon: '⚡',
                        color: '#3b82f6',
                        bgColor: 'rgba(59, 130, 246, 0.15)',
                        tooltip: 'Students who achieved 100% on their first attempt, showing excellent preparation and understanding.'
                      },
                      {
                        label: 'Struggling Students',
                        count: longData.filter(d => d.quiz === selectedQuiz && d.attempts > 0 && d.score !== null && d.score < 100).length,
                        icon: '�',
                        color: '#ef4444',
                        bgColor: 'rgba(239, 68, 68, 0.15)',
                        tooltip: 'Students who scored 0% (could not answer either question correctly) and are blocked from next quiz.'
                      },

                      {
                        label: 'Complete Misses',
                        count: scores.filter(s => s === 0).length,
                        icon: '❌',
                        color: '#ef4444',
                        bgColor: 'rgba(239, 68, 68, 0.15)',
                        tooltip: 'Students who scored 0% (could not answer either question correctly) and are blocked from next quiz.'
                      },
                      {
                        label: 'Progress Halted',
                        count: scores.filter(s => s < 100).length,
                        icon: '�',
                        color: '#dc2626',
                        bgColor: 'rgba(220, 38, 38, 0.15)',
                        tooltip: 'Students who scored less than 100% and cannot progress to the next quiz in the sequence.'
                      }
                    ];
                    
                    return badges.map((badge, idx) => (
                      <div 
                        key={idx} 
                        title={badge.tooltip}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: badge.bgColor,
                          border: `1px solid ${badge.color}30`,
                          borderRadius: '20px',
                          padding: '8px 16px',
                          minWidth: '120px',
                          cursor: 'help',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = `0 4px 12px ${badge.color}20`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0px)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{badge.icon}</span>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: badge.color }}>{badge.count}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{badge.label}</div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                <div className="footer-note">Achievement badges with participant counts for Quiz {selectedQuiz}.</div>
              </div>
            </>
          )}

          {activeTab === 'quiz' && (
            <>
              <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(91, 33, 182, 0.1), rgba(139, 92, 246, 0.1))' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: '700', color: '#dbeafe' }}>Section Overview — All Quizzes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                {(() => {
                  // Only count records where student actually attempted the quiz (attempts > 0)
                  const actualSubmissions = longData.filter(d => d.attempts !== null && d.attempts > 0);
                  const allScores = actualSubmissions.map(d => d.score).filter(s => s !== null);
                  const allAttempts = actualSubmissions.map(d => d.attempts);
                  const totalExpectedSubmissions = dataRows.length * quizNumbers.length;
                  const completionRate = totalExpectedSubmissions > 0 ? ((actualSubmissions.length / totalExpectedSubmissions) * 100).toFixed(1) : 0;
                  const stats = {
                    'Total Quizzes': quizNumbers.length,
                    'Total Participants': dataRows.length,
                    'Total Submissions': `${actualSubmissions.length} / ${totalExpectedSubmissions}`,
                    'Completion Rate': `${completionRate}%`,
                    'Overall Avg Score': allScores.length > 0 ? `${(allScores.reduce((a,b) => a+b, 0) / allScores.length).toFixed(1)}%` : 'N/A',
                    'Overall Pass Rate': allScores.length > 0 ? `${((allScores.filter(s => s >= 70).length / allScores.length) * 100).toFixed(1)}%` : 'N/A',
                    'Avg Attempts': allAttempts.length > 0 ? (allAttempts.reduce((a,b) => a+b, 0) / allAttempts.length).toFixed(1) : 'N/A'
                  };
                  return Object.entries(stats).map(([key, value]) => (
                    <div key={key} style={{ 
                      background: 'rgba(139, 92, 246, 0.1)', 
                      padding: '12px', 
                      borderRadius: '8px',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '4px' }}>{value}</div>
                      <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{key}</div>
                    </div>
                  ));
                })()}
              </div>
                <div className="footer-note">Comprehensive overview of all quiz performance across the section.</div>
              </div>
              
              {/* SECTION-WISE LEADERBOARD - Separate Component for Section Champions */}
              <SectionWiseLeaderboard 
                longData={longData} 
                quizNumbers={quizNumbers} 
              />

              <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: '700', color: '#dbeafe' }}>Section Achievement Badges</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                  {(() => {
                    // Only count actual submissions (attempts > 0), not records with 0 attempts
                    const actualSubmissions = longData.filter(d => d.attempts !== null && d.attempts > 0);
                    const allScores = actualSubmissions.map(d => d.score).filter(s => s !== null);
                    const allAttempts = actualSubmissions.map(d => d.attempts);
                    const studentStats = {};
                    // Build student stats only from actual submissions
                    actualSubmissions.forEach(d => {
                      const key = `${d.name}-${d.email}`;
                      if (!studentStats[key]) {
                        studentStats[key] = { scores: [], attempts: [] };
                      }
                      if (d.score !== null) studentStats[key].scores.push(d.score);
                      studentStats[key].attempts.push(d.attempts);
                    });
                    
                    const badges = [
                      {
                        label: 'Perfect Submissions',
                        count: allScores.filter(s => s === 100).length,
                        icon: '✅',
                        color: '#10b981',
                        bgColor: 'rgba(16, 185, 129, 0.15)',
                        tooltip: 'Quiz submissions with 100% score (answered both questions correctly). Only these allow progression to next quiz in the sequential system.'
                      },
                      {
                        label: 'Multi-Quiz Masters',
                        count: Object.values(studentStats).filter(s => {
                          const passedQuizzes = s.scores.filter(score => score === 100).length;
                          return passedQuizzes >= 3;
                        }).length,
                        icon: '🚀',
                        color: '#3b82f6',
                        bgColor: 'rgba(59, 130, 246, 0.15)',
                        tooltip: 'Students who successfully passed (100% score) at least 3 quizzes, demonstrating ability to progress through the sequential system.'
                      },
                      {
                        label: 'Section Champions',
                        count: Object.values(studentStats).filter(s => {
                          const passedQuizzes = s.scores.filter(score => score === 100).length;
                          return passedQuizzes === quizNumbers.length;
                        }).length,
                        icon: '🎓',
                        color: '#8b5cf6',
                        bgColor: 'rgba(139, 92, 246, 0.15)',
                        tooltip: 'Students who completed ALL quizzes in the section with 100% scores, achieving full mastery of the course content.'
                      },
                      {
                        label: 'One-Shot Winners',
                        count: longData.filter(d => d.attempts === 1 && d.score === 100).length,
                        icon: '⚡',
                        color: '#f59e0b',
                        bgColor: 'rgba(245, 158, 11, 0.15)',
                        tooltip: 'Quiz passes (100%) achieved on first attempt. Shows strong preparation and immediate understanding of concepts.'
                      },

                      {
                        label: 'Need Support',
                        count: Object.values(studentStats).filter(s => {
                          if (s.scores.length === 0) return false;
                          // Students who have attempted quizzes but never achieved 100% (can't progress in binary system)
                          const passedQuizzes = s.scores.filter(score => score === 100).length;
                          // Any student with attempts but no perfect scores needs support in binary grading
                          return passedQuizzes === 0 && s.scores.length >= 1;
                        }).length,
                        icon: '�',
                        color: '#ef4444',
                        bgColor: 'rgba(239, 68, 68, 0.15)',
                        tooltip: 'Students who have attempted multiple quizzes or made multiple attempts but never achieved 100% scores needed for progression in the binary grading system.'
                      }
                    ];
                    
                    return badges.map((badge, idx) => (
                      <div 
                        key={idx} 
                        title={badge.tooltip}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: badge.bgColor,
                          border: `1px solid ${badge.color}30`,
                          borderRadius: '20px',
                          padding: '8px 16px',
                          minWidth: '130px',
                          cursor: 'help',
                          transition: 'all 0.2s ease',
                          ':hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: `0 4px 12px ${badge.color}20`
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = `0 4px 12px ${badge.color}20`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0px)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{badge.icon}</span>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: badge.color }}>{badge.count}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{badge.label}</div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                <div className="footer-note">Achievement badges showing student performance patterns across all quizzes.</div>
              </div>
            </>
          )}          <div className="cards">
            {activeTab === 'quiz' && (
              <>

                <div className="card">
                  <h3>Average score per quiz</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          x: avgByQuiz.map(r => `Quiz ${r.quiz}`),
                          y: avgByQuiz.map(r => r.avgScore),
                          type: 'bar',
                          marker: { 
                            color: avgByQuiz.map(r => r.avgScore >= 80 ? '#10b981' : r.avgScore >= 70 ? '#3b82f6' : r.avgScore >= 60 ? '#f59e0b' : '#ef4444'),
                            line: { color: '#1e293b', width: 1 }
                          },
                          hovertemplate: 'Quiz %{x}<br>Average: %{y:.1f}%<extra></extra>',
                        }]}
                        layout={{ 
                          autosize: true, 
                          yaxis: { title: 'Average Score (%)', gridcolor: 'rgba(255,255,255,0.06)', color: '#e6eef8' }, 
                          xaxis: { color: '#e6eef8' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 50, r: 20 }, 
                          font: { color: '#e6eef8' },
                          height: 280
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Color-coded average scores: Green (≥80%), Blue (70-79%), Orange (60-69%), Red (&lt;60%).</div>
                </div>

                <div className="card">
                  <h3>Quiz difficulty analysis</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          x: avgByQuiz.map(r => `Quiz ${r.quiz}`),
                          y: avgByQuiz.map(r => r.avgAttempts),
                          type: 'scatter',
                          mode: 'lines+markers',
                          marker: { 
                            color: avgByQuiz.map(r => r.avgAttempts),
                            colorscale: 'Reds',
                            size: 10,
                            colorbar: { title: 'Avg Attempts', titlefont: { color: '#e6eef8' }, tickfont: { color: '#e6eef8' } }
                          },
                          line: { color: '#fb923c', width: 3 },
                          hovertemplate: 'Quiz %{x}<br>Avg Attempts: %{y:.1f}<extra></extra>'
                        }]}
                        layout={{ 
                          autosize: true, 
                          yaxis: { title: 'Average Attempts', gridcolor: 'rgba(255,255,255,0.04)', color: '#e6eef8' }, 
                          xaxis: { color: '#e6eef8' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 50, r: 70 }, 
                          font: { color: '#e6eef8' },
                          height: 280
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Higher attempts may indicate quiz difficulty or complexity.</div>
                </div>

                <div className="card">
                  <h3>Performance correlation: Score vs Attempts</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          x: avgByQuiz.map(r => r.avgAttempts),
                          y: avgByQuiz.map(r => r.avgScore),
                          mode: 'markers+text',
                          type: 'scatter',
                          text: avgByQuiz.map(r => `Q${r.quiz}`),
                          textposition: 'top center',
                          textfont: { color: '#e6eef8', size: 12 },
                          marker: { 
                            color: '#8b5cf6',
                            size: 12,
                            line: { color: '#7c3aed', width: 2 }
                          },
                          hovertemplate: 'Quiz %{text}<br>Avg Attempts: %{x:.1f}<br>Avg Score: %{y:.1f}%<extra></extra>'
                        }]}
                        layout={{ 
                          autosize: true, 
                          xaxis: { title: 'Average Attempts', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' }, 
                          yaxis: { title: 'Average Score (%)', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 50, r: 20 }, 
                          font: { color: '#e6eef8' },
                          height: 280
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Correlation between quiz difficulty (attempts) and performance (scores).</div>
                </div>

                <div className="card">
                  <h3>Quiz performance heatmap</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          z: [avgByQuiz.map(r => r.avgScore)],
                          x: avgByQuiz.map(r => `Quiz ${r.quiz}`),
                          y: ['Average Score'],
                          type: 'heatmap',
                          colorscale: [
                            [0, '#ef4444'],
                            [0.5, '#f59e0b'], 
                            [0.7, '#3b82f6'],
                            [1, '#10b981']
                          ],
                          hovertemplate: '%{x}<br>Score: %{z:.1f}%<extra></extra>',
                          colorbar: { 
                            title: 'Score (%)', 
                            titlefont: { color: '#e6eef8' }, 
                            tickfont: { color: '#e6eef8' }
                          }
                        }]}
                        layout={{ 
                          autosize: true,
                          xaxis: { color: '#e6eef8' },
                          yaxis: { color: '#e6eef8' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 80, r: 60 }, 
                          font: { color: '#e6eef8' },
                          height: 280
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Heat map visualization of quiz performance across the section.</div>
                </div>

                <div className="card">
                  <h3>Quiz completion trends</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          x: avgByQuiz.map(r => `Quiz ${r.quiz}`),
                          y: avgByQuiz.map(r => {
                            const quizData = longData.filter(d => d.quiz === r.quiz && d.score === 100);
                            return quizData.length;
                          }),
                          type: 'bar',
                          marker: { 
                            color: '#06b6d4',
                            line: { color: '#0891b2', width: 1 }
                          },
                          hovertemplate: '%{x}<br>Perfect Scores: %{y}<extra></extra>'
                        }]}
                        layout={{ 
                          autosize: true, 
                          xaxis: { title: 'Quiz', color: '#e6eef8' }, 
                          yaxis: { title: 'Perfect Scores (100%)', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 60, r: 20 }, 
                          font: { color: '#e6eef8' },
                          height: 280
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Number of students who achieved perfect scores (100%) in each quiz.</div>
                </div>

                <div className="card">
                  <h3>Grade distribution across all quizzes</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          values: [
                            longData.filter(d => d.score >= 90).length,
                            longData.filter(d => d.score >= 70 && d.score < 90).length,
                            longData.filter(d => d.score >= 50 && d.score < 70).length,
                            longData.filter(d => d.score < 50 && d.score !== null).length
                          ],
                          labels: ['A (90-100%)', 'B (70-89%)', 'C (50-69%)', 'F (<50%)'],
                          type: 'pie',
                          marker: { 
                            colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                            line: { color: '#1e293b', width: 2 }
                          },
                          hovertemplate: '%{label}<br>Count: %{value}<br>Percentage: %{percent}<extra></extra>',
                          textfont: { color: '#e6eef8', size: 12 }
                        }]}
                        layout={{ 
                          autosize: true,
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 30, l: 20, r: 20 }, 
                          font: { color: '#e6eef8' },
                          showlegend: true,
                          legend: { font: { color: '#e6eef8' }, orientation: 'h', y: -0.15 },
                          height: 280
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Overall grade distribution across all quiz submissions in the section.</div>
                </div>



                <div className="card">
                  <h3>Performance consistency analysis</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          x: avgByQuiz.map(r => r.quiz),
                          y: avgByQuiz.map(r => {
                            const scores = r.scores;
                            if (scores.length <= 1) return 0;
                            const mean = scores.reduce((a,b) => a+b, 0) / scores.length;
                            const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / (scores.length - 1);
                            return Math.sqrt(variance);
                          }),
                          type: 'scatter',
                          mode: 'lines+markers',
                          marker: { 
                            color: '#8b5cf6',
                            size: 8
                          },
                          line: { color: '#8b5cf6', width: 3 },
                          hovertemplate: 'Quiz %{x}<br>Std Deviation: %{y:.1f}<extra></extra>'
                        }]}
                        layout={{ 
                          autosize: true, 
                          xaxis: { title: 'Quiz Number', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' }, 
                          yaxis: { title: 'Score Standard Deviation', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 60, r: 20 }, 
                          font: { color: '#e6eef8' },
                          height: 280,
                          showlegend: false
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Standard deviation trends showing score consistency across quizzes (lower = more consistent).</div>
                </div>

                <div className="card">
                  <h3>Learning curve analysis</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[
                          {
                            x: avgByQuiz.map(r => r.quiz),
                            y: avgByQuiz.map(r => r.avgScore),
                            type: 'scatter',
                            mode: 'lines+markers',
                            name: 'Average Score',
                            marker: { color: '#3b82f6', size: 8 },
                            line: { color: '#3b82f6', width: 3 },
                            yaxis: 'y',
                            hovertemplate: 'Quiz %{x}<br>Avg Score: %{y:.1f}%<extra></extra>'
                          },
                          {
                            x: avgByQuiz.map(r => r.quiz),
                            y: avgByQuiz.map(r => {
                              const passRate = longData.filter(d => d.quiz === r.quiz && d.score >= 70).length;
                              const total = longData.filter(d => d.quiz === r.quiz && d.score !== null).length;
                              return total > 0 ? (passRate / total) * 100 : 0;
                            }),
                            type: 'scatter',
                            mode: 'lines+markers',
                            name: 'Pass Rate',
                            marker: { color: '#10b981', size: 8 },
                            line: { color: '#10b981', width: 3 },
                            yaxis: 'y2',
                            hovertemplate: 'Quiz %{x}<br>Pass Rate: %{y:.1f}%<extra></extra>'
                          }
                        ]}
                        layout={{ 
                          autosize: true, 
                          xaxis: { title: 'Quiz Number', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' }, 
                          yaxis: { 
                            title: 'Average Score (%)', 
                            color: '#3b82f6', 
                            gridcolor: 'rgba(255,255,255,0.06)',
                            side: 'left'
                          },
                          yaxis2: {
                            title: 'Pass Rate (%)',
                            color: '#10b981',
                            overlaying: 'y',
                            side: 'right'
                          },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 60, r: 60 }, 
                          font: { color: '#e6eef8' },
                          height: 280,
                          legend: { font: { color: '#e6eef8' }, orientation: 'h', y: 1.02 }
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Dual-axis chart showing learning progression with average scores and pass rates over time.</div>
                </div>


              </>
            )}

            {activeTab === 'section' && (
              <>

                <div className="card">
                  <h3>Score distribution — Quiz {selectedQuiz}</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          x: selectedScores,
                          type: 'histogram',
                          marker: { color: '#06b6d4', line: { color: '#0891b2', width: 1 } },
                          nbinsx: 10
                        }]}
                        layout={{ 
                          autosize: true, 
                          xaxis: { title: 'Score (%)', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' }, 
                          yaxis: { title: 'Count', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 50, r: 20 }, 
                          font: { color: '#e6eef8' },
                          height: 280
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Distribution of participant scores for Quiz {selectedQuiz}.</div>
                </div>

                <div className="card">
                  <h3>Score vs Attempts — Quiz {selectedQuiz}</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          x: longData.filter(d => d.quiz === selectedQuiz && d.attempts !== null).map(d => d.attempts),
                          y: longData.filter(d => d.quiz === selectedQuiz && d.score !== null).map(d => d.score),
                          mode: 'markers',
                          type: 'scatter',
                          marker: { 
                            color: longData.filter(d => d.quiz === selectedQuiz && d.score !== null).map(d => d.score),
                            colorscale: 'Viridis',
                            size: 8,
                            colorbar: { title: 'Score (%)', titlefont: { color: '#e6eef8' }, tickfont: { color: '#e6eef8' } }
                          },
                          hovertemplate: 'Attempts: %{x}<br>Score: %{y}%<extra></extra>'
                        }]}
                        layout={{ 
                          autosize: true, 
                          xaxis: { title: 'Number of Attempts', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' }, 
                          yaxis: { title: 'Score (%)', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 50, r: 70 }, 
                          font: { color: '#e6eef8' },
                          height: 280
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Relationship between attempts and final scores for Quiz {selectedQuiz}.</div>
                </div>

                <div className="card">
                  <h3>Performance Categories — Quiz {selectedQuiz}</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          values: [
                            selectedScores.filter(s => s >= 90).length,
                            selectedScores.filter(s => s >= 70 && s < 90).length,
                            selectedScores.filter(s => s >= 50 && s < 70).length,
                            selectedScores.filter(s => s < 50).length
                          ],
                          labels: ['Excellent (90-100%)', 'Good (70-89%)', 'Average (50-69%)', 'Needs Improvement (<50%)'],
                          type: 'pie',
                          marker: { 
                            colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                            line: { color: '#1e293b', width: 2 }
                          },
                          hovertemplate: '%{label}<br>Count: %{value}<br>Percentage: %{percent}<extra></extra>',
                          textfont: { color: '#e6eef8' }
                        }]}
                        layout={{ 
                          autosize: true,
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 30, l: 30, r: 30 }, 
                          font: { color: '#e6eef8' },
                          showlegend: true,
                          legend: { font: { color: '#e6eef8' }, orientation: 'h', y: -0.2 },
                          height: 280
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Performance distribution by grade categories for Quiz {selectedQuiz}.</div>
                </div>

                <div className="card">
                  <h3>Attempts Distribution — Quiz {selectedQuiz}</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          x: longData.filter(d => d.quiz === selectedQuiz && d.attempts !== null).map(d => d.attempts),
                          type: 'histogram',
                          marker: { color: '#f59e0b', line: { color: '#d97706', width: 1 } },
                          nbinsx: 8
                        }]}
                        layout={{ 
                          autosize: true, 
                          xaxis: { title: 'Number of Attempts', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' }, 
                          yaxis: { title: 'Number of Participants', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 60, r: 20 }, 
                          font: { color: '#e6eef8' },
                          height: 280
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Distribution of attempt counts for Quiz {selectedQuiz}.</div>
                </div>

                <div className="card">
                  <h3>Success Rate by Attempts — Quiz {selectedQuiz}</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          x: (() => {
                            const attemptData = longData.filter(d => d.quiz === selectedQuiz && d.attempts !== null && d.score !== null);
                            const attemptGroups = {};
                            attemptData.forEach(d => {
                              if (!attemptGroups[d.attempts]) attemptGroups[d.attempts] = [];
                              attemptGroups[d.attempts].push(d.score >= 70 ? 1 : 0);
                            });
                            return Object.keys(attemptGroups).map(Number).sort((a,b) => a-b);
                          })(),
                          y: (() => {
                            const attemptData = longData.filter(d => d.quiz === selectedQuiz && d.attempts !== null && d.score !== null);
                            const attemptGroups = {};
                            attemptData.forEach(d => {
                              if (!attemptGroups[d.attempts]) attemptGroups[d.attempts] = [];
                              attemptGroups[d.attempts].push(d.score >= 70 ? 1 : 0);
                            });
                            return Object.keys(attemptGroups).map(Number).sort((a,b) => a-b).map(attempts => {
                              const group = attemptGroups[attempts];
                              return group.length > 0 ? (group.reduce((a,b) => a+b, 0) / group.length) * 100 : 0;
                            });
                          })(),
                          type: 'bar',
                          marker: { color: '#10b981', line: { color: '#059669', width: 1 } },
                          hovertemplate: 'Attempts: %{x}<br>Success Rate: %{y:.1f}%<extra></extra>'
                        }]}
                        layout={{ 
                          autosize: true, 
                          xaxis: { title: 'Number of Attempts', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' }, 
                          yaxis: { title: 'Success Rate (%)', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)', range: [0, 100] },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 60, r: 20 }, 
                          font: { color: '#e6eef8' },
                          height: 280
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Success rate (≥70%) by number of attempts for Quiz {selectedQuiz}.</div>
                </div>

                <div className="card">
                  <h3>Score Trends & Patterns — Quiz {selectedQuiz}</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[
                          {
                            y: selectedScores.sort((a,b) => a-b),
                            type: 'box',
                            name: `Quiz ${selectedQuiz}`,
                            marker: { color: '#8b5cf6' },
                            boxpoints: 'all',
                            pointpos: 0
                          }
                        ]}
                        layout={{ 
                          autosize: true, 
                          yaxis: { title: 'Score (%)', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 50, r: 20 }, 
                          font: { color: '#e6eef8' },
                          height: 280,
                          showlegend: false
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Box plot showing quartiles, median, and outliers for Quiz {selectedQuiz}.</div>
                </div>

                <div className="card">
                  <h3>Score Improvement Timeline — Quiz {selectedQuiz}</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[{
                          x: longData.filter(d => d.quiz === selectedQuiz && d.score !== null).map((d, idx) => idx + 1),
                          y: longData.filter(d => d.quiz === selectedQuiz && d.score !== null).map(d => d.score).sort((a,b) => a-b),
                          type: 'scatter',
                          mode: 'lines+markers',
                          marker: { color: '#a855f7', size: 6 },
                          line: { color: '#a855f7', width: 2 },
                          name: 'Sorted Scores',
                          hovertemplate: 'Participant #%{x}<br>Score: %{y}%<extra></extra>'
                        }]}
                        layout={{ 
                          autosize: true, 
                          xaxis: { title: 'Participant Rank (by score)', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' }, 
                          yaxis: { title: 'Score (%)', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 50, r: 20 }, 
                          font: { color: '#e6eef8' },
                          height: 280,
                          showlegend: false
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Score progression curve showing performance distribution for Quiz {selectedQuiz}.</div>
                </div>



                <div className="card">
                  <h3>Performance Comparison — Quiz {selectedQuiz}</h3>
                  <div className="plot-fill">
                    <div>
                      <Plot
                        data={[
                          {
                            x: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
                            y: [
                              selectedScores.filter(s => s <= 20).length,
                              selectedScores.filter(s => s > 20 && s <= 40).length,
                              selectedScores.filter(s => s > 40 && s <= 60).length,
                              selectedScores.filter(s => s > 60 && s <= 80).length,
                              selectedScores.filter(s => s > 80).length
                            ],
                            type: 'bar',
                            name: `Quiz ${selectedQuiz}`,
                            marker: { 
                              color: ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#10b981'],
                              line: { color: '#1e293b', width: 1 }
                            },
                            hovertemplate: 'Score Range: %{x}<br>Students: %{y}<extra></extra>'
                          }
                        ]}
                        layout={{ 
                          autosize: true, 
                          xaxis: { title: 'Score Ranges', color: '#e6eef8' }, 
                          yaxis: { title: 'Number of Students', color: '#e6eef8', gridcolor: 'rgba(255,255,255,0.06)' },
                          paper_bgcolor: 'rgba(0,0,0,0)', 
                          plot_bgcolor: 'rgba(0,0,0,0)', 
                          margin: { t: 10, b: 50, l: 50, r: 20 }, 
                          font: { color: '#e6eef8' },
                          height: 280,
                          showlegend: false
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="footer-note">Color-coded score ranges showing student distribution for Quiz {selectedQuiz}.</div>
                </div>


              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
