import { useState } from 'react'
import { Camera, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { createClaim } from '@/lib/claims'

interface ClaimDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pinId: string
  pinTitle: string
  onSuccess?: () => void
}

export function ClaimDialog({
  open,
  onOpenChange,
  pinId,
  pinTitle,
  onSuccess,
}: ClaimDialogProps) {
  const [evidence, setEvidence] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Limit to 3 photos
    const newPhotos = [...photos, ...files].slice(0, 3)
    setPhotos(newPhotos)

    // Create previews
    newPhotos.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreviews((prev) => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (evidence.trim().length < 50) {
      setError('Please provide at least 50 characters describing why this is your item')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      // TODO: Upload photos to storage
      // For now, we'll just pass empty array
      const photoUrls: string[] = []

      const result = await createClaim({
        pinId,
        evidence: evidence.trim(),
        photos: photoUrls,
      })

      if (!result.success) {
        setError(result.error || 'Failed to submit claim')
        setSubmitting(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onOpenChange(false)
        resetForm()
      }, 2000)
    } catch (err) {
      console.error('[ClaimDialog] Error:', err)
      setError('An unexpected error occurred')
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setEvidence('')
    setPhotos([])
    setPhotoPreviews([])
    setError(null)
    setSuccess(false)
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetForm()
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Claim Submitted!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The owner will review your evidence and respond soon.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Claim This Item</DialogTitle>
              <DialogDescription>
                Claiming: <span className="font-semibold">{pinTitle}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Evidence textarea */}
              <div className="space-y-2">
                <Label htmlFor="evidence">
                  Describe why this is your item <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="evidence"
                  placeholder="Include specific details like unique features, where and when you lost it, what was inside, etc. (minimum 50 characters)"
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  {evidence.length}/50 characters minimum
                </p>
              </div>

              {/* Photo upload */}
              <div className="space-y-2">
                <Label htmlFor="photos">
                  Proof of ownership (optional, up to 3 photos)
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Photos showing receipts, serial numbers, or you with the item
                </p>

                {photoPreviews.length < 3 && (
                  <div className="flex items-center gap-2">
                    <Input
                      id="photos"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="cursor-pointer"
                    />
                    <Camera className="h-5 w-5 text-gray-400" />
                  </div>
                )}

                {/* Photo previews */}
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Proof ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="sr-only">Remove photo</span>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Important notice */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  💡 Tips for a successful claim:
                </p>
                <ul className="text-blue-800 dark:text-blue-300 space-y-1 text-xs">
                  <li>• Be as specific as possible about unique features</li>
                  <li>• Mention the exact date and location</li>
                  <li>• Include any distinguishing marks or contents</li>
                  <li>• Photos of receipts or previous photos with the item help</li>
                </ul>
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || evidence.trim().length < 50}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Claim'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
