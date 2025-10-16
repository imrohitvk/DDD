import React, { useMemo } from 'react'

function getSectionMedal(rank) {
  const medals = ['🥇', '🥈', '🥉'];
  return medals[rank] || '⭐';
}

function getSectionRankColor(rank) {
  const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
  return colors[rank] || '#8b5cf6';
}

export default function SectionWiseLeaderboard({ longData, quizNumbers }) {
  const sectionChampions = useMemo(() => {
    const studentPerformance = {};

    // Aggregate all quiz data for each student
    longData.forEach(record => {
      const studentKey = `${record.name}-${record.email}`;

      if (!studentPerformance[studentKey]) {
        studentPerformance[studentKey] = {
          name: record.name,
          email: record.email,
          quizScores: [],
          quizAttempts: [],
          completedQuizzes: new Set()
        };
      }

      if (record.score !== null) {
        studentPerformance[studentKey].quizScores.push(record.score);
        studentPerformance[studentKey].completedQuizzes.add(record.quiz);
      }

      if (record.attempts !== null) {
        studentPerformance[studentKey].quizAttempts.push(record.attempts);
      }
    });

    // Calculate metrics and rank students
    const rankedStudents = Object.values(studentPerformance)
      .filter(student => student.quizScores.length > 0)
      .map(student => {
        const totalQuizzes = quizNumbers.length;
        const completedCount = student.completedQuizzes.size;
        const perfectCount = student.quizScores.filter(score => score === 100).length;
        const totalAttempts = student.quizAttempts.reduce((sum, attempts) => sum + attempts, 0);
        
        // For binary grading: Section champion = 100% on ALL quizzes
        const isSectionChampion = perfectCount === totalQuizzes && completedCount === totalQuizzes;
        
        return {
          ...student,
          totalQuizzes,
          completedCount,
          perfectCount,
          totalAttempts,
          isSectionChampion
        };
      })
      .sort((a, b) => {
        // Tier 1: Section champions (100% on ALL quizzes) come first
        if (a.isSectionChampion !== b.isSectionChampion) {
          return b.isSectionChampion - a.isSectionChampion;
        }

        // Tier 2: Among section champions, rank by minimum total attempts
        if (a.isSectionChampion && b.isSectionChampion) {
          return a.totalAttempts - b.totalAttempts; // Fewer attempts = better
        }

        // Tier 3: Non-champions ranked by number of perfect scores, then completion
        if (a.perfectCount !== b.perfectCount) {
          return b.perfectCount - a.perfectCount;
        }
        if (a.completedCount !== b.completedCount) {
          return b.completedCount - a.completedCount;
        }
        return a.totalAttempts - b.totalAttempts;
      })
      .slice(0, 3);

    return rankedStudents;
  }, [longData, quizNumbers]);

  return (
    <div className="card" style={{
      marginBottom: '20px',
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#dbeafe',
        textAlign: 'center'
      }}>
        🏆 Section Champions - Completion & Efficiency Masters 🏆
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sectionChampions.map((champion, index) => (
          <div
            key={`${champion.name}-${champion.email}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: index === 0
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.15))'
                : index === 1
                ? 'linear-gradient(135deg, rgba(156, 163, 175, 0.2), rgba(107, 114, 128, 0.15))'
                : 'linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(194, 65, 12, 0.15))',
              padding: '14px 18px',
              borderRadius: '14px',
              border: `2px solid ${getSectionRankColor(index)}50`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              boxShadow: `0 4px 15px ${getSectionRankColor(index)}20`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
              e.currentTarget.style.boxShadow = `0 12px 30px ${getSectionRankColor(index)}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px) scale(1)';
              e.currentTarget.style.boxShadow = `0 4px 15px ${getSectionRankColor(index)}20`;
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }}>
                {getSectionMedal(index)}
              </span>
              <div>
                <div style={{
                  fontWeight: 'bold',
                  color: getSectionRankColor(index),
                  fontSize: '1.2rem',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {champion.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>
                  {champion.email}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: 'bold',
                  color: champion.isSectionChampion ? '#10b981' : '#f59e0b',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {champion.isSectionChampion ? '🏆' : `${champion.perfectCount}/${champion.totalQuizzes}`}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                  {champion.isSectionChampion ? 'CHAMPION' : 'PERFECT SCORES'}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: 'bold',
                  color: '#ef4444',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {champion.totalAttempts}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                  TOTAL ATTEMPTS
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: 'bold',
                  color: '#8b5cf6',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {champion.completedCount}/{champion.totalQuizzes}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                  COMPLETED
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="footer-note" style={{ marginTop: '12px', fontStyle: 'italic' }}>
        Section Champions: Students with 100% on ALL quizzes, ranked by minimum total attempts!
      </div>
    </div>
  )
}