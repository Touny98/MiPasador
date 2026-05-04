import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { parseIntent } from '@/lib/search/intent-parser';

export async function GET() {
  try {
    // Execute all metrics queries in parallel
    const [
      totalQueriesResult,
      resolvedQueriesResult,
      queriesPerDayResult,
      topSearchedKeywordsResult,
      topMerchantsResult,
      conversionQueryResult,
      reservationQueryResult
    ] = await Promise.all([
      // Total queries
      supabaseAdmin.from('queries').select('*', { count: 'exact', head: true }),

      // Resolved queries (resolved_bool = true)
      supabaseAdmin.from('queries').select('*', { count: 'exact', head: true }).eq('resolved_bool', true),

      // Queries per day (last 7 days)
      supabaseAdmin.from('queries')
        .select('created_at')
        .gte('created_at', `${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}T00:00:00.000Z`)
        .lt('created_at', `${new Date().toISOString().split('T')[0]}T23:59:59.999Z`),

      // For top searched keywords, get recent search terms
      supabaseAdmin.from('queries')
        .select('search_term')
        .gte('created_at', `${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}T00:00:00.000Z`)
        .order('created_at', { ascending: false })
        .limit(1000),

      // For top merchants, join queries -> conversations -> merchants and sum results_count
      supabaseAdmin.from('queries')
        .select('results_count, conversations!inner(merchant_id)')
        .not('conversation_id', 'is', null)
        .gte('created_at', `${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}T00:00:00.000Z`),

      // Get queries for conversion rate calculation (last 30 days)
      supabaseAdmin.from('queries')
        .select('id, conversation_id')
        .not('conversation_id', 'is', null)
        .gte('created_at', `${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}T00:00:00.000Z`),

      // Get reservations for conversion rate calculation (last 30 days)
      supabaseAdmin.from('reservations')
        .select('conversation_id')
        .not('conversation_id', 'is', null)
        .gte('created_at', `${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}T00:00:00.000Z`)
    ]);

    // Process results
    const totalQueries = totalQueriesResult.count ?? 0;
    const resolvedQueries = resolvedQueriesResult.count ?? 0;
    const pendingGaps = totalQueries - resolvedQueries;
    const resolutionRate = totalQueries > 0 ? Math.round((resolvedQueries / totalQueries) * 100) : 0;

    // Queries per day (last 7 days)
    const queriesPerDay = Array(7).fill(0); // Initialize with 7 zeros
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    queriesPerDayResult.data?.forEach((query: any) => {
      const queryDate = new Date(query.created_at);
      queryDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - queryDate.getTime()) / (24 * 60 * 60 * 1000));

      if (diffDays >= 0 && diffDays < 7) {
        queriesPerDay[diffDays]++; // diffDays = 0 is today, 1 is yesterday, etc.
      }
    });
    // Reverse so that index 0 is 6 days ago, index 6 is today
    queriesPerDay.reverse();

    // Top searched keywords (from last 30 days, limited to 1000 queries for performance)
    const keywordFrequency: Record<string, number> = {};
    topSearchedKeywordsResult.data?.forEach((query: any) => {
      try {
        const intent = parseIntent(query.search_term);
        intent.keywords.forEach((keyword: string) => {
          if (keyword.length > 2) { // Only count meaningful keywords (length > 2)
            keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
          }
        });
      } catch (e) {
        // If parsing fails, skip this query
        console.warn('Failed to parse intent for query:', query.search_term, e);
      }
    });

    // Get top 5 keywords
    const topSearchedKeywords = Object.entries(keywordFrequency)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5)
      .map(([keyword]) => keyword);

    // Top merchants with most results shown
    const merchantResults: Record<string, number> = {};
    topMerchantsResult.data?.forEach((query: any) => {
      const merchantId = query.conversations?.merchant_id;
      if (merchantId) {
        const resultsCount = query.results_count || 0;
        merchantResults[merchantId] = (merchantResults[merchantId] || 0) + resultsCount;
      }
    });

    const topMerchants = Object.entries(merchantResults)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5)
      .map(([merchantId]) => merchantId);

    // Conversion rate: queries that ended in reservation / total
    // Build sets of conversation IDs from queries and reservations
    const queryConversationIds = new Set(
      conversionQueryResult.data?.map(q => q.conversation_id).filter((id): id is string => id !== null) || []
    );

    const reservationConversationIds = new Set(
      reservationQueryResult.data?.map(r => r.conversation_id).filter((id): id is string => id !== null) || []
    );

    // Count how many query conversation ids also appear in reservation conversation ids
    let conversionCount = 0;
    queryConversationIds.forEach(convId => {
      if (reservationConversationIds.has(convId)) {
        conversionCount++;
      }
    });

    const conversionRate = totalQueries > 0 ? Math.round((conversionCount / totalQueries) * 100) : 0;

    return NextResponse.json({
      totalQueries,
      resolvedQueries,
      pendingGaps,
      resolutionRate,
      queriesPerDay, // Array of 7 numbers [6daysAgo, 5daysAgo, ..., yesterday, today]
      topSearchedKeywords, // Array of top 5 keywords
      topMerchants, // Array of top 5 merchant IDs
      conversionRate
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}