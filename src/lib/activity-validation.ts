export type CreateActivityPayload = {
  title: string;
  description: string;
  date_time: string;
  location: string;
  max_participants: number;
  class_ids: number[];
  mandatory_class_ids: number[];
  voluntary_class_ids: number[];
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
  mandatory_class_ids?: number[];
  voluntary_class_ids?: number[];
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

function parseClassIdArray(
  value: unknown,
  fieldName: 'class_ids' | 'mandatory_class_ids' | 'voluntary_class_ids',
  errors: Record<string, string>
): number[] | undefined {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (!Array.isArray(value)) {
    errors[fieldName] = `${fieldName} phai la mang ID lop`;
    return undefined;
  }

  const parsedIds: number[] = [];
  for (const classId of value) {
    const parsedClassId = parsePositiveInt(classId);
    if (parsedClassId === null) {
      errors[fieldName] = `Moi phan tu trong ${fieldName} phai la so nguyen duong`;
      return undefined;
    }
    parsedIds.push(parsedClassId);
  }

  return Array.from(new Set(parsedIds));
}

function normalizeClassScopes(
  input: Record<string, unknown>,
  errors: Record<string, string>,
  isCreate: boolean
): Pick<UpdateActivityPayload, 'class_ids' | 'mandatory_class_ids' | 'voluntary_class_ids'> {
  const hasClassIds = hasOwn(input, 'class_ids');
  const hasMandatoryClassIds = hasOwn(input, 'mandatory_class_ids');
  const hasVoluntaryClassIds = hasOwn(input, 'voluntary_class_ids');
  const hasAnyClassScope = hasClassIds || hasMandatoryClassIds || hasVoluntaryClassIds;

  if (!hasAnyClassScope) {
    return isCreate
      ? {
          class_ids: [],
          mandatory_class_ids: [],
          voluntary_class_ids: [],
        }
      : {};
  }

  const legacyClassIds = parseClassIdArray(input.class_ids, 'class_ids', errors);
  const mandatoryClassIds = parseClassIdArray(
    input.mandatory_class_ids,
    'mandatory_class_ids',
    errors
  );
  const voluntaryClassIds = parseClassIdArray(
    input.voluntary_class_ids,
    'voluntary_class_ids',
    errors
  );

  if (errors.class_ids || errors.mandatory_class_ids || errors.voluntary_class_ids) {
    return {};
  }

  const normalizedMandatory = Array.from(
    new Set(
      hasMandatoryClassIds ? mandatoryClassIds || [] : hasClassIds ? legacyClassIds || [] : []
    )
  );
  const mandatorySet = new Set(normalizedMandatory);
  const normalizedVoluntary = Array.from(
    new Set((voluntaryClassIds || []).filter((classId) => !mandatorySet.has(classId)))
  );

  return {
    class_ids: Array.from(new Set([...normalizedMandatory, ...normalizedVoluntary])),
    mandatory_class_ids: normalizedMandatory,
    voluntary_class_ids: normalizedVoluntary,
  };
}

function validateActivityBody(
  body: unknown,
  options: { mode: 'create' | 'update'; baseDateTime?: string | null }
): ValidateResult<CreateActivityPayload | UpdateActivityPayload> {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object') {
    return {
      errors: {
        general: 'Du lieu gui len khong hop le',
      },
    };
  }

  const input = body as Record<string, unknown>;
  const isCreate = options.mode === 'create';
  const normalized: UpdateActivityPayload = {};

  const hasTitle = hasOwn(input, 'title');
  if (hasTitle) {
    if (typeof input.title !== 'string') {
      errors.title = 'Tieu de khong hop le';
    } else {
      const title = input.title.trim();
      if (!title) {
        errors.title = 'Tieu de la bat buoc';
      } else if (title.length < 3) {
        errors.title = 'Tieu de it nhat 3 ky tu';
      } else if (title.length > 200) {
        errors.title = 'Tieu de toi da 200 ky tu';
      } else {
        normalized.title = title;
      }
    }
  } else if (isCreate) {
    errors.title = 'Tieu de la bat buoc';
  }

  const hasDescription = hasOwn(input, 'description');
  if (hasDescription) {
    if (typeof input.description !== 'string') {
      errors.description = 'Mo ta khong hop le';
    } else {
      const description = input.description.trim();
      if (description.length > 2000) {
        errors.description = 'Mo ta toi da 2000 ky tu';
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
      errors.date_time = 'Thoi gian hoat dong khong hop le';
    } else {
      const dateTime = rawDateTime.trim();
      if (!dateTime) {
        errors.date_time = 'Thoi gian hoat dong la bat buoc';
      } else if (!isValidDateInput(dateTime)) {
        errors.date_time = 'Thoi gian hoat dong khong hop le';
      } else {
        normalized.date_time = dateTime;
      }
    }
  } else if (isCreate) {
    errors.date_time = 'Thoi gian hoat dong la bat buoc';
  }

  const hasLocation = hasOwn(input, 'location');
  if (hasLocation) {
    if (typeof input.location !== 'string') {
      errors.location = 'Dia diem khong hop le';
    } else {
      const location = input.location.trim();
      if (!location) {
        errors.location = 'Dia diem la bat buoc';
      } else if (location.length > 255) {
        errors.location = 'Dia diem toi da 255 ky tu';
      } else {
        normalized.location = location;
      }
    }
  } else if (isCreate) {
    errors.location = 'Dia diem la bat buoc';
  }

  const hasMaxParticipants = hasOwn(input, 'max_participants');
  if (hasMaxParticipants) {
    if (input.max_participants === null || input.max_participants === '') {
      errors.max_participants = 'So luong toi da phai la so nguyen duong';
    } else {
      const parsedMax = parsePositiveInt(input.max_participants);
      if (parsedMax === null) {
        errors.max_participants = 'So luong toi da phai la so nguyen duong';
      } else if (parsedMax > 5000) {
        errors.max_participants = 'So luong toi da khong duoc vuot qua 5000';
      } else {
        normalized.max_participants = parsedMax;
      }
    }
  } else if (isCreate) {
    normalized.max_participants = 30;
  }

  Object.assign(normalized, normalizeClassScopes(input, errors, isCreate));

  const hasRegistrationDeadline = hasOwn(input, 'registration_deadline');
  if (hasRegistrationDeadline) {
    const rawDeadline = input.registration_deadline;
    if (rawDeadline === null || rawDeadline === '') {
      if (!isCreate) normalized.registration_deadline = null;
    } else if (typeof rawDeadline !== 'string') {
      errors.registration_deadline = 'Deadline dang ky khong hop le';
    } else {
      const registrationDeadline = rawDeadline.trim();
      if (!registrationDeadline || !isValidDateInput(registrationDeadline)) {
        errors.registration_deadline = 'Deadline dang ky khong hop le';
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
              'Deadline dang ky phai it nhat 24 gio truoc thoi gian hoat dong';
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
        errors.activity_type_id = 'Loai hoat dong khong hop le';
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
        errors.organization_level_id = 'Cap to chuc khong hop le';
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
        mandatory_class_ids: normalized.mandatory_class_ids || normalized.class_ids || [],
        voluntary_class_ids: normalized.voluntary_class_ids || [],
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
