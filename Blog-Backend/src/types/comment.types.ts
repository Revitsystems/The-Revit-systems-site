export interface Comment {
  id: string;
  post_id: string;
  author_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  comment_text: string;
  // "pending" is the default status for guest comments (set in commentModel.ts).
  // "rejected" is used by moderateComment in commentController.ts.
  // All three values are validated in the validStatuses array in commentController.ts.
  status: "approved" | "pending" | "rejected";
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
  // Matches the validStatuses array in commentController.ts moderateComment handler
  status: "approved" | "pending" | "rejected";
}

export interface ReplyToCommentInput {
  commentText: string;
  parentId: string;
  postId: string;
}
