import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiHandler, ApiError, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';
import { sendBulkDatabaseNotifications } from '@/lib/notifications';
import { normalizeActionButtons } from '@/lib/realtime-notification-model';

const actionButtonSchema = z
  .object({
    id: z.string().trim().min(1).max(40).optional(),
    label: z.string().trim().min(1).max(40),
    action: z.string().trim().max(60).optional(),
    href: z.string().trim().max(300).optional(),
    variant: z.enum(['primary', 'secondary', 'danger']).optional(),
  })
  .refine((value) => Boolean(value.action || value.href), {
    message: 'Mỗi action button cần `action` hoặc `href`',
  });

const pushNotificationSchema = z.object({
  event_type: z.string().trim().min(1).max(80),
  target_user_ids: z.array(z.number().int().positive()).min(1).max(300),
  type: z.string().trim().min(1).max(60).default('system'),
  title: z.string().trim().min(1).max(255),
  message: z.string().trim().min(1).max(2000),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  ttl_seconds: z.number().int().min(5).max(10).default(7),
  action_buttons: z.array(actionButtonSchema).max(3).default([]),
  related_table: z.string().trim().max(80).optional().nullable(),
  related_id: z.number().int().positive().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const actor = await requireApiRole(request, ['admin', 'teacher']);

  let parsedBody: z.infer<typeof pushNotificationSchema>;
  try {
    parsedBody = pushNotificationSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.validation('Payload push notification không hợp lệ', {
        issues: error.issues,
      });
    }
    throw error;
  }

  const targetUserIds = Array.from(
    new Set(
      parsedBody.target_user_ids
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  if (targetUserIds.length === 0) {
    throw ApiError.validation('Không có người nhận hợp lệ');
  }

  const normalizedActionButtons = normalizeActionButtons(parsedBody.action_buttons);

  const sendResult = await sendBulkDatabaseNotifications({
    userIds: targetUserIds,
    type: parsedBody.type,
    title: parsedBody.title,
    message: parsedBody.message,
    relatedTable: parsedBody.related_table || null,
    relatedId: parsedBody.related_id || null,
    eventType: parsedBody.event_type,
    actorId: actor.id,
    priority: parsedBody.priority,
    ttlSeconds: parsedBody.ttl_seconds,
    actionButtons: normalizedActionButtons,
    metadata: parsedBody.metadata
      ? {
          ...parsedBody.metadata,
          source: 'api.notifications.push',
        }
      : { source: 'api.notifications.push' },
  });

  return successResponse(
    {
      event_type: parsedBody.event_type,
      actor_id: actor.id,
      target_user_ids: targetUserIds,
      priority: parsedBody.priority,
      ttl_seconds: parsedBody.ttl_seconds,
      action_buttons: normalizedActionButtons,
      delivery: sendResult,
    },
    `Đã push ${sendResult.created}/${sendResult.targetCount} thông báo`
  );
});
