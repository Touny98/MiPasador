import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { MetaCloudProvider } from '@/lib/messaging/meta-cloud';
import { MSG } from '@/lib/bot/messages';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: followUps, error: fetchError } = await supabaseAdmin
    .from('follow_ups')
    .select('*, conversations(user_whatsapp_id)')
    .filter('sent_at', 'is', null)
    .lte('scheduled_at', new Date().toISOString())
    .limit(50);

  if (fetchError) {
    console.error('Error fetching follow-ups:', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // We need the MetaCloudProvider. In a real app, these would be in env or DB.
  // Assuming global env for this project.
  const metaProvider = new MetaCloudProvider(
    process.env.META_ACCESS_TOKEN!,
    process.env.META_PHONE_NUMBER_ID!
  );

  let sentCount = 0;
  let errorCount = 0;

  for (const followUp of followUps) {
    const conversation = followUp.conversations as any;
    if (!conversation?.user_whatsapp_id) continue;

    const from = conversation.user_whatsapp_id;
    const product = followUp.product_name;
    const day = followUp.follow_up_day;

    let message = '';
    if (day === 1) message = MSG.FOLLOWUP_DAY1(product);
    else if (day === 3) message = MSG.FOLLOWUP_DAY3(product);
    else if (day === 7) message = MSG.FOLLOWUP_DAY7(product);

    try {
      await metaProvider.sendInteractiveButtons(
        from,
        message,
        [
          { id: `followup_reserve_${followUp.product_id}`, title: MSG.BTN_RESERVE },
          { id: 'followup_no_thanks', title: MSG.BTN_NO_THANKS },
        ]
      );

      await supabaseAdmin
        .from('follow_ups')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', followUp.id);

      sentCount++;
    } catch (e) {
      console.error(`Failed to send follow-up for ${from}:`, e);
      // We mark as sent anyway to avoid infinite retries, as per instructions
      await supabaseAdmin
        .from('follow_ups')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', followUp.id);
      errorCount++;
    }
  }

  return NextResponse.json({ sent: sentCount, errors: errorCount });
}
