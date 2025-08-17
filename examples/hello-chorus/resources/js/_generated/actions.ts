// Auto-generated TypeScript interfaces for Chorus Actions
// Generated on 2025-08-16 09:14:51

// Validation utilities
export interface ValidationError {
  field: string;
  message: string;
  rule: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface FieldConstraints {
  required?: boolean;
  type?: string;
  min?: number;
  max?: number;
  minDigits?: number;
  maxDigits?: number;
  regex?: string;
  in?: any[];
  uuid?: boolean;
  email?: boolean;
  url?: boolean;
  date?: boolean;
}

export interface ValidationSchema {
  [field: string]: FieldConstraints;
}

// Core validation functions
export const ValidationUtils = {
  validateField(value: any, constraints: FieldConstraints, fieldName: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required check
    if (constraints.required && (value === null || value === undefined || value === '')) {
      errors.push({ field: fieldName, message: `${fieldName} is required`, rule: 'required', value });
      return errors; // Stop further validation if required field is missing
    }

    // Skip other validations if value is empty and not required
    if (!constraints.required && (value === null || value === undefined || value === '')) {
      return errors;
    }

    // Type validation
    if (constraints.type) {
      if (constraints.type === 'string' && typeof value !== 'string') {
        errors.push({ field: fieldName, message: `${fieldName} must be a string`, rule: 'string', value });
      } else if (constraints.type === 'number' && typeof value !== 'number') {
        errors.push({ field: fieldName, message: `${fieldName} must be a number`, rule: 'number', value });
      } else if (constraints.type === 'boolean' && typeof value !== 'boolean') {
        errors.push({ field: fieldName, message: `${fieldName} must be a boolean`, rule: 'boolean', value });
      }
    }

    // String-specific validations
    if (typeof value === 'string') {
      if (constraints.min !== undefined && value.length < constraints.min) {
        errors.push({ field: fieldName, message: `${fieldName} must be at least ${constraints.min} characters`, rule: 'min', value });
      }
      if (constraints.max !== undefined && value.length > constraints.max) {
        errors.push({ field: fieldName, message: `${fieldName} may not be greater than ${constraints.max} characters`, rule: 'max', value });
      }
      if (constraints.regex && !new RegExp(constraints.regex).test(value)) {
        errors.push({ field: fieldName, message: `${fieldName} format is invalid`, rule: 'regex', value });
      }
      if (constraints.uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        errors.push({ field: fieldName, message: `${fieldName} must be a valid UUID`, rule: 'uuid', value });
      }
      if (constraints.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push({ field: fieldName, message: `${fieldName} must be a valid email address`, rule: 'email', value });
      }
      if (constraints.url && !/^https?:\/\/.+/.test(value)) {
        errors.push({ field: fieldName, message: `${fieldName} must be a valid URL`, rule: 'url', value });
      }
    }

    // Number-specific validations
    if (typeof value === 'number') {
      if (constraints.min !== undefined && value < constraints.min) {
        errors.push({ field: fieldName, message: `${fieldName} must be at least ${constraints.min}`, rule: 'min', value });
      }
      if (constraints.max !== undefined && value > constraints.max) {
        errors.push({ field: fieldName, message: `${fieldName} may not be greater than ${constraints.max}`, rule: 'max', value });
      }
    }

    // In validation
    if (constraints.in && constraints.in.length > 0 && !constraints.in.includes(value)) {
      errors.push({ field: fieldName, message: `${fieldName} must be one of: ${constraints.in.join(', ')}`, rule: 'in', value });
    }

    return errors;
  },

  validateObject(data: Record<string, any>, schema: ValidationSchema): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [fieldName, constraints] of Object.entries(schema)) {
      const fieldErrors = this.validateField(data[fieldName], constraints, fieldName);
      errors.push(...fieldErrors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

export interface SimpleCreateMessageParams {
  'messages.create'?: any;
}

// Validation schema for SimpleCreateMessage
export const SimpleCreateMessageValidationSchema: Record<string, ValidationSchema> = {
  'messages.create': {
    'id': {
      type: 'string',
      uuid: true,
    },
    'body': {
      required: true,
      type: 'string',
      max: 1000,
    },
    'platform_id': {
      required: true,
      type: 'string',
      uuid: true,
    },
    'user_id': {
      required: true,
      type: 'string',
      uuid: true,
    },
    'tenant_id': {
      required: true,
      type: 'string',
      uuid: true,
    },
  },
};

export interface DeleteMessageParams {
  id: string;
}

// Validation schema for DeleteMessage
export const DeleteMessageValidationSchema: Record<string, ValidationSchema> = {
  'default': {
    'id': {
      required: true,
      type: 'string',
      uuid: true,
    },
  },
};

export interface CreateMessageWithActivityParams {
  'messages.create'?: any;
  'users.update': any;
  'platforms.update'?: any;
  data: any;
}

// Validation schema for CreateMessageWithActivity
export const CreateMessageWithActivityValidationSchema: Record<string, ValidationSchema> = {
  'messages.create': {
    'id': {
      type: 'string',
      uuid: true,
    },
    'body': {
      required: true,
      type: 'string',
      max: 1000,
    },
    'platform_id': {
      required: true,
      type: 'string',
      uuid: true,
    },
    'user_id': {
      required: true,
      type: 'string',
      uuid: true,
    },
    'tenant_id': {
      required: true,
      type: 'number',
    },
  },
  'users.update': {
    'id': {
      required: true,
      type: 'string',
      uuid: true,
    },
    'last_activity_at': {
      required: true,
      date: true,
    },
  },
  'platforms.update': {
    'id': {
      required: true,
      type: 'string',
      uuid: true,
    },
    'last_message_at': {
      date: true,
    },
  },
  'data': {
    'test_item': {
      required: true,
      type: 'string',
    },
  },
};

export interface UpdateMessageParams {
  id: string;
  message: string;
}

// Validation schema for UpdateMessage
export const UpdateMessageValidationSchema: Record<string, ValidationSchema> = {
  'default': {
    'id': {
      required: true,
      type: 'string',
      uuid: true,
    },
    'message': {
      required: true,
      type: 'string',
      max: 255,
    },
  },
};

export interface ChorusActionResponse {
  success: boolean;
  operations?: {
    success: boolean;
    index: number;
    operation: {
      table: string;
      operation: string;
      data: any;
    };
    data?: any;
    error?: string;
  }[];
  summary?: {
    total: number;
    successful: number;
    failed: number;
  };
  error?: string;
  validation_errors?: ValidationError[];
}

export interface ModelProxy {
  create(data: Record<string, any>): void;
  update(data: Record<string, any>): void;
  delete(data: Record<string, any>): void;
}

export interface WritesProxy {
  messages: ModelProxy;
  users: ModelProxy;
  platforms: ModelProxy;
  [tableName: string]: ModelProxy;
}

export declare function simpleCreateMessageAction(
  callback: (writes: WritesProxy) => void
): Promise<ChorusActionResponse>;

export declare function deleteMessageAction(
  callback: (writes: WritesProxy) => void
): Promise<ChorusActionResponse>;

export declare function createMessageWithActivityAction(
  callback: (writes: WritesProxy) => void
): Promise<ChorusActionResponse>;

export declare function updateMessageAction(
  callback: (writes: WritesProxy) => void
): Promise<ChorusActionResponse>;

export interface ChorusActions {
  SimpleCreateMessage(params: SimpleCreateMessageParams): Promise<ChorusActionResponse>;
  DeleteMessage(params: DeleteMessageParams): Promise<ChorusActionResponse>;
  CreateMessageWithActivity(params: CreateMessageWithActivityParams): Promise<ChorusActionResponse>;
  UpdateMessage(params: UpdateMessageParams): Promise<ChorusActionResponse>;
}

export const chorusActionMeta = {
  SimpleCreateMessage: {
    className: 'App\\Actions\\ChorusActions\\SimpleCreateMessageAction',
    allowOfflineWrites: true,
    supportsBatch: true,
  },
  DeleteMessage: {
    className: 'App\\Actions\\ChorusActions\\DeleteMessageAction',
    allowOfflineWrites: true,
    supportsBatch: true,
  },
  CreateMessageWithActivity: {
    className: 'App\\Actions\\ChorusActions\\CreateMessageWithActivityAction',
    allowOfflineWrites: true,
    supportsBatch: true,
  },
  UpdateMessage: {
    className: 'App\\Actions\\ChorusActions\\UpdateMessageAction',
    allowOfflineWrites: true,
    supportsBatch: true,
  },
};

