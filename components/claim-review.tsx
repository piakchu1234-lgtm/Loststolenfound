import { useState } from 'react'
import { Check, X, MessageCircle, Calendar, MapPin, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  type Claim,
  approveClaim,
  rejectClaim,
  completeClaim,
  getClaimStatusColor,
  getClaimStatusLabel,
} from '@/lib/claims'

interface ClaimReviewProps {
  claims: Claim[]
  pinTitle: string
  onUpdate?: () => void
}

export function ClaimReview({ claims, pinTitle, onUpdate }: ClaimReviewProps) {
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [response, setResponse] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pendingClaims = claims.filter((c) => c.status === 'pending')
  const approvedClaims = claims.filter((c) => c.status === 'approved')
  const otherClaims = claims.filter((c) => !['pending', 'approved'].includes(c.status))

  const handleApprove = async (claim: Claim) => {
    setSelectedClaim(claim)
    setAction('approve')
  }

  const handleReject = async (claim: Claim) => {
    setSelectedClaim(claim)
    setAction('reject')
  }

  const submitApproval = async () => {
    if (!selectedClaim) return

    setSubmitting(true)
    const result = await approveClaim({
      claimId: selectedClaim.id,
      response: response.trim() || undefined,
    })

    setSubmitting(false)

    if (result.success) {
      setSelectedClaim(null)
      setAction(null)
      setResponse('')
      onUpdate?.()
    } else {
      alert(result.error || 'Failed to approve claim')
    }
  }

  const submitRejection = async () => {
    if (!selectedClaim) return

    setSubmitting(true)
    const result = await rejectClaim({
      claimId: selectedClaim.id,
      reason: rejectionReason.trim() || undefined,
    })

    setSubmitting(false)

    if (result.success) {
      setSelectedClaim(null)
      setAction(null)
      setRejectionReason('')
      onUpdate?.()
    } else {
      alert(result.error || 'Failed to reject claim')
    }
  }

  const handleComplete = async (claimId: string) => {
    if (!confirm('Mark this claim as completed? This will close the report.')) {
      return
    }

    const result = await completeClaim(claimId)

    if (result.success) {
      onUpdate?.()
    } else {
      alert(result.error || 'Failed to complete claim')
    }
  }

  if (claims.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm">No claims yet for this item</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pending claims - require action */}
      {pendingClaims.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-white text-xs">
              {pendingClaims.length}
            </span>
            Pending Review
          </h3>
          <div className="space-y-3">
            {pendingClaims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onApprove={() => handleApprove(claim)}
                onReject={() => handleReject(claim)}
                showActions
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved claims */}
      {approvedClaims.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Approved Claims
          </h3>
          <div className="space-y-3">
            {approvedClaims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onComplete={() => handleComplete(claim.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other claims */}
      {otherClaims.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-gray-600 dark:text-gray-400">
            Other Claims ({otherClaims.length})
          </summary>
          <div className="space-y-3 mt-2">
            {otherClaims.map((claim) => (
              <ClaimCard key={claim.id} claim={claim} />
            ))}
          </div>
        </details>
      )}

      {/* Approval modal */}
      {selectedClaim && action === 'approve' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>Approve Claim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You're about to approve this claim. The claimer will be notified and you can coordinate the exchange.
              </p>

              <div className="space-y-2">
                <Label htmlFor="response">Message to claimer (optional)</Label>
                <Textarea
                  id="response"
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="e.g., 'Great! Let's meet at Central Park tomorrow at 2pm'"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedClaim(null)
                    setAction(null)
                    setResponse('')
                  }}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitApproval}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approve Claim
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rejection modal */}
      {selectedClaim && action === 'reject' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>Reject Claim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You're about to reject this claim. Please provide a reason so the claimer understands.
              </p>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for rejection (optional but recommended)</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., 'The details don't match my item'"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedClaim(null)
                    setAction(null)
                    setRejectionReason('')
                  }}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={submitRejection}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Reject Claim
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

interface ClaimCardProps {
  claim: Claim
  onApprove?: () => void
  onReject?: () => void
  onComplete?: () => void
  showActions?: boolean
}

function ClaimCard({ claim, onApprove, onReject, onComplete, showActions }: ClaimCardProps) {
  const statusColors = getClaimStatusColor(claim.status)
  const statusLabel = getClaimStatusLabel(claim.status)

  const claimerName = claim.claimer?.display_name || claim.claimer?.email || 'Anonymous'

  return (
    <Card className={`${claim.status === 'pending' ? 'border-l-4 border-l-yellow-500' : ''}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold">{claimerName}</span>
          </div>
          <Badge className={`${statusColors.bg} ${statusColors.text} text-xs`}>
            {statusLabel}
          </Badge>
        </div>

        {/* Evidence */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Their evidence:</p>
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {claim.claimer_evidence}
          </p>
        </div>

        {/* Photos */}
        {claim.claimer_photos && claim.claimer_photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {claim.claimer_photos.map((photo, index) => (
              <img
                key={index}
                src={photo}
                alt={`Proof ${index + 1}`}
                className="w-full h-20 object-cover rounded"
              />
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(claim.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Owner response/reason */}
        {claim.owner_response && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2 text-sm">
            <p className="font-semibold text-blue-900 dark:text-blue-300 text-xs">Your response:</p>
            <p className="text-blue-800 dark:text-blue-300 text-xs mt-1">{claim.owner_response}</p>
          </div>
        )}

        {claim.rejection_reason && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2 text-sm">
            <p className="font-semibold text-red-900 dark:text-red-300 text-xs">Rejection reason:</p>
            <p className="text-red-800 dark:text-red-300 text-xs mt-1">{claim.rejection_reason}</p>
          </div>
        )}

        {/* Actions */}
        {showActions && claim.status === 'pending' && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="flex-1"
            >
              <X className="h-3 w-3 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              className="flex-1"
            >
              <Check className="h-3 w-3 mr-1" />
              Approve
            </Button>
          </div>
        )}

        {claim.status === 'approved' && onComplete && (
          <Button
            size="sm"
            onClick={onComplete}
            className="w-full"
          >
            Mark as Completed
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
