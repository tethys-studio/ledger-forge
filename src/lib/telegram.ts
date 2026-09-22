/**
 * Zero-Cost Telegram Bot Notification Dispatcher
 */

export interface RenewalAlertPayload {
  serviceName: string;
  billingAmount: number;
  daysRemaining: number;
  nextDueDate: string;
  dailyBurn: number;
  urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL' | 'OVERDUE';
}

export async function sendTelegramRenewalAlert(
  payload: RenewalAlertPayload,
  token?: string,
  chatId?: string
): Promise<{ success: boolean; message: string }> {
  const botToken = token || process.env.TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !targetChatId) {
    return {
      success: false,
      message: 'Telegram credentials missing. Configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.',
    };
  }

  const urgencyEmoji = {
    ROUTINE: '🗓️',
    URGENT: '⚠️',
    CRITICAL: '🚨',
    OVERDUE: '⛔',
  }[payload.urgency];

  const urgencyTitle = {
    ROUTINE: 'Upcoming Renewal (7 Days)',
    URGENT: 'Urgent Expiration Warning (3 Days)',
    CRITICAL: 'Critical: Due Within 24 Hours!',
    OVERDUE: 'Service Past Due Date!',
  }[payload.urgency];

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(payload.billingAmount);

  const formattedDaily = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(payload.dailyBurn);

  const text = `
${urgencyEmoji} *LedgerForge Alert: ${urgencyTitle}*

*Service:* \`${payload.serviceName}\`
*Amount Due:* *${formattedAmount}*
*Due Date:* ${payload.nextDueDate}
*Days Remaining:* *${payload.daysRemaining > 0 ? `${payload.daysRemaining} days` : 'Due today/overdue'}*
*Amortized Burn Rate:* ${formattedDaily}/day

_Log in to LedgerForge to confirm renewal or allocate reserve funds._
  `.trim();

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      return {
        success: false,
        message: data.description || 'Failed to dispatch Telegram message',
      };
    }

    return { success: true, message: 'Telegram alert dispatched successfully' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown Telegram network error',
    };
  }
}

/**
 * Test Telegram dispatcher
 */
export async function testTelegramDispatcher(token?: string, chatId?: string) {
  return sendTelegramRenewalAlert(
    {
      serviceName: 'Airtel 5G True Unlimited (84-Day Plan)',
      billingAmount: 799,
      daysRemaining: 3,
      nextDueDate: '2026-09-28',
      dailyBurn: 9.51,
      urgency: 'URGENT',
    },
    token,
    chatId
  );
}
