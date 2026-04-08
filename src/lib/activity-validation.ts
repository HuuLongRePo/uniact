export type CreateActivityPayload = {
  title: string;
  description: string;
  date_time: string;
  location: string;
  max_participants: number;
  class_ids: number[];
  registration_deadline?: string;
  activity_type_id?: number;
  organization_level_id?: number;
};

export type UpdateActivityPayload = {
  title?: string;
  description?: string;
  date_time?: string;
  location?: string;
  max_participants?: number;
  class_ids?: number[];
  registration_deadline?: string | null;
  activity_type_id?: number | null;
  organization_level_id?: number | null;
};

type ValidateResult<T> = {
  data?: T;
  errors: Record<string, string>;
};

function hasOwn(input: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function isValidDateInput(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

export function parsePositiveInt(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

function validateActivityBody(
  body: unknown,
  options: { mode: 'create' | 'update'; baseDateTime?: string | null }
): ValidateResult<CreateActivityPayload | UpdateActivityPayload> {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object') {
    return {
      errors: {
        general: 'Dữ liệu gửi lên không hợp lệ',
      },
    };
  }

  const input = body as Record<string, unknown>;
  const isCreate = options.mode === 'create';

  const normalized: UpdateActivityPayload = {};

  const hasTitle = hasOwn(input, 'title');
  if (hasTitle) {
    if (typeof input.title !== 'string') {
      errors.title = 'Tiêu đề không hợp lệ';
    } else {
      const title = input.title.trim();
      if (!title) {
        errors.title = 'Tiêu đề là bắt buộc';
      } else if (title.length < 3) {
        errors.title = 'Tiêu đề ít nhất 3 ký tự';
      } else if (title.length > 200) {
        errors.title = 'Tiêu đề tối đa 200 ký tự';
      } else {
        normalized.title = title;
      }
    }
  } else if (isCreate) {
    errors.title = 'Tiêu đề là bắt buộc';
  }

  const hasDescription = hasOwn(input, 'description');
  if (hasDescription) {
    if (typeof input.description !== 'string') {
      errors.description = 'Mô tả không hợp lệ';
    } else {
      const description = input.description.trim();
      if (description.length > 2000) {
        errors.description = 'Mô tả tối đa 2000 ký tự';
      } else {
        normalized.description = description;
      }
    }
  } else if (isCreate) {
    normalized.description = '';
  }

  const hasDateTime = hasOwn(input, 'date_time') || hasOwn(input, 'start_time');
  if (hasDateTime) {
    const rawDateTime = input.date_time ?? input.start_time;
    if (typeof rawDateTime !== 'string') {
      errors.date_time = 'Thời gian hoạt động không hợp lệ';
    } else {
      const dateTime = rawDateTime.trim();
      if (!dateTime) {
        errors.date_time = 'Thời gian hoạt động là bắt buộc';
      } else if (!isValidDateInput(dateTime)) {
        errors.date_time = 'Thời gian hoạt động không hợp lệ';
      } else {
        normalized.date_time = dateTime;
      }
    }
  } else if (isCreate) {
    errors.date_time = 'Thời gian hoạt động là bắt buộc';
  }

  const hasLocation = hasOwn(input, 'location');
  if (hasLocation) {
    if (typeof input.location !== 'string') {
      errors.location = 'Địa điểm không hợp lệ';
    } else {
      const location = input.location.trim();
      if (!location) {
        errors.location = 'Địa điểm là bắt buộc';
      } else if (location.length > 255) {
        errors.location = 'Địa điểm tối đa 255 ký tự';
      } else {
        normalized.location = location;
      }
    }
  } else if (isCreate) {
    errors.location = 'Địa điểm là bắt buộc';
  }

  const hasMaxParticipants = hasOwn(input, 'max_participants');
  if (hasMaxParticipants) {
    if (input.max_participants === null || input.max_participants === '') {
      errors.max_participants = 'Số lượng tối đa phải là số nguyên dương';
    } else {
      const parsedMax = parsePositiveInt(input.max_participants);
      if (parsedMax === null) {
        errors.max_participants = 'Số lượng tối đa phải là số nguyên dương';
      } else if (parsedMax > 5000) {
        errors.max_participants = 'Số lượng tối đa không được vượt quá 5000';
      } else {
        normalized.max_participants = parsedMax;
      }
    }
  } else if (isCreate) {
    normalized.max_participants = 30;
  }

  const hasClassIds = hasOwn(input, 'class_ids');
  if (hasClassIds) {
    if (input.class_ids === null) {
      normalized.class_ids = [];
    } else if (!Array.isArray(input.class_ids)) {
      errors.class_ids = 'class_ids phải là mảng ID lớp';
    } else {
      const parsedIds: number[] = [];
      for (const classId of input.class_ids) {
        const parsedClassId = parsePositiveInt(classId);
        if (parsedClassId === null) {
          errors.class_ids = 'Mỗi class_id phải là số nguyên dương';
          break;
        }
        parsedIds.push(parsedClassId);
      }
      if (!errors.class_ids) {
        normalized.class_ids = Array.from(new Set(parsedIds));
      }
    }
  } else if (isCreate) {
    normalized.class_ids = [];
  }

  const hasRegistrationDeadline = hasOwn(input, 'registration_deadline');
  if (hasRegistrationDeadline) {
    const rawDeadline = input.registration_deadline;
    if (rawDeadline === null || rawDeadline === '') {
      if (!isCreate) normalized.registration_deadline = null;
    } else if (typeof rawDeadline !== 'string') {
      errors.registration_deadline = 'Deadline đăng ký không hợp lệ';
    } else {
      const registrationDeadline = rawDeadline.trim();
      if (!registrationDeadline || !isValidDateInput(registrationDeadline)) {
        errors.registration_deadline = 'Deadline đăng ký không hợp lệ';
      } else {
        const dateTimeForValidation =
          normalized.date_time ??
          (typeof options.baseDateTime === 'string' ? options.baseDateTime : undefined);

        if (dateTimeForValidation && isValidDateInput(dateTimeForValidation)) {
          const deadlineDate = new Date(registrationDeadline);
          const activityDate = new Date(dateTimeForValidation);
          const hoursDiff = (activityDate.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60);

          if (hoursDiff < 24) {
            errors.registration_deadline =
              'Deadline đăng ký phải ít nhất 24 giờ trước thời gian hoạt động';
          } else {
            normalized.registration_deadline = registrationDeadline;
          }
        } else if (!isCreate) {
          normalized.registration_deadline = registrationDeadline;
        }
      }
    }
  }

  const hasTypeId = hasOwn(input, 'activity_type_id') || hasOwn(input, 'type_id');
  if (hasTypeId) {
    const rawTypeId = input.activity_type_id ?? input.type_id;
    if (rawTypeId === null || rawTypeId === undefined || rawTypeId === '') {
      if (!isCreate) normalized.activity_type_id = null;
    } else {
      const parsedTypeId = parsePositiveInt(rawTypeId);
      if (parsedTypeId === null) {
        errors.activity_type_id = 'Loại hoạt động không hợp lệ';
      } else {
        normalized.activity_type_id = parsedTypeId;
      }
    }
  }

  const hasOrganizationLevelId = hasOwn(input, 'organization_level_id');
  if (hasOrganizationLevelId) {
    const rawOrgLevelId = input.organization_level_id;
    if (rawOrgLevelId === null || rawOrgLevelId === undefined || rawOrgLevelId === '') {
      if (!isCreate) normalized.organization_level_id = null;
    } else {
      const parsedOrgLevelId = parsePositiveInt(rawOrgLevelId);
      if (parsedOrgLevelId === null) {
        errors.organization_level_id = 'Cấp tổ chức không hợp lệ';
      } else {
        normalized.organization_level_id = parsedOrgLevelId;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  if (isCreate) {
    return {
      data: {
        title: normalized.title as string,
        description: normalized.description || '',
        date_time: normalized.date_time as string,
        location: normalized.location as string,
        max_participants: normalized.max_participants ?? 30,
        class_ids: normalized.class_ids || [],
        ...(typeof normalized.registration_deadline === 'string'
          ? { registration_deadline: normalized.registration_deadline }
          : {}),
        ...(typeof normalized.activity_type_id === 'number'
          ? { activity_type_id: normalized.activity_type_id }
          : {}),
        ...(typeof normalized.organization_level_id === 'number'
          ? { organization_level_id: normalized.organization_level_id }
          : {}),
      } satisfies CreateActivityPayload,
      errors: {},
    };
  }

  return {
    data: normalized,
    errors: {},
  };
}

export function validateCreateActivityBody(body: unknown): ValidateResult<CreateActivityPayload> {
  const result = validateActivityBody(body, { mode: 'create' });
  return {
    data: result.data as CreateActivityPayload | undefined,
    errors: result.errors,
  };
}

export function validateUpdateActivityBody(
  body: unknown,
  options: { baseDateTime?: string | null } = {}
): ValidateResult<UpdateActivityPayload> {
  const result = validateActivityBody(body, {
    mode: 'update',
    baseDateTime: options.baseDateTime,
  });
  return {
    data: result.data as UpdateActivityPayload | undefined,
    errors: result.errors,
  };
}
