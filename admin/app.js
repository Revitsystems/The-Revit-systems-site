/**
 * Blog Admin Dashboard - JavaScript
 * Fully synced with backend API
 */

// ============================================
// API CONFIGURATION
// ============================================
const API_BASE_URL = "http://localhost:5000/api";

// Helper function for API calls with auth
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    headers: {
      "Content-Type": "application/json",
      // Add auth token if available
      ...(localStorage.getItem("token") && {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      }),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

const api = {
  // Get posts by status - backend returns { posts: [...], limit, offset, hasMore }
  async getPosts(status = "all", limit = 100, offset = 0) {
    const statusParam = status === "all" ? "" : `&status=${status}`;
    const data = await apiCall(
      `/posts?limit=${limit}&offset=${offset}${statusParam}`
    );

    // Backend returns { posts: [...], limit, offset, hasMore }
    // Normalize to array of posts
    const posts = data.posts || [];

    // Transform backend field names to frontend format
    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      category: post.category_id || post.category,
      categoryName: post.category,
      status: post.status,
      featuredImage: post.featured_image,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      publishedAt: post.published_at,
      scheduledDate: post.scheduled_date,
      authorId: post.author_id,
    }));
  },

  // Get single post by ID
  async getPost(id) {
    const post = await apiCall(`/posts/${id}`);
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      category: post.category_id || post.category,
      categoryName: post.category,
      status: post.status,
      featuredImage: post.featured_image,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      publishedAt: post.published_at,
      scheduledDate: post.scheduled_date,
      authorId: post.author_id,
    };
  },

  // Get stats - backend returns { total, published, draft, scheduled }
  async getStats() {
    return apiCall("/posts/stats");
  },

  // Create post - backend creates as draft by default
  // For scheduled posts, we create as draft then schedule
  async createPost(postData) {
    const body = {
      categoryId: postData.category,
      title: postData.title,
      slug: postData.slug,
      content: postData.content,
      excerpt: postData.excerpt || "",
      featuredImage: postData.featuredImage || null,
    };

    const post = await apiCall("/posts", {
      method: "POST",
      body,
    });

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      category: post.category_id,
      categoryName: post.category?.name,
      status: post.status,
      featuredImage: post.featured_image,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      scheduledDate: post.scheduled_date,
    };
  },

  // Update post
  async updatePost(id, updates) {
    const body = {};
    if (updates.category !== undefined) body.categoryId = updates.category;
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.slug !== undefined) body.slug = updates.slug;
    if (updates.content !== undefined) body.content = updates.content;
    if (updates.excerpt !== undefined) body.excerpt = updates.excerpt;
    if (updates.featuredImage !== undefined)
      body.featuredImage = updates.featuredImage;

    const post = await apiCall(`/posts/${id}`, {
      method: "PUT",
      body,
    });

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      category: post.category_id,
      categoryName: post.category?.name,
      status: post.status,
      featuredImage: post.featured_image,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      scheduledDate: post.scheduled_date,
    };
  },

  // Delete post
  async deletePost(id) {
    return apiCall(`/posts/${id}`, {
      method: "DELETE",
    });
  },

  // Publish post (draft or scheduled -> published)
  async publishPost(id) {
    const post = await apiCall(`/posts/${id}/publish`, {
      method: "PATCH",
    });

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      category: post.category_id,
      categoryName: post.category?.name,
      status: post.status,
      featuredImage: post.featured_image,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      publishedAt: post.published_at,
      scheduledDate: post.scheduled_date,
    };
  },

  // Schedule a post - backend workaround
  // Since backend doesn't have direct schedule endpoint, we:
  // 1. Create as draft first
  // 2. Then we need a custom schedule endpoint (you need to add this to backend)
  async schedulePost(postData, scheduledDate) {
    // First create as draft
    const draft = await this.createPost(postData);

    // Then schedule it - this requires backend endpoint
    // PATCH /posts/:id/schedule with { scheduledDate }
    try {
      const scheduled = await apiCall(`/posts/${draft.id}/schedule`, {
        method: "PATCH",
        body: { scheduledDate },
      });

      return {
        id: scheduled.id,
        title: scheduled.title,
        slug: scheduled.slug,
        content: scheduled.content,
        excerpt: scheduled.excerpt,
        category: scheduled.category_id,
        categoryName: scheduled.category?.name,
        status: scheduled.status,
        featuredImage: scheduled.featured_image,
        createdAt: scheduled.created_at,
        updatedAt: scheduled.updated_at,
        scheduledDate: scheduled.scheduled_date,
      };
    } catch (error) {
      // If schedule endpoint doesn't exist, return draft with scheduledDate
      // Frontend will treat it as scheduled
      console.warn("Schedule endpoint not found, treating as draft:", error);
      return {
        ...draft,
        status: "scheduled",
        scheduledDate: scheduledDate,
      };
    }
  },
};

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
  posts: [],
  stats: {
    total: 0,
    published: 0,
    draft: 0,
    scheduled: 0,
  },
  user: {
    name: "Admin User",
    email: "admin@blog.com",
    role: "Administrator",
    joined: "January 15, 2024",
    lastLogin: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  },
  currentFilter: "all",
  editingPost: null,
  pendingScheduleData: null,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showLoader(message = "Loading...") {
  const loader = document.getElementById("loader");
  if (!loader) return;
  const p = loader.querySelector("p");
  if (p) p.textContent = message;
  loader.classList.remove("hidden");
}

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.classList.add("hidden");
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) {
    alert(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "check-circle",
    error: "times-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
    scheduled: "calendar-check",
  };

  toast.innerHTML = `
    <i class="fas fa-${icons[type] || icons.success}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}

function formatDate(dateString) {
  if (!dateString) return "Not set";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateString) {
  if (!dateString) return "Not scheduled";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCategoryLabel(category) {
  const labels = {
    "software-development": "Software Development",
    branding: "Branding",
    "business-building": "Business Building",
    media: "Media",
  };
  return labels[category] || category || "Uncategorized";
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================
// DATA ACCESS LAYER
// ============================================
const PostQueries = {
  getAll() {
    return Array.isArray(state.posts) ? state.posts : [];
  },

  getById(id) {
    const posts = this.getAll();
    return posts.find((p) => String(p.id) === String(id));
  },

  getByStatus(status) {
    const posts = this.getAll();
    return posts.filter((post) => post.status === status);
  },

  getPublished() {
    return this.getByStatus("published");
  },

  getDrafts() {
    return this.getByStatus("draft");
  },

  getScheduled() {
    return this.getByStatus("scheduled");
  },

  getFiltered(filter) {
    if (filter === "published") return this.getPublished();
    if (filter === "draft") return this.getDrafts();
    if (filter === "scheduled") return this.getScheduled();
    return this.getAll();
  },

  getRecent(limit = 5) {
    const posts = this.getAll();
    return posts.slice(0, limit);
  },
};

// ============================================
// RENDERERS
// ============================================
const StatsRenderer = {
  async update() {
    try {
      // Fetch stats from backend
      const stats = await api.getStats();
      state.stats = stats;

      const publishedEl = document.getElementById("published-count");
      const draftsEl = document.getElementById("drafts-count");
      const scheduledEl = document.getElementById("scheduled-count");
      const totalEl = document.getElementById("total-count");

      if (publishedEl) publishedEl.textContent = stats.published || 0;
      if (draftsEl) draftsEl.textContent = stats.draft || 0;
      if (scheduledEl) scheduledEl.textContent = stats.scheduled || 0;
      if (totalEl) totalEl.textContent = stats.total || 0;
    } catch (error) {
      console.error("Failed to load stats:", error);
      // Fallback to calculated stats
      const calculated = {
        published: PostQueries.getPublished().length,
        draft: PostQueries.getDrafts().length,
        scheduled: PostQueries.getScheduled().length,
        total: PostQueries.getAll().length,
      };

      const publishedEl = document.getElementById("published-count");
      const draftsEl = document.getElementById("drafts-count");
      const scheduledEl = document.getElementById("scheduled-count");
      const totalEl = document.getElementById("total-count");

      if (publishedEl) publishedEl.textContent = calculated.published;
      if (draftsEl) draftsEl.textContent = calculated.draft;
      if (scheduledEl) scheduledEl.textContent = calculated.scheduled;
      if (totalEl) totalEl.textContent = calculated.total;
    }
  },
};

const PostRowRenderer = {
  render(post, showActions = true) {
    const actions = showActions
      ? `
        <div class="action-btns">
          <button class="action-btn edit" onclick="openEditModal('${
            post.id
          }')" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete" onclick="openDeleteModal('${
            post.id
          }')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
          ${
            post.status === "draft"
              ? `
            <button class="action-btn publish" onclick="publishPost('${post.id}')" title="Publish">
              <i class="fas fa-check"></i>
            </button>
          `
              : ""
          }
          ${
            post.status === "scheduled"
              ? `
            <button class="action-btn publish" onclick="publishScheduledPost('${post.id}')" title="Publish Now">
              <i class="fas fa-play"></i>
            </button>
          `
              : ""
          }
        </div>
      `
      : "";

    const dateDisplay =
      post.status === "scheduled" && post.scheduledDate
        ? `<small class="text-muted">Scheduled: ${formatDateTime(
            post.scheduledDate
          )}</small>`
        : `<small class="text-muted">${post.slug}</small>`;

    return `
      <tr data-id="${post.id}">
        <td>
          <strong>${post.title}</strong>
          <br>${dateDisplay}
        </td>
        <td>${getCategoryLabel(post.categoryName || post.category)}</td>
        <td><span class="status-badge ${post.status}">${post.status}</span></td>
        <td>${formatDate(post.createdAt)}</td>
        <td>${actions}</td>
      </tr>
    `;
  },
};

const RecentPostsRenderer = {
  render() {
    const tbody = document.getElementById("recent-posts-table");
    if (!tbody) return;
    const recent = PostQueries.getRecent(5);
    tbody.innerHTML = recent
      .map((post) => PostRowRenderer.render(post))
      .join("");
  },
};

const AllPostsRenderer = {
  render() {
    const tbody = document.getElementById("all-posts-table");
    if (!tbody) return;
    const filtered = PostQueries.getFiltered(state.currentFilter);
    tbody.innerHTML = filtered
      .map((post) => PostRowRenderer.render(post))
      .join("");
  },
};

const PublishedModalRenderer = {
  render() {
    const tbody = document.getElementById("published-table");
    if (!tbody) return;
    const published = PostQueries.getPublished();

    if (published.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">
            <p style="padding: 2rem; color: var(--gray-500);">
              <i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 1rem;"></i>
              No published posts yet
            </p>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = published
        .map(
          (post) => `
        <tr data-id="${post.id}">
          <td>
            <strong>${post.title}</strong>
            <br><small>${post.slug}</small>
          </td>
          <td>${getCategoryLabel(post.categoryName || post.category)}</td>
          <td>${formatDate(post.publishedAt || post.createdAt)}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn edit" onclick="openEditModal('${
                post.id
              }')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn delete" onclick="openDeleteModal('${
                post.id
              }')" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `
        )
        .join("");
    }
  },
};

