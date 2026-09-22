import { NextRequest, NextResponse } from 'next/server';
import { getSinkingFunds, DEFAULT_USER_ID, formatINR } from '@/lib/fintech-engine';
import { getServerSession } from '@/lib/auth-helpers';
import { format, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('u') || searchParams.get('userId');

    let targetUserId: string | null | undefined = queryUserId;
    if (!targetUserId) {
      try {
        const session = await getServerSession();
        targetUserId = session?.user?.id;
      } catch {
        // Fallback for non-session fetches
      }
    }
    if (!targetUserId) {
      targetUserId = DEFAULT_USER_ID;
    }

    const allFunds = await getSinkingFunds(targetUserId);
    // Suppress suspended subscriptions from generating calendar events and alarms
    const sinkingFunds = allFunds.filter((fund) => fund.status !== 'SUSPENDED');
    const nowStamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LedgerForge//Sinking Funds & Bill Alarms//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:LedgerForge Renewals & Sinking Funds',
      'X-WR-TIMEZONE:Asia/Kolkata',
      'X-PUBLISHED-TTL:PT1H',
    ];

    for (const fund of sinkingFunds) {
      const cleanDueDate = fund.next_due_date.replace(/-/g, '');
      const uid = `ledgerforge-renewal-${fund.id}@ledgerforge.local`;
      const amountStr = formatINR(fund.billing_amount);
      const dailyStr = formatINR(fund.daily_amortized_burn || 0);

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${cleanDueDate}`,
        `DTEND;VALUE=DATE:${cleanDueDate}`,
        `SUMMARY:Renewal Due: ${fund.name} (${amountStr})`,
        `DESCRIPTION:LedgerForge Sinking Fund Renewal\\nService: ${fund.name}\\nAmount: ${amountStr}\\nCycle: Every ${fund.interval_days} days\\nDaily Amortized Cost: ${dailyStr}/day\\nCategory: ${fund.category_name || 'Utilities'}`,
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        // Alarm 1: 7 Days Prior
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-P7D',
        `DESCRIPTION:Upcoming in 7 days: ${fund.name} (${amountStr})`,
        'END:VALARM',
        // Alarm 2: 3 Days Prior
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-P3D',
        `DESCRIPTION:Urgent! 3 days remaining: ${fund.name} (${amountStr})`,
        'END:VALARM',
        // Alarm 3: 1 Day Prior
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-P1D',
        `DESCRIPTION:Critical action required! Due tomorrow: ${fund.name} (${amountStr})`,
        'END:VALARM',
        'END:VEVENT'
      );
    }

    icsContent.push('END:VCALENDAR');

    return new NextResponse(icsContent.join('\r\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="renewals.ics"',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating iCalendar feed:', error);
    return new NextResponse('Internal Server Error generating calendar feed', { status: 500 });
  }
}
