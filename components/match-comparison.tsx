import { ArrowLeft, MapPin, Calendar, User, CheckCircle2, AlertCircle, MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  type PotentialMatch,
  formatDistance,
  formatTimeDifference,
  getConfidenceColor,
  getConfidenceLabel,
} from '@/lib/matching-enhanced'

interface MatchComparisonProps {
  match: PotentialMatch
  currentPinId: string
  onBack?: () => void
  onContact?: () => void
  onReject?: () => void
}

export function MatchComparison({
  match,
  currentPinId,
  onBack,
  onContact,
  onReject,
}: MatchComparisonProps) {
  const confidenceColors = getConfidenceColor(match.confidence)
  const confidenceLabel = getConfidenceLabel(match.confidence)

  // Determine which item is "yours" and which is "theirs"
  const isLostItem = match.lost_item?.id === currentPinId
  const yourItem = isLostItem ? match.lost_item : match.found_item
  const theirItem = isLostItem ? match.found_item : match.lost_item

  if (!yourItem || !theirItem) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Unable to load match details</p>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Match Comparison
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Compare details to verify this match
            </p>
          </div>
        </div>

        {/* Match score banner */}
        <div
          className={`rounded-lg p-4 ${confidenceColors.bg} ${confidenceColors.text} border ${confidenceColors.border}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {match.confidence === 'high' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <div>
                <p className="font-semibold">{confidenceLabel}</p>
                <p className="text-xs opacity-80">
                  {match.overall_score}% similarity score
                </p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p>{formatDistance(match.distance_km)}</p>
              <p className="opacity-80">{formatTimeDifference(match.time_diff_hours)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Your Item */}
          <ItemCard item={yourItem} title="Your Report" isYours />

          {/* Their Item */}
          <ItemCard item={theirItem} title="Potential Match" />
        </div>

        {/* Match breakdown */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3 text-gray-900 dark:text-gray-100">
              Match Analysis
            </h3>

            <div className="space-y-3">
              {/* Keyword match */}
              <MatchScore
                label="Description Similarity"
                score={match.keyword_score}
                explanation="How similar the titles and descriptions are"
              />

              {/* Location match */}
              <MatchScore
                label="Location Proximity"
                score={match.location_score}
                explanation={`Items reported ${formatDistance(match.distance_km)}`}
              />

              {/* Time match */}
              <MatchScore
                label="Time Proximity"
                score={match.time_score}
                explanation={`Reports made ${formatTimeDifference(match.time_diff_hours)}`}
              />

              {/* Category match */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Category Match
                  </span>
                </div>
                <Badge variant={match.category_match ? 'default' : 'secondary'}>
                  {match.category_match ? '✓ Matched' : '✗ Not Matched'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
          <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-300 mb-2">
            💡 Verification Tips
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Compare photos carefully</li>
            <li>• Check for unique identifying features</li>
            <li>• Verify the location and time make sense</li>
            <li>• Ask for additional verification if needed</li>
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <Button
          className="w-full"
          size="lg"
          onClick={onContact}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Contact About This Match
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={onReject}
        >
          <X className="h-4 w-4 mr-2" />
          This Is Not My Item
        </Button>
      </div>
    </div>
  )
}

interface ItemCardProps {
  item: {
    id: string
    title: string
    description: string | null
    image_url: string | null
    category: string
    latitude: number
    longitude: number
    created_at: string
  }
  title: string
  isYours?: boolean
}

function ItemCard({ item, title, isYours }: ItemCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card className={isYours ? 'border-2 border-primary' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
            {title}
          </h3>
          {isYours && (
            <Badge variant="default" className="text-xs">
              You
            </Badge>
          )}
        </div>

        {/* Image */}
        {item.image_url ? (
          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-48 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <p className="text-sm text-gray-500">No photo provided</p>
          </div>
        )}

        {/* Title */}
        <h4 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-2">
          {item.title}
        </h4>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-4">
          {item.description || 'No description provided'}
        </p>

        {/* Meta info */}
        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>Reported {formatDate(item.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span>
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MatchScoreProps {
  label: string
  score: number
  explanation: string
}

function MatchScore({ label, score, explanation }: MatchScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-500'
    if (score >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {score}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${getScoreColor(score)} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{explanation}</p>
    </div>
  )
}
