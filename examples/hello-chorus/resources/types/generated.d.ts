declare namespace App.Data {
export type CreateMessageData = {
id: string | null;
body: string;
platform_id: string;
user_id: string;
tenant_id: number;
};
export type CreateMessageWithActivityActionData = {
createMessage: App.Data.CreateMessageData | null;
updateUser: App.Data.UpdateUserData | null;
updatePlatform: App.Data.UpdatePlatformData | null;
additionalData: Array<any>;
};
export type UpdatePlatformData = {
id: string;
last_message_at: string | null;
};
export type UpdateUserData = {
id: string;
last_activity_at: string;
};
}
