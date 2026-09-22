import { NextRequest, NextResponse } from 'next/server';
import { getSinkingFunds, DEFAULT_USER_ID } from '@/lib/fintech-engine';
import { sendTelegramRenewalAlert } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleRenewalCheck(req);
}

export async function POST(req: NextRequest) {
  return handleRenewalCheck(req);
}

async function handleRenewalCheck(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId') || searchParams.get('u') || 'ALL';
    const allFunds = await getSinkingFunds(targetUserId);
    // Suppress Telegram renewal notifications for suspended subscriptions
    const funds = allFunds.filter((f) => f.status !== 'SUSPENDED');
    const triggeredAlerts = [];

    for (const fund of funds) {
      const days = fund.days_remaining ?? 999;
      // Triggers for 7 days, 3 days, 1 day, or overdue
      if (days <= 7 && fund.urgency_status) {
        const dispatchResult = await sendTelegramRenewalAlert({
          serviceName: fund.name,
          billingAmount: fund.billing_amount,
          daysRemaining: days,
          nextDueDate: fund.next_due_date,
          dailyBurn: fund.daily_amortized_burn || 0,
          urgency: fund.urgency_status,
        });

        triggeredAlerts.push({
          service: fund.name,
          daysRemaining: days,
          urgency: fund.urgency_status,
          dispatchResult,
        });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      evaluatedCount: funds.length,
      alertsTriggered: triggeredAlerts.length,
      details: triggeredAlerts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to evaluate renewals' },
      { status: 500 }
    );
  }
}
