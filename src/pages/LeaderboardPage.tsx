import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'
import type { Season, LeaderboardRow } from '../types'

function formatMoney(amount: number): string {
  return '$' + amount.toLocaleString('en-US')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function LeaderboardPage() {
  const [activeSeason, setActiveSeason] = useState<Season | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [pastSeasons, setPastSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pastExpanded, setPastExpanded] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // 1. Get active season
        const { data: season, error: seasonErr } = await supabase
          .from('seasons')
          .select('*')
          .eq('status', 'active')
          .single()

        if (seasonErr) {
          // If no active season found, still continue
          if (seasonErr.code !== 'PGRST116') {
            throw seasonErr
          }
        }

        setActiveSeason(season ?? null)

        if (season) {
          // 2. Get sessions for active season
          // TODO: Replace with server-side GROUP BY aggregation (RPC/view) when session count grows
          const { data: sessionRows, error: sessionsErr } = await supabase
            .from('sessions')
            .select('channel_name, money_earned, served')
            .eq('season_id', season.id)
            .limit(5000)

          if (sessionsErr) throw sessionsErr

          // Aggregate in JS
          const map = new Map<string, LeaderboardRow>()
          for (const row of sessionRows ?? []) {
            const existing = map.get(row.channel_name)
            if (existing) {
              existing.total_money += row.money_earned ?? 0
              existing.sessions += 1
              existing.total_served += row.served ?? 0
            } else {
              map.set(row.channel_name, {
                channel_name: row.channel_name,
                total_money: row.money_earned ?? 0,
                sessions: 1,
                total_served: row.served ?? 0,
              })
            }
          }

          const sorted = Array.from(map.values()).sort(
            (a, b) => b.total_money - a.total_money
          )
          setLeaderboard(sorted.slice(0, 50))
        }

        // 3. Get past seasons
        const { data: past, error: pastErr } = await supabase
          .from('seasons')
          .select('*')
          .eq('status', 'ended')
          .order('number', { ascending: false })

        if (pastErr) throw pastErr
        setPastSeasons(past ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const progressPct = activeSeason
    ? Math.min(
        100,
        (activeSeason.total_money_earned / activeSeason.money_goal) * 100
      )
    : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px' }}>
        {loading && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '64px' }}>
            Loading...
          </p>
        )}

        {error && (
          <p style={{ color: 'var(--danger)', textAlign: 'center', marginTop: '64px' }}>
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {/* Season progress */}
            {activeSeason ? (
              <section
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '24px',
                  marginBottom: '24px',
                }}
              >
                <h2 style={{ color: 'var(--gold)', marginBottom: '12px', fontSize: '18px' }}>
                  Season {activeSeason.number}
                </h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                  <span>{formatMoney(activeSeason.total_money_earned)} / {formatMoney(activeSeason.money_goal)}</span>
                  <span>{progressPct.toFixed(1)}%</span>
                </div>
                <div
                  style={{
                    height: '12px',
                    background: 'var(--border)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPct}%`,
                      background: 'var(--gold)',
                      borderRadius: '6px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </section>
            ) : (
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                No active season at the moment.
              </p>
            )}

            {/* Leaderboard table */}
            <section
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                marginBottom: '24px',
              }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ color: 'var(--gold)', fontSize: '18px' }}>
                  🏆 Global Leaderboard
                  {activeSeason ? ` — Season ${activeSeason.number}` : ''}
                </h2>
              </div>

              {leaderboard.length === 0 ? (
                <p style={{ padding: '32px 24px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No data yet this season.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', width: '48px' }}>#</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Channel</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Earnings</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Sessions</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Served</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((row, idx) => (
                        <tr
                          key={row.channel_name}
                          style={{
                            borderTop: '1px solid var(--border)',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                        >
                          <td style={{ padding: '14px 16px', color: idx < 3 ? 'var(--gold)' : 'var(--text-muted)', fontWeight: idx < 3 ? 700 : 400 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <Link
                              to={`/player/${encodeURIComponent(row.channel_name.toLowerCase())}`}
                              style={{ color: 'var(--text)', fontWeight: 500 }}
                            >
                              {row.channel_name}
                            </Link>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontWeight: 600 }}>
                            {formatMoney(row.total_money)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {row.sessions}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {row.total_served}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Past seasons */}
            <section
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setPastExpanded(prev => !prev)}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '15px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {pastExpanded ? '▾' : '▸'}
                </span>
                Past Seasons
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '13px' }}>
                  ({pastSeasons.length})
                </span>
              </button>

              {pastExpanded && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {pastSeasons.length === 0 ? (
                    <p style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>
                      No past seasons yet.
                    </p>
                  ) : (
                    pastSeasons.map(s => (
                      <div
                        key={s.id}
                        style={{
                          padding: '14px 24px',
                          borderTop: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '8px',
                          fontSize: '14px',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Season {s.number}</span>
                        <span style={{ color: 'var(--gold)' }}>{formatMoney(s.total_money_earned)}</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {formatDate(s.started_at)}
                          {s.ended_at ? ` – ${formatDate(s.ended_at)}` : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
