export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: Date;
}

export interface CreateNotificationInput {
  userId: string;
  type: string;
  message: string;
  link?: string;
}
