import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'
import type { Season } from '../types'

interface AggregatedStats {
  cooked: number
  served: number
  money_earned: number
  extinguished: number
  fires_caused: number
  channels: string[]
}

function formatMoney(amount: number): string {
  return '$' + amount.toLocaleString('en-US')
}

function emptyStats(): AggregatedStats {
  return { cooked: 0, served: 0, money_earned: 0, extinguished: 0, fires_caused: 0, channels: [] }
}

interface StatCardProps {
  icon: string
  label: string
  value: string | number
  valueColor?: string
}

function StatCard({ icon, label, value, valueColor }: StatCardProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      flex: '1 1 140px',
      minWidth: '130px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <span style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</span>
      <span style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: '10px',
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '28px',
        fontWeight: 700,
        color: valueColor ?? 'var(--text)',
        lineHeight: 1.1,
      }}>
        {value}
      </span>
    </div>
  )
}

export default function PlayerPage() {
  const { username } = useParams<{ username: string }>()
  const normalizedUsername = username?.toLowerCase() ?? ''

  const [activeSeason, setActiveSeason] = useState<Season | null>(null)
  const [thisSeasonStats, setThisSeasonStats] = useState<AggregatedStats | null>(null)
  const [allTimeStats, setAllTimeStats] = useState<AggregatedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'season' | 'alltime'>('season')

  useEffect(() => {
    if (!normalizedUsername) return

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Get active season
        const { data: season, error: seasonErr } = await supabase
          .from('seasons')
          .select('*')
          .eq('status', 'active')
          .maybeSingle()

        if (seasonErr) throw seasonErr

        setActiveSeason(season ?? null)

        // Fetch all player contributions in one query; partition in JS
        const { data: allRows, error: allErr } = await supabase
          .from('player_contributions')
          .select('cooked, served, money_earned, extinguished, fires_caused, channel_name, season_id')
          .eq('twitch_username', normalizedUsername)
          .limit(10000)

        if (allErr) throw allErr

        const thisSeasonRows = allRows?.filter(r => r.season_id === season?.id) ?? []
        const allTimeRows = allRows ?? []

        function aggregate(rows: typeof allTimeRows): AggregatedStats | null {
          if (rows.length === 0) return null
          const agg = emptyStats()
          const channelSet = new Set<string>()
          for (const r of rows) {
            agg.cooked += r.cooked ?? 0
            agg.served += r.served ?? 0
            agg.money_earned += r.money_earned ?? 0
            agg.extinguished += r.extinguished ?? 0
            agg.fires_caused += r.fires_caused ?? 0
            if (r.channel_name) channelSet.add(r.channel_name)
          }
          agg.channels = Array.from(channelSet)
          return agg
        }

        setThisSeasonStats(season ? aggregate(thisSeasonRows) : null)
        setAllTimeStats(aggregate(allTimeRows))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load player data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [normalizedUsername])

  const activeStats = view === 'season' ? thisSeasonStats : allTimeStats
  const playerNotFound = !loading && !error && allTimeStats === null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header searchInitialValue={username} />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            fontFamily: "'Space Mono', monospace",
            fontSize: '13px',
            marginBottom: '24px',
            textDecoration: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← Leaderboard
        </Link>

        {loading && (
          <p style={{
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: '64px',
            fontFamily: "'Space Mono', monospace",
          }}>
            Loading...
          </p>
        )}

        {error && (
          <p style={{ color: 'var(--danger)', textAlign: 'center', marginTop: '64px' }}>
            {error}
          </p>
        )}

        {playerNotFound && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '64px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
            <p style={{
              fontFamily: "'Fredoka', sans-serif",
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: '8px',
            }}>
              Player not found
            </p>
            <p style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}>
              No contributions found for <strong style={{ color: 'var(--text-dim)' }}>{username}</strong>.
            </p>
          </div>
        )}

        {!loading && !error && !playerNotFound && (
          <>
            {/* Player header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '24px',
            }}>
              <h1 style={{
                fontFamily: "'Fredoka', sans-serif",
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: '-0.5px',
              }}>
                👤 {username}
              </h1>

              {/* Season toggle */}
              <div style={{ display: 'flex', gap: '0', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <button
                  onClick={() => setView('season')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: view === 'season' ? 'var(--orange)' : 'var(--surface)',
                    color: view === 'season' ? '#fff' : 'var(--text-muted)',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  This Season
                </button>
                <button
                  onClick={() => setView('alltime')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderLeft: '1px solid var(--border)',
                    background: view === 'alltime' ? 'var(--orange)' : 'var(--surface)',
                    color: view === 'alltime' ? '#fff' : 'var(--text-muted)',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  All Time
                </button>
              </div>
            </div>

            {activeStats === null ? (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px 24px',
                color: 'var(--text-muted)',
                fontFamily: "'Space Mono', monospace",
                fontSize: '13px',
              }}>
                {view === 'season'
                  ? activeSeason
                    ? `No data for Season ${activeSeason.number} yet.`
                    : 'No active season.'
                  : 'No data found.'}
              </div>
            ) : (
              <>
                {/* Stats grid */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '10px',
                }}>
                  <StatCard icon="🍳" label="Cooked" value={activeStats.cooked} />
                  <StatCard icon="🍽️" label="Served" value={activeStats.served} valueColor="var(--success)" />
                  <StatCard icon="💰" label="Earned" value={formatMoney(activeStats.money_earned)} valueColor="var(--gold)" />
                  <StatCard icon="🚒" label="Extinguished" value={activeStats.extinguished} valueColor="#5b8dd9" />
                  <StatCard icon="🔥" label="Fires Caused" value={activeStats.fires_caused} valueColor="var(--danger)" />
                </div>

                {/* Earnings tip */}
                <p style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginBottom: '24px',
                  paddingLeft: '2px',
                }}>
                  💡 Earnings only count dishes personally served with <code style={{ background: 'var(--surface)', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' }}>!serve</code>
                </p>

                {/* Channels list */}
                {activeStats.channels.length > 0 && (
                  <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 20px',
                  }}>
                    <p style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '8px',
                    }}>
                      Played in ({view === 'season' ? 'this season' : 'all time'})
                    </p>
                    <p style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                    }}>
                      {activeStats.channels.join(', ')}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
