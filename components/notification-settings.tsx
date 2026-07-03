'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { subscribeToNotifications, unsubscribeFromNotifications, isSubscribed } from '@/lib/onesignal'

export function NotificationSettings({ userId }: { userId: string }) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState({
    matches: true,
    claims: true,
    comments: true,
    updates: true,
  })

  useEffect(() => {
    checkSubscriptionStatus()
  }, [])

  async function checkSubscriptionStatus() {
    const subscribed = await isSubscribed()
    setIsEnabled(subscribed)
  }

  async function toggleNotifications() {
    setLoading(true)

    try {
      if (isEnabled) {
        await unsubscribeFromNotifications()
        setIsEnabled(false)
      } else {
        const success = await subscribeToNotifications(userId)
        if (success) {
          setIsEnabled(true)
        }
      }
    } catch (error) {
      console.error('Toggle notifications error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified about matches, claims, and updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 主开关 */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notifications-toggle" className="font-semibold">
              Enable Notifications
            </Label>
            <p className="text-sm text-gray-500">
              Receive real-time updates
            </p>
          </div>
          <Button
            variant={isEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={toggleNotifications}
            disabled={loading}
          >
            {isEnabled ? (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Enabled
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Disabled
              </>
            )}
          </Button>
        </div>

        {/* 通知类型偏好 */}
        {isEnabled && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-semibold">Notification Types</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="matches" className="cursor-pointer">
                New Matches
              </Label>
              <Switch
                id="matches"
                checked={preferences.matches}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, matches: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="claims" className="cursor-pointer">
                Claim Requests
              </Label>
              <Switch
                id="claims"
                checked={preferences.claims}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, claims: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="comments" className="cursor-pointer">
                New Comments
              </Label>
              <Switch
                id="comments"
                checked={preferences.comments}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, comments: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="updates" className="cursor-pointer">
                Status Updates
              </Label>
              <Switch
                id="updates"
                checked={preferences.updates}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, updates: checked })
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
