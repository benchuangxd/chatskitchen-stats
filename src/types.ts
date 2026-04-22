export interface Season {
  id: number
  number: number
  status: 'active' | 'ended'
  money_goal: number
  total_money_earned: number
  started_at: string
  ended_at: string | null
}

export interface LeaderboardRow {
  channel_name: string
  total_money: number
  sessions: number
  total_served: number
  total_lost: number
  _sessionIds: Set<string>
}
