import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/api-response';
import { requireApiAuth } from '@/lib/guards';
import {
  ensureRealtimeNotificationTables,
  listRealtimeEventsForUser,
  recordRealtimeMetric,
} from '@/lib/realtime-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POLL_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 15000;

export async function GET(request: NextRequest) {
  try {
    await ensureRealtimeNotificationTables();
    const user = await requireApiAuth(request);

    const { searchParams } = new URL(request.url);
    let cursor = Number(searchParams.get('last_event_id') || '0');
    if (!Number.isFinite(cursor) || cursor < 0) {
      cursor = 0;
    }

    await recordRealtimeMetric({
      metricType: cursor > 0 ? 'stream_reconnect' : 'stream_connect',
      userId: user.id,
      details: { cursor },
    }).catch(() => undefined);

    const encoder = new TextEncoder();
    let closed = false;
    let stopFromOutside: ((reason: string) => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        let pollTimer: ReturnType<typeof setInterval> | null = null;
        let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

        const writeSseEvent = (event: string, data: unknown) => {
          if (closed) return;
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const writeSseComment = (comment: string) => {
          if (closed) return;
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        };

        const stopStream = (reason: string) => {
          if (closed) return;
          closed = true;

          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }

          if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
          }

          try {
            controller.close();
          } catch {}

          void recordRealtimeMetric({
            metricType: 'stream_disconnect',
            userId: user.id,
            details: { cursor, reason },
          }).catch(() => undefined);
        };
        stopFromOutside = stopStream;

        const flushEvents = async () => {
          if (closed) return;
          try {
            const events = await listRealtimeEventsForUser({
              userId: user.id,
              afterEventId: cursor,
              limit: 25,
            });

            for (const event of events) {
              writeSseEvent('notification', event);
              cursor = Math.max(cursor, event.event_id);
            }
          } catch (error) {
            writeSseEvent('error', { code: 'STREAM_FETCH_FAILED' });
          }
        };

        pollTimer = setInterval(() => {
          void flushEvents();
        }, POLL_INTERVAL_MS);

        heartbeatTimer = setInterval(() => {
          writeSseComment('ping');
        }, HEARTBEAT_INTERVAL_MS);

        writeSseEvent('ready', { cursor });
        void flushEvents();

        request.signal.addEventListener('abort', () => {
          stopStream('client_abort');
        });
      },
      cancel() {
        stopFromOutside?.('stream_cancelled');
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
