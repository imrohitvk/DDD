import React, { useMemo } from 'react';

function getMedal(rank) {
  if (rank === 0) return '🥇'
  if (rank === 1) return '🥈'
  if (rank === 2) return '🥉'
  return '⭐'
}

function getRankColor(rank) {
  if (rank === 0) return '#ffd700'
  if (rank === 1) return '#c0c0c0'
  if (rank === 2) return '#cd7f32'
  return '#8b5cf6'
}

export default function QuizWiseLeaderboard({ longData = [], selectedQuiz }) {
  const quizId = selectedQuiz == null ? null : Number(selectedQuiz)

  const toppers = useMemo(() => {
    if (quizId == null || Number.isNaN(quizId)) return []

    const list = (longData || [])
      .filter(d => Number(d.quiz) === quizId && d.score !== null && d.attempts !== null && Number(d.attempts) > 0)
      .map(d => ({
        name: d.name,
        email: d.email,
        score: Number(d.score),
        attempts: Number(d.attempts),
        efficiencyScore: Number(d.score) === 100 ? 100 + (10 - Math.min(Number(d.attempts), 10)) : (Number(d.score) / Number(d.attempts)),
      }))
      .sort((a, b) => {
        if (b.efficiencyScore !== a.efficiencyScore) return b.efficiencyScore - a.efficiencyScore
        if (b.score !== a.score) return b.score - a.score
        return a.attempts - b.attempts
      })

    return list.slice(0, 3)
  }, [longData, quizId])

  if (quizId == null) {
    return (
      <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.1))' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: '700', color: '#dbeafe', textAlign: 'center' }}>
          🏆 Quiz Leaderboard 🏆
        </h3>
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Select a quiz to see the top performers.</p>
      </div>
    )
  }

  if (!toppers.length) {
    return (
      <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.1))' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: '700', color: '#dbeafe', textAlign: 'center' }}>
          🏆 Quiz {selectedQuiz} Leaderboard 🏆
        </h3>
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No submissions for this quiz (attempts must be &gt; 0).</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.1))' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: '700', color: '#dbeafe', textAlign: 'center' }}>
        🏆 Quiz {selectedQuiz} Top Performers 🏆
      </h3>
      {toppers.map((t, i) => (
        <div key={t.email + '-' + i} style={{ 
          marginBottom: '12px', 
          padding: '12px 16px', 
          background: i === 0 ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.15))'
            : i === 1 ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(169, 169, 169, 0.15))'
            : 'linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(184, 115, 51, 0.15))',
          borderRadius: '12px',
          border: `2px solid ${getRankColor(i)}40`,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '2rem' }}>{getMedal(i)}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: getRankColor(i) }}>{t.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>{t.email}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.score === 100 ? '#10b981' : t.score >= 70 ? '#3b82f6' : t.score >= 50 ? '#f59e0b' : '#ef4444' }}>{t.score}%</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>{t.attempts} attempt{t.attempts !== 1 ? 's' : ''}</div>
              <div style={{ color: '#e2e8f0', fontSize: 12 }}>eff {t.efficiencyScore.toFixed(2)}</div>
            </div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
        Ranking: efficiency = (score/attempts). Perfect score (100%) gets a small bonus so perfect fast completions rank higher.
      </div>
    </div>
  )
}