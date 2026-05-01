export interface Category {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  parent_id: string | null;
  created_at: Date;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
}
