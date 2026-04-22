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
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px 24px',
        minWidth: '140px',
        flex: '1 1 140px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <span style={{ fontSize: '22px' }}>{icon}</span>
      <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--gold)' }}>{value}</span>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
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

  const toggleButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    background: active ? 'var(--gold-dim)' : 'var(--bg-card)',
    color: active ? '#1a1a2e' : 'var(--text)',
    fontWeight: active ? 700 : 400,
    fontSize: '14px',
    cursor: 'pointer',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header searchInitialValue={username} />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            fontSize: '14px',
            marginBottom: '24px',
          }}
        >
          ← Back to Leaderboard
        </Link>

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

        {playerNotFound && (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>Player not found</p>
            <p style={{ fontSize: '14px' }}>
              No contributions found for <strong style={{ color: 'var(--text)' }}>{username}</strong>.
            </p>
          </div>
        )}

        {!loading && !error && !playerNotFound && (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '22px', color: 'var(--gold)' }}>
                {username}
              </h1>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={toggleButtonStyle(view === 'season')}
                  onClick={() => setView('season')}
                >
                  This Season
                </button>
                <button
                  style={toggleButtonStyle(view === 'alltime')}
                  onClick={() => setView('alltime')}
                >
                  All Time
                </button>
              </div>
            </div>

            {activeStats === null ? (
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                {view === 'season'
                  ? activeSeason
                    ? `No data for Season ${activeSeason.number} yet.`
                    : 'No active season.'
                  : 'No data found.'}
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                  <StatCard icon="🍳" label="Cooked" value={activeStats.cooked} />
                  <StatCard icon="🍽️" label="Served" value={activeStats.served} />
                  <StatCard icon="💰" label="Earned" value={formatMoney(activeStats.money_earned)} />
                  <StatCard icon="🚒" label="Extinguished" value={activeStats.extinguished} />
                  <StatCard icon="🔥" label="Fires Caused" value={activeStats.fires_caused} />
                </div>

                {activeStats.channels.length > 0 && (
                  <div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Channels played in ({view === 'season' ? 'this season' : 'all time'})
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--text)' }}>
                      {activeStats.channels.join(', ')}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