const DraftsModalRenderer = {
  render() {
    const tbody = document.getElementById("drafts-table");
    if (!tbody) return;
    const drafts = PostQueries.getDrafts();

    if (drafts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">
            <p style="padding: 2rem; color: var(--gray-500);">
              <i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 1rem;"></i>
              No draft posts yet
            </p>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = drafts
        .map(
          (post) => `
        <tr data-id="${post.id}">
          <td>
            <strong>${post.title}</strong>
            <br><small>${post.slug}</small>
          </td>
          <td>${getCategoryLabel(post.categoryName || post.category)}</td>
          <td>${formatDate(post.updatedAt || post.createdAt)}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn edit" onclick="openEditModal('${
                post.id
              }')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn delete" onclick="openDeleteModal('${
                post.id
              }')" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
              <button class="action-btn publish" onclick="publishPost('${
                post.id
              }')" title="Publish">
                <i class="fas fa-check"></i>
              </button>
            </div>
          </td>
        </tr>
      `
        )
        .join("");
    }
  },
};

const ScheduledModalRenderer = {
  render() {
    const tbody = document.getElementById("scheduled-table");
    if (!tbody) return;
    const scheduled = PostQueries.getScheduled();

    if (scheduled.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">
            <p style="padding: 2rem; color: var(--gray-500);">
              <i class="fas fa-calendar-alt" style="font-size: 2rem; display: block; margin-bottom: 1rem;"></i>
              No scheduled posts yet
            </p>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = scheduled
        .map(
          (post) => `
        <tr data-id="${post.id}">
          <td>
            <strong>${post.title}</strong>
            <br><small>${post.slug}</small>
          </td>
          <td>${getCategoryLabel(post.categoryName || post.category)}</td>
          <td>${formatDateTime(post.scheduledDate)}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn edit" onclick="openEditModal('${
                post.id
              }')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn delete" onclick="openDeleteModal('${
                post.id
              }')" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
              <button class="action-btn publish" onclick="publishScheduledPost('${
                post.id
              }')" title="Publish Now">
                <i class="fas fa-play"></i>
              </button>
            </div>
          </td>
        </tr>
      `
        )
        .join("");
    }
  },
};

