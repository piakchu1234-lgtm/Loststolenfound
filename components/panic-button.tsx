'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Phone, AlertOctagon, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PanicButtonProps {
  userId?: string
  userLocation?: { lat: number; lng: number }
}

export function PanicButton({ userId, userLocation }: PanicButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAlarmActive, setIsAlarmActive] = useState(false)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)

  useEffect(() => {
    // Initialize AudioContext on user interaction
    if (typeof window !== 'undefined' && isAlarmActive) {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()
      setAudioContext(context)
    }

    return () => {
      if (audioContext) {
        audioContext.close()
      }
    }
  }, [isAlarmActive])

  const handleCallPolice = () => {
    // Log emergency event
    logEmergencyEvent('police_call')

    // Call Australian emergency services
    window.location.href = 'tel:000'
  }

  const handleActivateAlarm = () => {
    // Log emergency event
    logEmergencyEvent('alarm_activated')

    // Activate alarm
    setIsAlarmActive(true)
    playAlarmSound()
    flashScreen()

    // Send notifications to nearby users
    notifyNearbyUsers()

    // Auto-stop alarm after 2 minutes
    setTimeout(() => {
      setIsAlarmActive(false)
    }, 120000)
  }

  const handleStopAlarm = () => {
    setIsAlarmActive(false)
    if (audioContext) {
      audioContext.close()
      setAudioContext(null)
    }
  }

  const logEmergencyEvent = async (type: string) => {
    try {
      await supabase.from('emergency_events').insert({
        user_id: userId,
        event_type: type,
        location: userLocation ? `POINT(${userLocation.lng} ${userLocation.lat})` : null,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to log emergency event:', error)
    }
  }

  const playAlarmSound = () => {
    if (!audioContext) return

    // Create a loud alarm sound
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 1000 // Hz
    oscillator.type = 'square'
    gainNode.gain.value = 0.3

    oscillator.start()

    // Oscillate between two frequencies for alarm effect
    let isHigh = true
    const interval = setInterval(() => {
      if (!audioContext) {
        clearInterval(interval)
        return
      }
      oscillator.frequency.value = isHigh ? 1000 : 800
      isHigh = !isHigh
    }, 500)

    // Store interval to clear later
    setTimeout(() => clearInterval(interval), 120000)
  }

  const flashScreen = () => {
    document.body.classList.add('emergency-flash')
    setTimeout(() => {
      document.body.classList.remove('emergency-flash')
    }, 120000)
  }

  const notifyNearbyUsers = async () => {
    // TODO: Implement push notifications to nearby users
    // This would use OneSignal to send emergency alerts
    console.log('Notifying nearby users of emergency')
  }

  return (
    <>
      {/* Floating Panic Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-6 z-50 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 animate-pulse"
        aria-label="Emergency Button"
        title="Emergency: Report suspicious activity"
      >
        <AlertOctagon className="h-8 w-8" />
      </button>

      {/* Emergency Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md border-red-500 border-2">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl text-red-600 dark:text-red-400">
                    Emergency Alert
                  </DialogTitle>
                  <DialogDescription>
                    Report suspicious activity
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              If you see suspicious activity, choose an action below:
            </p>

            {/* Call Police Button */}
            <Button
              onClick={handleCallPolice}
              className="w-full h-16 text-lg bg-blue-600 hover:bg-blue-700 text-white gap-3"
              size="lg"
            >
              <Phone className="h-6 w-6" />
              Call Police (000)
            </Button>

            {/* Activate Alarm Button */}
            <Button
              onClick={handleActivateAlarm}
              disabled={isAlarmActive}
              className="w-full h-16 text-lg bg-red-600 hover:bg-red-700 text-white gap-3"
              size="lg"
            >
              <AlertOctagon className="h-6 w-6" />
              {isAlarmActive ? 'Alarm Active' : 'Activate Alarm'}
            </Button>

            {isAlarmActive && (
              <Button
                onClick={handleStopAlarm}
                variant="outline"
                className="w-full gap-2"
              >
                <X className="h-4 w-4" />
                Stop Alarm
              </Button>
            )}

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> The alarm will alert nearby users and play a loud sound.
                Use responsibly and only in genuine emergencies.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alarm Active Overlay */}
      {isAlarmActive && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
        </div>
      )}

      {/* CSS for emergency flash */}
      <style jsx global>{`
        @keyframes emergency-flash {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(239, 68, 68, 0.1); }
        }
        .emergency-flash {
          animation: emergency-flash 1s infinite;
        }
      `}</style>
    </>
  )
}
