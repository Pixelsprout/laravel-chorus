// Auto-generated TypeScript interfaces for Chorus Actions
// Generated on 2025-08-14 21:26:28

export interface SimpleCreateMessageParams {
  messages.create?: string;
}

export interface DeleteMessageParams {
  id: string;
}

export interface CreateMessageWithActivityParams {
  messages.create?: string;
  users.update: string;
  platforms.update?: string;
}

export interface UpdateMessageParams {
  id: string;
  message: string;
}

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

