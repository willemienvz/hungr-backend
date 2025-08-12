import * as admin from 'firebase-admin';

function parseDateKey(dateKey: string): Date {
  const [yyyy, mm, dd] = dateKey.split('-').map((s) => parseInt(s, 10));
  return new Date(Date.UTC(yyyy, (mm - 1), dd));
}

function formatDateKey(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const backfill = {
  async runBackfill(opts: { startDate?: string; endDate?: string; dryRun?: boolean }) {
    const db = admin.firestore();
    const end = opts.endDate ? parseDateKey(opts.endDate) : new Date();
    const start = opts.startDate ? parseDateKey(opts.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dryRun = !!opts.dryRun;

    const results: Record<string, any> = { processedDays: [], dryRun };

    // Iterate by day
    for (let d = new Date(end); d >= start; d.setUTCDate(d.getUTCDate() - 1)) {
      const dateKey = formatDateKey(d);

      // Query raw events for this day
      const startMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
      const endMs = startMs + 24 * 60 * 60 * 1000;
      const eventsSnap = await db
        .collection('analytics-events')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromMillis(startMs))
        .where('timestamp', '<', admin.firestore.Timestamp.fromMillis(endMs))
        .get();

      let viewCount = 0;
      let viewDurationMs = 0;
      let clickCount = 0;
      let interactionCount = 0;
      let navigationCount = 0;
      let sessionCount = 0;
      let orderCount = 0;

      const hourHistogram: Record<string, number> = {};
      const itemCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      const filterCounts: Record<string, number> = {};

      const specials: Record<string, { impressions: number; clicks: number; added: number; conversions: number }> = {};

      // Reduce
      eventsSnap.forEach((doc) => {
        const e: any = doc.data();
        const ts = e.timestamp?.toMillis?.() ?? 0;
        const hour = new Date(ts).getUTCHours();
        hourHistogram[String(hour).padStart(2, '0')] = (hourHistogram[String(hour).padStart(2, '0')] || 0) + 1;

        switch (e.type) {
          case 'view':
            viewCount += 1;
            viewDurationMs += e.duration || 0;
            break;
          case 'click':
            clickCount += 1;
            if (e.itemId) itemCounts[e.itemId] = (itemCounts[e.itemId] || 0) + 1;
            if (e.categoryId) categoryCounts[e.categoryId] = (categoryCounts[e.categoryId] || 0) + 1;
            if (e.data?.specialId) {
              const s = specials[e.data.specialId] || { impressions: 0, clicks: 0, added: 0, conversions: 0 };
              s.clicks += 1; specials[e.data.specialId] = s;
            }
            break;
          case 'interaction':
            interactionCount += 1;
            if (e.interactionType === 'filter' && e.value) {
              filterCounts[String(e.value)] = (filterCounts[String(e.value)] || 0) + 1;
            }
            if (e.value === 'special_impression' && e.data?.specialId) {
              const s = specials[e.data.specialId] || { impressions: 0, clicks: 0, added: 0, conversions: 0 };
              s.impressions += 1; specials[e.data.specialId] = s;
            }
            if (e.value === 'special_added_to_order' && e.data?.specialId) {
              const s = specials[e.data.specialId] || { impressions: 0, clicks: 0, added: 0, conversions: 0 };
              s.added += 1; specials[e.data.specialId] = s;
            }
            if (e.value === 'special_converted' && e.data?.specialId) {
              const s = specials[e.data.specialId] || { impressions: 0, clicks: 0, added: 0, conversions: 0 };
              s.conversions += 1; specials[e.data.specialId] = s;
            }
            if (e.value === 'order_submitted') {
              orderCount += 1;
            }
            break;
          case 'navigation':
            navigationCount += 1;
            break;
          case 'session':
            if (e.sessionType === 'start') sessionCount += 1;
            break;
        }
      });

      results.processedDays.push({ dateKey, eventCount: eventsSnap.size, viewCount, viewDurationMs, clickCount, interactionCount, navigationCount, sessionCount, orderCount });

      if (dryRun) continue;

      // Write menu-level daily aggregate (owner-level not included here)
      // Example owner/day summary could be written here if desired

      // For backfill we cannot infer menuId without reading each event; keeping a simple example path
      // If needed, extend to per-entity rollups using per-event ids
      const dateDoc = db.doc(`analytics-aggregated/${dateKey}`);
      await dateDoc.set({ lastUpdated: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      // Optionally write some owner/menu rollups here if desired

      // Write specials per-id
      const specialsEntries = Object.entries(specials);
      for (const [specialId, agg] of specialsEntries) {
        const ref = db.doc(`analytics-aggregated/${dateKey}/specials/${specialId}`);
        await ref.set({
          specialImpressions: agg.impressions,
          specialClicks: agg.clicks,
          specialAddedToOrder: agg.added,
          specialConversions: agg.conversions,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    return results;
  }
};


