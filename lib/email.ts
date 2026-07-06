import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@loststolenfound.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping email');
      return { success: false, error: 'Email not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error('[Email] Send error:', error);
      return { success: false, error: String(error) };
    }

    return { success: true };
  } catch (error) {
    console.error('[Email] Exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Email: New reply on your thread
 */
export async function emailThreadReply(
  userEmail: string,
  userName: string,
  threadTitle: string,
  threadSlug: string,
  replyAuthor: string,
  replyPreview: string
) {
  const subject = `💬 New reply on "${threadTitle}"`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Reply</h1>
      </div>

      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>

        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>${replyAuthor}</strong> replied to your thread:
        </p>

        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #1f2937;">${threadTitle}</h2>
          <p style="color: #6b7280; margin: 0; font-size: 14px;">${replyPreview}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/forum/${threadSlug}"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Reply
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
          You received this email because you created a forum thread on LostStolenFound.
          <br>
          <a href="${APP_URL}/settings/notifications" style="color: #667eea;">Manage notification preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${userName},

${replyAuthor} replied to your thread: "${threadTitle}"

${replyPreview}

View the reply: ${APP_URL}/forum/${threadSlug}

---
You received this email because you created a forum thread on LostStolenFound.
Manage notification preferences: ${APP_URL}/settings/notifications
  `;

  return sendEmail({ to: userEmail, subject, html, text });
}

/**
 * Email: Your reply was marked as solution
 */
export async function emailSolutionMarked(
  userEmail: string,
  userName: string,
  threadTitle: string,
  threadSlug: string
) {
  const subject = `✅ Your reply was marked as solution!`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Solution Marked!</h1>
      </div>

      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>

        <p style="font-size: 16px; margin-bottom: 20px;">
          Great news! Your reply was marked as the solution for:
        </p>

        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px; color: #1f2937;">${threadTitle}</h2>
        </div>

        <p style="font-size: 16px; margin-bottom: 20px;">
          You've earned <strong style="color: #10b981;">+25 bonus points</strong> for helping the community! 🎉
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/forum/${threadSlug}"
             style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Thread
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
          You received this email because you contributed to the LostStolenFound community.
          <br>
          <a href="${APP_URL}/settings/notifications" style="color: #10b981;">Manage notification preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${userName},

Great news! Your reply was marked as the solution for: "${threadTitle}"

You've earned +25 bonus points for helping the community! 🎉

View the thread: ${APP_URL}/forum/${threadSlug}

---
You received this email because you contributed to the LostStolenFound community.
Manage notification preferences: ${APP_URL}/settings/notifications
  `;

  return sendEmail({ to: userEmail, subject, html, text });
}

/**
 * Email: Badge earned
 */
export async function emailBadgeEarned(
  userEmail: string,
  userName: string,
  badgeName: string,
  badgeDescription: string,
  badgeIcon: string
) {
  const subject = `🏅 New badge earned: ${badgeName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🏅 Badge Earned!</h1>
      </div>

      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>

        <p style="font-size: 16px; margin-bottom: 30px;">
          Congratulations! You've earned a new badge:
        </p>

        <div style="background: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
          <div style="font-size: 60px; margin-bottom: 15px;">${badgeIcon}</div>
          <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #1f2937;">${badgeName}</h2>
          <p style="color: #6b7280; margin: 0; font-size: 14px;">${badgeDescription}</p>
        </div>

        <p style="font-size: 16px; margin-bottom: 20px; text-align: center;">
          Keep up the great work in the community! 🎉
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/profile"
             style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Your Profile
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
          You received this email because you're an active member of LostStolenFound.
          <br>
          <a href="${APP_URL}/settings/notifications" style="color: #f59e0b;">Manage notification preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${userName},

Congratulations! You've earned a new badge:

${badgeIcon} ${badgeName}
${badgeDescription}

Keep up the great work in the community! 🎉

View your profile: ${APP_URL}/profile

---
You received this email because you're an active member of LostStolenFound.
Manage notification preferences: ${APP_URL}/settings/notifications
  `;

  return sendEmail({ to: userEmail, subject, html, text });
}

/**
 * Email: Milestone reached
 */
export async function emailMilestone(
  userEmail: string,
  userName: string,
  points: number
) {
  const subject = `🎉 Milestone reached: ${points} points!`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Milestone Reached!</h1>
      </div>

      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>

        <p style="font-size: 16px; margin-bottom: 30px;">
          Amazing achievement! You've reached a major milestone:
        </p>

        <div style="background: white; padding: 40px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
          <div style="font-size: 60px; margin-bottom: 15px;">🏆</div>
          <h2 style="margin: 0; font-size: 36px; color: #ec4899; font-weight: bold;">${points.toLocaleString()}</h2>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 18px;">Points Earned</p>
        </div>

        <p style="font-size: 16px; margin-bottom: 20px; text-align: center;">
          Your contributions are making a real difference in the community! 💪
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/profile"
             style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Your Stats
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
          You received this email because you're crushing it on LostStolenFound.
          <br>
          <a href="${APP_URL}/settings/notifications" style="color: #ec4899;">Manage notification preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${userName},

Amazing achievement! You've reached a major milestone:

🏆 ${points.toLocaleString()} Points Earned

Your contributions are making a real difference in the community! 💪

View your stats: ${APP_URL}/profile

---
You received this email because you're crushing it on LostStolenFound.
Manage notification preferences: ${APP_URL}/settings/notifications
  `;

  return sendEmail({ to: userEmail, subject, html, text });
}

/**
 * Email: Daily digest
 */
export async function emailDailyDigest(
  userEmail: string,
  userName: string,
  stats: {
    newPins: number;
    newThreads: number;
    newReplies: number;
    pointsEarned: number;
  }
) {
  const subject = `📊 Your daily digest - ${new Date().toLocaleDateString()}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📊 Daily Digest</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>

        <p style="font-size: 16px; margin-bottom: 30px;">
          Here's what happened today on LostStolenFound:
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${stats.newPins}</div>
            <div style="font-size: 12px; color: #6b7280;">New Pins</div>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #8b5cf6;">${stats.newThreads}</div>
            <div style="font-size: 12px; color: #6b7280;">New Threads</div>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #10b981;">${stats.newReplies}</div>
            <div style="font-size: 12px; color: #6b7280;">New Replies</div>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">+${stats.pointsEarned}</div>
            <div style="font-size: 12px; color: #6b7280;">Points Earned</div>
          </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}"
             style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Visit Platform
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
          You received this daily digest because you're subscribed to LostStolenFound updates.
          <br>
          <a href="${APP_URL}/settings/notifications" style="color: #3b82f6;">Manage notification preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${userName},

Here's what happened today on LostStolenFound:

📍 ${stats.newPins} New Pins
💬 ${stats.newThreads} New Threads
💭 ${stats.newReplies} New Replies
⭐ +${stats.pointsEarned} Points Earned

Visit the platform: ${APP_URL}

---
You received this daily digest because you're subscribed to LostStolenFound updates.
Manage notification preferences: ${APP_URL}/settings/notifications
  `;

  return sendEmail({ to: userEmail, subject, html, text });
}
