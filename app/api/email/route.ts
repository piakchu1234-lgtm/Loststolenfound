import { NextRequest, NextResponse } from 'next/server';
import {
  emailThreadReply,
  emailSolutionMarked,
  emailBadgeEarned,
  emailMilestone,
  emailDailyDigest,
} from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    let result;

    switch (type) {
      case 'thread_reply':
        result = await emailThreadReply(
          data.userEmail,
          data.userName,
          data.threadTitle,
          data.threadSlug,
          data.replyAuthor,
          data.replyPreview
        );
        break;

      case 'solution_marked':
        result = await emailSolutionMarked(
          data.userEmail,
          data.userName,
          data.threadTitle,
          data.threadSlug
        );
        break;

      case 'badge_earned':
        result = await emailBadgeEarned(
          data.userEmail,
          data.userName,
          data.badgeName,
          data.badgeDescription,
          data.badgeIcon
        );
        break;

      case 'milestone':
        result = await emailMilestone(
          data.userEmail,
          data.userName,
          data.points
        );
        break;

      case 'daily_digest':
        result = await emailDailyDigest(
          data.userEmail,
          data.userName,
          data.stats
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