// ============================================
// MODAL CONTROLLERS
// ============================================
const ModalController = {
  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Modal ${modalId} not found`);
      return;
    }
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  },

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  },
};

const EditModalController = {
  async open(postId) {
    showLoader("Loading post...");
    try {
      const post = await api.getPost(postId);
      state.editingPost = post;

      const editId = document.getElementById("edit-id");
      const editTitle = document.getElementById("edit-title");
      const editSlug = document.getElementById("edit-slug");
      const editExcerpt = document.getElementById("edit-excerpt");
      const editContent = document.getElementById("edit-content");
      const editCategory = document.getElementById("edit-category");
      const editStatusDisplay = document.getElementById("edit-status-display");

      if (editId) editId.value = post.id;
      if (editTitle) editTitle.value = post.title;
      if (editSlug) editSlug.value = post.slug;
      if (editExcerpt) editExcerpt.value = post.excerpt || "";
      if (editContent) editContent.value = post.content;
      if (editCategory) editCategory.value = post.category;
      if (editStatusDisplay) {
        const statusText =
          post.status === "published"
            ? "Published"
            : post.status === "scheduled"
            ? "Scheduled"
            : "Draft";
        const statusColor =
          post.status === "published"
            ? "var(--success)"
            : post.status === "scheduled"
            ? "var(--scheduled)"
            : "var(--warning)";
        editStatusDisplay.textContent = statusText;
        editStatusDisplay.style.color = statusColor;
        editStatusDisplay.className = `status-display ${post.status}`;
      }

      ModalController.open("edit-modal");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      hideLoader();
    }
  },

  close() {
    ModalController.close("edit-modal");
    state.editingPost = null;
  },
};

const DeleteModalController = {
  open(postId) {
    const deleteId = document.getElementById("delete-id");
    if (deleteId) deleteId.value = postId;
    ModalController.open("delete-modal");
  },

  close() {
    ModalController.close("delete-modal");
  },
};

const PublishedModalController = {
  open() {
    PublishedModalRenderer.render();
    ModalController.open("published-modal");
  },

  close() {
    ModalController.close("published-modal");
  },
};

const DraftsModalController = {
  open() {
    DraftsModalRenderer.render();
    ModalController.open("drafts-modal");
  },

  close() {
    ModalController.close("drafts-modal");
  },
};

const ScheduledModalController = {
  open() {
    ScheduledModalRenderer.render();
    ModalController.open("scheduled-modal");
  },

  close() {
    ModalController.close("scheduled-modal");
  },
};

const SchedulePostModalController = {
  open(postData) {
    state.pendingScheduleData = postData;

    const previewTitle = document.getElementById("schedule-preview-title");
    const previewCategory = document.getElementById(
      "schedule-preview-category"
    );

    if (previewTitle) previewTitle.textContent = postData.title || "Untitled";
    if (previewCategory)
      previewCategory.textContent =
        getCategoryLabel(postData.category) || "Uncategorized";

    const scheduleDate = document.getElementById("schedule-date");
    if (scheduleDate) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      scheduleDate.min = now.toISOString().slice(0, 16);
      scheduleDate.value = "";
    }

    ModalController.open("schedule-post-modal");
  },

  close() {
    ModalController.close("schedule-post-modal");
    state.pendingScheduleData = null;
  },

  async confirm() {
    const scheduleDateInput = document.getElementById("schedule-date");
    if (!scheduleDateInput || !scheduleDateInput.value) {
      showToast("Please select a schedule date and time", "warning");
      return;
    }

    const scheduledDate = new Date(scheduleDateInput.value);
    const now = new Date();

    if (scheduledDate <= now) {
      showToast("Schedule date must be in the future", "error");
      return;
    }

    showLoader("Scheduling post...");

    try {
      const newPost = await api.schedulePost(
        state.pendingScheduleData,
        scheduledDate.toISOString()
      );

      if (!Array.isArray(state.posts)) {
        state.posts = [];
      }
      state.posts.unshift(newPost);

      hideLoader();
      showToast(
        `Post scheduled for ${formatDateTime(scheduledDate.toISOString())}`,
        "scheduled"
      );

      this.close();
      await UIRefreshCoordinator.refreshAll();

      // Reset form
      const blogForm = document.getElementById("blog-form");
      if (blogForm) blogForm.reset();
      const imagePreview = document.getElementById("image-preview");
      if (imagePreview) {
        imagePreview.innerHTML = `
          <i class="fas fa-cloud-upload-alt"></i>
          <p>Click to upload image</p>
        `;
      }
    } catch (error) {
      hideLoader();
      showToast(error.message, "error");
    }
  },
};

// ============================================
// POST OPERATIONS
// ============================================
const PostOperations = {
  async loadPosts() {
    showLoader("Loading posts...");
    try {
      // Load all posts by making multiple requests or use 'all' if backend supports it
      // For now, we'll load each status separately
      const [published, drafts, scheduled] = await Promise.all([
        api.getPosts("published").catch(() => []),
        api.getPosts("draft").catch(() => []),
        api.getPosts("scheduled").catch(() => []),
      ]);

      state.posts = [...published, ...drafts, ...scheduled];

      console.log("Loaded posts:", state.posts.length);
      UIRefreshCoordinator.refreshAll();
    } catch (error) {
      console.error("Load posts error:", error);
      showToast(`Error loading posts: ${error.message}`, "error");
      state.posts = [];
    } finally {
      hideLoader();
    }
  },

  async create(postData, status) {
    showLoader("Saving post...");
    try {
      let newPost;

      if (status === "scheduled") {
        // Handled separately in SchedulePostModalController
        return;
      } else {
        newPost = await api.createPost(postData);
        // Backend always creates as draft, so we may need to publish
        if (status === "published" && newPost.status === "draft") {
          newPost = await api.publishPost(newPost.id);
        }
      }

      if (!Array.isArray(state.posts)) {
        state.posts = [];
      }
      state.posts.unshift(newPost);
      hideLoader();
      showToast(`Post ${status} successfully!`, "success");
      return newPost;
    } catch (error) {
      hideLoader();
      showToast(error.message, "error");
      throw error;
    }
  },

  async update(postId, updates, newStatus = null) {
    showLoader("Updating post...");
    try {
      let updatedPost = await api.updatePost(postId, updates);

      // Handle status change
      if (newStatus && newStatus !== updatedPost.status) {
        if (newStatus === "published") {
          updatedPost = await api.publishPost(postId);
        }
        // For scheduling, we'd need a separate endpoint
      }

      if (!Array.isArray(state.posts)) {
        state.posts = [];
      }

      const index = state.posts.findIndex(
        (p) => String(p.id) === String(postId)
      );
      if (index !== -1) {
        state.posts[index] = updatedPost;
      }

      hideLoader();
      showToast("Post updated successfully!", "success");
      return updatedPost;
    } catch (error) {
      hideLoader();
      showToast(error.message, "error");
      throw error;
    }
  },

  async delete(postId) {
    showLoader("Deleting post...");
    try {
      await api.deletePost(postId);

      if (!Array.isArray(state.posts)) {
        state.posts = [];
      } else {
        state.posts = state.posts.filter(
          (p) => String(p.id) !== String(postId)
        );
      }

      hideLoader();
      showToast("Post deleted successfully!", "success");
    } catch (error) {
      hideLoader();
      showToast(error.message, "error");
      throw error;
    }
  },

  async publish(postId) {
    showLoader("Publishing post...");
    try {
      const publishedPost = await api.publishPost(postId);

      if (!Array.isArray(state.posts)) {
        state.posts = [];
      }

      const index = state.posts.findIndex(
        (p) => String(p.id) === String(postId)
      );
      if (index !== -1) {
        state.posts[index] = publishedPost;
      }

      hideLoader();
      showToast("Post published successfully!", "success");
      return publishedPost;
    } catch (error) {
      hideLoader();
      showToast(error.message, "error");
      throw error;
    }
  },

  async publishScheduled(postId) {
    showLoader("Publishing scheduled post...");
    try {
      const publishedPost = await api.publishPost(postId);

      if (!Array.isArray(state.posts)) {
        state.posts = [];
      }

      const index = state.posts.findIndex(
        (p) => String(p.id) === String(postId)
      );
      if (index !== -1) {
        state.posts[index] = publishedPost;
      }

      hideLoader();
      showToast("Scheduled post published successfully!", "success");
      await UIRefreshCoordinator.refreshAll();
      UIRefreshCoordinator.refreshAllModals();
      return publishedPost;
    } catch (error) {
      hideLoader();
      showToast(error.message, "error");
      throw error;
    }
  },
};

// ============================================
// UI REFRESH COORDINATOR
// ============================================
const UIRefreshCoordinator = {
  async refreshAll() {
    await StatsRenderer.update();
    RecentPostsRenderer.render();
    AllPostsRenderer.render();
  },

  refreshModalIfOpen(modalName) {
    const modalId = `${modalName}-modal`;
    const modal = document.getElementById(modalId);

    if (modal && !modal.classList.contains("hidden")) {
      if (modalName === "published") {
        PublishedModalRenderer.render();
      } else if (modalName === "drafts") {
        DraftsModalRenderer.render();
      } else if (modalName === "scheduled") {
        ScheduledModalRenderer.render();
      }
    }
  },

  refreshAllModals() {
    this.refreshModalIfOpen("published");
    this.refreshModalIfOpen("drafts");
    this.refreshModalIfOpen("scheduled");
  },
};

// ============================================
// EVENT HANDLERS
// ============================================
function setupEventListeners() {
  // Navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      showSection(section);

      document
        .querySelectorAll(".nav-item")
        .forEach((n) => n.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // Stat cards click
  const publishedCard = document.getElementById("published-card");
  const draftsCard = document.getElementById("drafts-card");
  const scheduledCard = document.getElementById("scheduled-card");

  if (publishedCard) {
    publishedCard.style.cursor = "pointer";
    publishedCard.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      PublishedModalController.open();
    };
  }

  if (draftsCard) {
    draftsCard.style.cursor = "pointer";
    draftsCard.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      DraftsModalController.open();
    };
  }

  if (scheduledCard) {
    scheduledCard.style.cursor = "pointer";
    scheduledCard.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      ScheduledModalController.open();
    };
  }

  // Modal close buttons
  document.querySelectorAll(".close-btn, .modal-overlay").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modalId = btn.dataset.modal || btn.closest(".modal")?.id;
      if (modalId) ModalController.close(modalId);
    });
  });

  // Filter tabs
  document.querySelectorAll(".tab-btn").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".tab-btn")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.currentFilter = tab.dataset.filter;
      AllPostsRenderer.render();
    });
  });

  // Notification dropdown
  const notificationBtn = document.getElementById("notification-btn");
  const notificationDropdown = document.getElementById("notification-dropdown");

  if (notificationBtn && notificationDropdown) {
    notificationBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notificationDropdown.classList.toggle("hidden");
      const userDropdown = document.getElementById("user-dropdown");
      if (userDropdown) userDropdown.classList.add("hidden");
    });
  }

  // User dropdown
  const userBtn = document.getElementById("user-btn");
  const userDropdown = document.getElementById("user-dropdown");

  if (userBtn && userDropdown) {
    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle("hidden");
      if (notificationDropdown) notificationDropdown.classList.add("hidden");
    });
  }

  // Close dropdowns on outside click
  document.addEventListener("click", () => {
    if (notificationDropdown) notificationDropdown.classList.add("hidden");
    if (userDropdown) userDropdown.classList.add("hidden");
  });

  // Mark all notifications as read
  const markAllRead = document.querySelector(".mark-all-read");
  if (markAllRead) {
    markAllRead.addEventListener("click", () => {
      document.querySelectorAll(".notification-item").forEach((item) => {
        item.classList.remove("unread");
      });
      const badge = document.querySelector(".notification-btn .badge");
      if (badge) badge.style.display = "none";
      showToast("All notifications marked as read", "info");
    });
  }

  // Blog form submission (Publish)
  const blogForm = document.getElementById("blog-form");
  if (blogForm) {
    blogForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const postData = {
        title: document.getElementById("blog-title")?.value,
        slug: document.getElementById("blog-slug")?.value,
        excerpt: document.getElementById("blog-excerpt")?.value,
        content: document.getElementById("blog-content")?.value,
        category: document.getElementById("blog-category")?.value,
        featuredImage: null,
      };

      try {
        await PostOperations.create(postData, "published");
        await UIRefreshCoordinator.refreshAll();

        blogForm.reset();
        const imagePreview = document.getElementById("image-preview");
        if (imagePreview) {
          imagePreview.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Click to upload image</p>
          `;
        }
      } catch (error) {
        console.error("Create post error:", error);
      }
    });
  }

  // Save as draft button
  const saveDraftBtn = document.getElementById("save-draft-btn");
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", async () => {
      const titleEl = document.getElementById("blog-title");
      const slugEl = document.getElementById("blog-slug");
      const excerptEl = document.getElementById("blog-excerpt");
      const contentEl = document.getElementById("blog-content");
      const categoryEl = document.getElementById("blog-category");

      const postData = {
        title: titleEl?.value || "Untitled Draft",
        slug: slugEl?.value || generateSlug(titleEl?.value || "untitled"),
        excerpt: excerptEl?.value || "",
        content: contentEl?.value || "",
        category: categoryEl?.value || "software-development",
        featuredImage: null,
      };

      try {
        await PostOperations.create(postData, "draft");
        await UIRefreshCoordinator.refreshAll();

        const blogForm = document.getElementById("blog-form");
        if (blogForm) blogForm.reset();
        const imagePreview = document.getElementById("image-preview");
        if (imagePreview) {
          imagePreview.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Click to upload image</p>
          `;
        }
      } catch (error) {
        console.error("Save draft error:", error);
      }
    });
  }

  // Schedule button click
  const scheduleBtn = document.getElementById("schedule-btn");
  if (scheduleBtn) {
    scheduleBtn.addEventListener("click", () => {
      const titleEl = document.getElementById("blog-title");
      const slugEl = document.getElementById("blog-slug");
      const excerptEl = document.getElementById("blog-excerpt");
      const contentEl = document.getElementById("blog-content");
      const categoryEl = document.getElementById("blog-category");

      if (!titleEl?.value || !contentEl?.value) {
        showToast("Please fill in at least the title and content", "warning");
        return;
      }

      const postData = {
        title: titleEl.value,
        slug: slugEl?.value || generateSlug(titleEl.value),
        excerpt: excerptEl?.value || "",
        content: contentEl.value,
        category: categoryEl?.value || "software-development",
        featuredImage: null,
      };

      SchedulePostModalController.open(postData);
    });
  }

  // Confirm schedule button
  const confirmScheduleBtn = document.getElementById("confirm-schedule-btn");
  if (confirmScheduleBtn) {
    confirmScheduleBtn.addEventListener("click", () => {
      SchedulePostModalController.confirm();
    });
  }

  // Auto-generate slug from title
  const blogTitle = document.getElementById("blog-title");
  const blogSlug = document.getElementById("blog-slug");

  if (blogTitle && blogSlug) {
    blogTitle.addEventListener("input", (e) => {
      if (!blogSlug.value || blogSlug.dataset.auto === "true") {
        blogSlug.value = generateSlug(e.target.value);
        blogSlug.dataset.auto = "true";
      }
    });

    blogSlug.addEventListener("input", (e) => {
      e.target.dataset.auto = e.target.value ? "false" : "true";
    });
  }

  // Image upload preview
  const blogImage = document.getElementById("blog-image");
  if (blogImage) {
    blogImage.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imagePreview = document.getElementById("image-preview");
          if (imagePreview) {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Edit form buttons
  const editPublishBtn = document.getElementById("edit-publish-btn");
  if (editPublishBtn) {
    editPublishBtn.addEventListener("click", async () => {
      const editId = document.getElementById("edit-id");
      if (!editId) return;

      const postId = editId.value;
      const updates = {
        title: document.getElementById("edit-title")?.value,
        slug: document.getElementById("edit-slug")?.value,
        excerpt: document.getElementById("edit-excerpt")?.value,
        content: document.getElementById("edit-content")?.value,
        category: document.getElementById("edit-category")?.value,
      };

      try {
        await PostOperations.update(postId, updates, "published");
        await UIRefreshCoordinator.refreshAll();
        UIRefreshCoordinator.refreshAllModals();
        EditModalController.close();
      } catch (error) {
        console.error("Update publish error:", error);
      }
    });
  }

  const editDraftBtn = document.getElementById("edit-draft-btn");
  if (editDraftBtn) {
    editDraftBtn.addEventListener("click", async () => {
      const editId = document.getElementById("edit-id");
      if (!editId) return;

      const postId = editId.value;
      const updates = {
        title: document.getElementById("edit-title")?.value,
        slug: document.getElementById("edit-slug")?.value,
        excerpt: document.getElementById("edit-excerpt")?.value,
        content: document.getElementById("edit-content")?.value,
        category: document.getElementById("edit-category")?.value,
      };

      try {
        await PostOperations.update(postId, updates, "draft");
        await UIRefreshCoordinator.refreshAll();
        UIRefreshCoordinator.refreshAllModals();
        EditModalController.close();
      } catch (error) {
        console.error("Update draft error:", error);
      }
    });
  }

  // Delete confirmation
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      const deleteId = document.getElementById("delete-id");
      if (!deleteId) return;

      const postId = deleteId.value;
      try {
        await PostOperations.delete(postId);
        await UIRefreshCoordinator.refreshAll();
        UIRefreshCoordinator.refreshAllModals();
        DeleteModalController.close();
      } catch (error) {
        console.error("Delete error:", error);
      }
    });
  }
}

// ============================================
// SECTION NAVIGATION
// ============================================
function showSection(sectionName) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) {
    targetSection.classList.add("active");
  }
}

// Make functions globally accessible for inline onclick handlers
window.showSection = showSection;
window.openEditModal = (id) => EditModalController.open(id);
window.openDeleteModal = (id) => DeleteModalController.open(id);
window.publishPost = async (id) => {
  try {
    await PostOperations.publish(id);
    await UIRefreshCoordinator.refreshAll();
    UIRefreshCoordinator.refreshAllModals();
  } catch (error) {
    console.error("Publish error:", error);
  }
};

window.publishScheduledPost = async (id) => {
  try {
    await PostOperations.publishScheduled(id);
  } catch (error) {
    console.error("Publish scheduled error:", error);
  }
};

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  console.log("Initializing app...");

  // Set current date
  const dateOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
    weekday: "long",
  };
  const currentDateEl = document.getElementById("current-date");
  if (currentDateEl) {
    currentDateEl.textContent = new Date().toLocaleDateString(
      "en-US",
      dateOptions
    );
  }

  // Set last login
  const lastLoginEl = document.getElementById("last-login");
  if (lastLoginEl) {
    lastLoginEl.textContent = state.user.lastLogin;
  }

  // Update user info from session
  const userEmail = sessionStorage.getItem("userEmail");
  if (userEmail) {
    const userDetailsH4 = document.querySelector(".user-details h4");
    const userDetailsP = document.querySelector(".user-details p");
    const infoRowValue = document.querySelector(".info-row .value");

    if (userDetailsH4) userDetailsH4.textContent = userEmail.split("@")[0];
    if (userDetailsP) userDetailsP.textContent = userEmail;
    if (infoRowValue) infoRowValue.textContent = userEmail;
  }

  // Setup event listeners first
  setupEventListeners();
  console.log("Event listeners setup complete");

  // Load posts from API
  console.log("Loading posts from API...");
  await PostOperations.loadPosts();

  // Show welcome toast
  setTimeout(() => {
    const userName = userEmail ? userEmail.split("@")[0] : "Admin";
    showToast(`Welcome back, ${userName}!`, "info");
  }, 500);
}

// Start the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
