export interface Comment {
  id: string;
  post_id: string;
  author_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  comment_text: string;
  status: "approved" | "rejected";
  parent_id: string | null;
  replied_by: string | null;
  replied_at: Date | null;
  created_at: Date;
}

export interface CreateStaffCommentInput {
  postId: string;
  commentText: string;
  parentId?: string;
}

export interface CreateGuestCommentInput {
  postId: string;
  visitorName: string;
  visitorEmail?: string;
  commentText: string;
  parentId?: string;
}

export interface UpdateCommentStatusInput {
  status: "approved" | "rejected";
}

export interface ReplyToCommentInput {
  commentText: string;
  parentId: string;
  postId: string;
}
