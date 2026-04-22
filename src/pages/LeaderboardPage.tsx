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

function rankDisplay(idx: number): React.ReactNode {
  if (idx === 0) return <span style={{ fontSize: '18px' }}>🥇</span>
  if (idx === 1) return <span style={{ fontSize: '18px' }}>🥈</span>
  if (idx === 2) return <span style={{ fontSize: '18px' }}>🥉</span>
  return <span style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>
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
            .select('channel_name, money_earned, served, lost')
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
              existing.total_lost += row.lost ?? 0
            } else {
              map.set(row.channel_name, {
                channel_name: row.channel_name,
                total_money: row.money_earned ?? 0,
                sessions: 1,
                total_served: row.served ?? 0,
                total_lost: row.lost ?? 0,
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

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
        {loading && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '64px', fontFamily: "'Space Mono', monospace" }}>
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
            {/* Season progress card */}
            {activeSeason ? (
              <section
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <span style={{
                    fontFamily: "'Fredoka', sans-serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--gold)',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                  }}>
                    Season {activeSeason.number}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", fontSize: '13px' }}>
                    {formatMoney(activeSeason.total_money_earned)} / {formatMoney(activeSeason.money_goal)}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", fontSize: '13px' }}>
                    {progressPct.toFixed(1)}%
                  </span>
                </div>
                <div style={{
                  height: '10px',
                  background: 'var(--bg-dark, #171412)',
                  borderRadius: '5px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    background: 'var(--gold)',
                    borderRadius: '5px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </section>
            ) : (
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                No active season at the moment.
              </p>
            )}

            {/* Leaderboard table */}
            <section style={{ marginBottom: '24px' }}>
              <h2 style={{
                fontFamily: "'Fredoka', sans-serif",
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '12px',
                letterSpacing: '0.5px',
              }}>
                🏆 LEADERBOARD
                {activeSeason && (
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '12px',
                    fontWeight: 400,
                    color: 'var(--text-muted)',
                    marginLeft: '10px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}>
                    Season {activeSeason.number}
                  </span>
                )}
              </h2>

              {leaderboard.length === 0 ? (
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '32px 24px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}>
                  No data yet this season.
                </div>
              ) : (
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            width: '52px',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                          }}>#</th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                          }}>Channel</th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--gold)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                          }}>Earnings</th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                          }}>Sessions</th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--success)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                          }}>Served</th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--danger)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                          }}>Lost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((row, idx) => (
                          <tr
                            key={row.channel_name}
                            style={{
                              borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                          >
                            <td style={{
                              padding: '14px 16px',
                              fontFamily: "'Space Mono', monospace",
                              fontSize: '13px',
                              fontWeight: idx < 3 ? 700 : 400,
                              textAlign: 'left',
                            }}>
                              {rankDisplay(idx)}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <Link
                                to={`/player/${encodeURIComponent(row.channel_name.toLowerCase())}`}
                                style={{
                                  fontFamily: "'Fredoka', sans-serif",
                                  fontSize: '16px',
                                  fontWeight: 600,
                                  color: 'var(--text)',
                                  textDecoration: 'none',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}
                              >
                                {row.channel_name}
                              </Link>
                            </td>
                            <td style={{
                              padding: '14px 16px',
                              textAlign: 'right',
                              color: 'var(--gold)',
                              fontFamily: "'Space Mono', monospace",
                              fontWeight: 700,
                              fontSize: '13px',
                            }}>
                              {formatMoney(row.total_money)}
                            </td>
                            <td style={{
                              padding: '14px 16px',
                              textAlign: 'right',
                              color: 'var(--text-muted)',
                              fontFamily: "'Space Mono', monospace",
                              fontSize: '13px',
                            }}>
                              {row.sessions}
                            </td>
                            <td style={{
                              padding: '14px 16px',
                              textAlign: 'right',
                              color: 'var(--success)',
                              fontFamily: "'Space Mono', monospace",
                              fontSize: '13px',
                            }}>
                              {row.total_served}
                            </td>
                            <td style={{
                              padding: '14px 16px',
                              textAlign: 'right',
                              color: 'var(--danger)',
                              fontFamily: "'Space Mono', monospace",
                              fontSize: '13px',
                            }}>
                              {row.total_lost}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* Past seasons */}
            <section>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setPastExpanded(prev => !prev)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: "'Fredoka', sans-serif",
                    fontSize: '16px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    letterSpacing: '0.5px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace" }}>
                    {pastExpanded ? '▾' : '▸'}
                  </span>
                  Past Seasons
                  <span style={{
                    color: 'var(--text-muted)',
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 400,
                    fontSize: '12px',
                  }}>
                    ({pastSeasons.length})
                  </span>
                </button>

                {pastExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {pastSeasons.length === 0 ? (
                      <p style={{
                        padding: '16px 20px',
                        color: 'var(--text-muted)',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: '13px',
                      }}>
                        No past seasons yet.
                      </p>
                    ) : (
                      pastSeasons.map(s => (
                        <div
                          key={s.id}
                          style={{
                            padding: '14px 20px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <span style={{
                            fontFamily: "'Fredoka', sans-serif",
                            fontSize: '15px',
                            fontWeight: 600,
                            color: 'var(--text)',
                          }}>
                            Season {s.number}
                          </span>
                          <span style={{
                            color: 'var(--gold)',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '13px',
                            fontWeight: 700,
                          }}>
                            {formatMoney(s.total_money_earned)}
                          </span>
                          <span style={{
                            color: 'var(--text-muted)',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '12px',
                          }}>
                            {formatDate(s.started_at)}
                            {s.ended_at ? ` – ${formatDate(s.ended_at)}` : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
