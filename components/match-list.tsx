import { useState, useEffect } from 'react'
import { X, MapPin, Calendar, TrendingUp, AlertCircle, CheckCircle2, Eye, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  type PotentialMatch,
  formatDistance,
  formatTimeDifference,
  getConfidenceColor,
  getConfidenceLabel,
} from '@/lib/matching-enhanced'

interface MatchListProps {
  pinId: string
  onClose?: () => void
  onMatchSelect?: (match: PotentialMatch) => void
}

export function MatchList({ pinId, onClose, onMatchSelect }: MatchListProps) {
  const [matches, setMatches] = useState<PotentialMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMatches()
  }, [pinId])

  async function fetchMatches() {
    try {
      setLoading(true)
      const response = await fetch(`/api/matches?pinId=${pinId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch matches')
      }

      const data = await response.json()
      setMatches(data.matches || [])
    } catch (err) {
      console.error('[MatchList] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load matches')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAsViewed(matchId: string) {
    try {
      await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, status: 'viewed' })
      })

      // Update local state
      setMatches(prev =>
        prev.map(m => (m.id === matchId ? { ...m, status: 'viewed' as const } : m))
      )
    } catch (err) {
      console.error('[MatchList] Mark as viewed error:', err)
    }
  }

  async function handleReject(matchId: string) {
    try {
      await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, status: 'rejected' })
      })

      // Remove from list
      setMatches(prev => prev.filter(m => m.id !== matchId))
    } catch (err) {
      console.error('[MatchList] Reject error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-center">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchMatches} className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <TrendingUp className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No matches found yet
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
          We'll automatically search for matching items and notify you when we find potential matches.
        </p>
      </div>
    )
  }

  // Group by confidence
  const highMatches = matches.filter(m => m.confidence === 'high' && m.status !== 'rejected')
  const mediumMatches = matches.filter(m => m.confidence === 'medium' && m.status !== 'rejected')
  const lowMatches = matches.filter(m => m.confidence === 'low' && m.status !== 'rejected')

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Potential Matches
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'} found
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* High confidence matches */}
      {highMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <h4 className="text-sm font-semibold text-green-800 dark:text-green-400">
              High Confidence Matches
            </h4>
          </div>
          <div className="space-y-2">
            {highMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onView={() => {
                  handleMarkAsViewed(match.id)
                  onMatchSelect?.(match)
                }}
                onReject={() => handleReject(match.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Medium confidence matches */}
      {mediumMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-yellow-600" />
            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">
              Possible Matches
            </h4>
          </div>
          <div className="space-y-2">
            {mediumMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onView={() => {
                  handleMarkAsViewed(match.id)
                  onMatchSelect?.(match)
                }}
                onReject={() => handleReject(match.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Low confidence matches - collapsed by default */}
      {lowMatches.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-600 dark:text-gray-400">
            <AlertCircle className="h-4 w-4" />
            Low Confidence Matches ({lowMatches.length})
          </summary>
          <div className="space-y-2 mt-2">
            {lowMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onView={() => {
                  handleMarkAsViewed(match.id)
                  onMatchSelect?.(match)
                }}
                onReject={() => handleReject(match.id)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

interface MatchCardProps {
  match: PotentialMatch
  onView: () => void
  onReject: () => void
}

function MatchCard({ match, onView, onReject }: MatchCardProps) {
  const confidenceColors = getConfidenceColor(match.confidence)
  const confidenceLabel = getConfidenceLabel(match.confidence)

  // Determine which item to show (the "other" item)
  const otherItem = match.lost_item || match.found_item

  if (!otherItem) return null

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        match.status === 'pending' ? 'border-l-4' : ''
      } ${match.status === 'pending' ? confidenceColors.border : ''}`}
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Image */}
          {otherItem.image_url && (
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
              <img
                src={otherItem.image_url}
                alt={otherItem.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title and Badge */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                {otherItem.title}
              </h4>
              <Badge
                variant="secondary"
                className={`${confidenceColors.bg} ${confidenceColors.text} text-xs shrink-0`}
              >
                {match.overall_score}%
              </Badge>
            </div>

            {/* Description */}
            {otherItem.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {otherItem.description}
              </p>
            )}

            {/* Match details */}
            <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {formatDistance(match.distance_km)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatTimeDifference(match.time_diff_hours)}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {confidenceLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onView()
            }}
            className="flex-1"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            View Details
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onReject()
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
