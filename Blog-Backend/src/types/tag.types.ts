export interface Tag {
  id: string;
  name: string;
  created_at: Date;
}

export interface CreateTagInput {
  name: string;
}

export interface AttachTagsInput {
  postId: string;
  tagIds: string[];
}
