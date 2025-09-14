// Auto-generated TypeScript interfaces for Chorus Actions
// Generated on 2025-09-14 01:15:13

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

export interface CreateUserParams {
  'users.create': any;
}

// Validation schema for CreateUser
export const CreateUserValidationSchema: Record<string, ValidationSchema> = {
  'users.create': {
    'name': {
      required: true,
      type: 'string',
      max: 255,
    },
    'email': {
      required: true,
      email: true,
    },
    'password': {
      required: true,
      type: 'string',
      min: 8,
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
  remove(data: Record<string, any>): void;
}

export interface WritesProxy {
  messages: ModelProxy;
  users: ModelProxy;
  platforms: ModelProxy;
  [tableName: string]: ModelProxy;
}

export declare function createUserAction(
  callback: (writes: WritesProxy) => void
): Promise<ChorusActionResponse>;

export interface ChorusActions {
  CreateUser(params: CreateUserParams): Promise<ChorusActionResponse>;
}

export const chorusActionMeta = {
  CreateUser: {
    className: 'App\\Actions\\ChorusActions\\CreateUserAction',
    allowOfflineWrites: true,
    supportsBatch: true,
  },
};

