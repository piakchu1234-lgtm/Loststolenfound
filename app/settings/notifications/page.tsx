"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Bell, Save, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface EmailPreferences {
  email_on_thread_reply: boolean;
  email_on_solution_marked: boolean;
  email_on_badge_earned: boolean;
  email_on_milestone: boolean;
  email_on_claim_update: boolean;
  email_on_match_found: boolean;
  daily_digest_enabled: boolean;
  weekly_digest_enabled: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<EmailPreferences>({
    email_on_thread_reply: true,
    email_on_solution_marked: true,
    email_on_badge_earned: true,
    email_on_milestone: true,
    email_on_claim_update: true,
    email_on_match_found: true,
    daily_digest_enabled: false,
    weekly_digest_enabled: true,
  });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    setUser(user);
    await loadPreferences(user.id);
  }

  async function loadPreferences(userId: string) {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = not found, which is okay
        console.error("Error loading preferences:", error);
      }

      if (data) {
        setPreferences({
          email_on_thread_reply: data.email_on_thread_reply,
          email_on_solution_marked: data.email_on_solution_marked,
          email_on_badge_earned: data.email_on_badge_earned,
          email_on_milestone: data.email_on_milestone,
          email_on_claim_update: data.email_on_claim_update,
          email_on_match_found: data.email_on_match_found,
          daily_digest_enabled: data.daily_digest_enabled,
          weekly_digest_enabled: data.weekly_digest_enabled,
        });
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (!user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("email_preferences")
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Show success message (you can add a toast here)
      alert("Preferences saved successfully!");
    } catch (err) {
      console.error("Error saving preferences:", err);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function updatePreference(key: keyof EmailPreferences, value: boolean) {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>

            <Button onClick={savePreferences} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Notification Settings
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your email notification preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Instant Notifications */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Instant Notifications
              </h2>
            </div>

            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              Get notified immediately when important events happen
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Thread Replies
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    When someone replies to your forum thread
                  </p>
                </div>
                <Switch
                  checked={preferences.email_on_thread_reply}
                  onCheckedChange={(checked) =>
                    updatePreference("email_on_thread_reply", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Solution Marked
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    When your reply is marked as a solution (+25 pts)
                  </p>
                </div>
                <Switch
                  checked={preferences.email_on_solution_marked}
                  onCheckedChange={(checked) =>
                    updatePreference("email_on_solution_marked", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Badge Earned
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    When you earn a new badge
                  </p>
                </div>
                <Switch
                  checked={preferences.email_on_badge_earned}
                  onCheckedChange={(checked) =>
                    updatePreference("email_on_badge_earned", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Milestones
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    When you reach point milestones (100, 500, 1000+)
                  </p>
                </div>
                <Switch
                  checked={preferences.email_on_milestone}
                  onCheckedChange={(checked) =>
                    updatePreference("email_on_milestone", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Claim Updates
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    When someone claims your item or your claim is updated
                  </p>
                </div>
                <Switch
                  checked={preferences.email_on_claim_update}
                  onCheckedChange={(checked) =>
                    updatePreference("email_on_claim_update", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Match Found
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    When we find a potential match for your lost item
                  </p>
                </div>
                <Switch
                  checked={preferences.email_on_match_found}
                  onCheckedChange={(checked) =>
                    updatePreference("email_on_match_found", checked)
                  }
                />
              </div>
            </div>
          </div>

          {/* Digest Emails */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Digest Emails
              </h2>
            </div>

            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              Periodic summaries of platform activity
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Daily Digest
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Daily summary of new pins, threads, and your points
                  </p>
                </div>
                <Switch
                  checked={preferences.daily_digest_enabled}
                  onCheckedChange={(checked) =>
                    updatePreference("daily_digest_enabled", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Weekly Digest
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Weekly summary with highlights and achievements
                  </p>
                </div>
                <Switch
                  checked={preferences.weekly_digest_enabled}
                  onCheckedChange={(checked) =>
                    updatePreference("weekly_digest_enabled", checked)
                  }
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> Email notifications require a valid email address
              and proper email configuration. Some notifications may be sent with a
              slight delay for optimal delivery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
