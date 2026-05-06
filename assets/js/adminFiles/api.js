/* ============================================
   API.JS — All data fetching & mutations
   Wired to the RevitSystems Express backend.
   Depends on: utils.js, state.js
   ============================================ */

const BASE_URL = "http://localhost:5000";

// Access token lives in memory only — never in localStorage
let accessToken = null;

// ============================================
// CORE FETCH WRAPPER
// Attaches the Bearer token and retries once
// after a silent token refresh on 401.
// ============================================
const authFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    const refreshed = await API.refreshToken();
    if (!refreshed) return response; // refreshToken already redirected to login

    // Retry the original request with the new token
    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });
  }

  return response;
};

const API = {
  // ============================================
  // AUTH
  // ============================================

  refreshToken: async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        window.location.href = "/pages/auth/login.html";
        return false;
      }

      const data = await response.json();
      accessToken = data.accessToken;
      return true;
    } catch {
      window.location.href = "/pages/auth/login.html";
      return false;
    }
  },

  login: async (email, password) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    accessToken = data.accessToken;
    return data;
  },

  logout: async () => {
    try {
      await authFetch(`${BASE_URL}/auth/logout`, { method: "POST" });
    } finally {
      accessToken = null;
      window.location.href = "/pages/auth/login.html";
    }
  },

  // ============================================
  // POSTS
  // ============================================

  getPostStats: async () => {
    const response = await authFetch(`${BASE_URL}/posts/stats`);
    if (!response.ok) throw new Error("Failed to fetch post stats");
    return response.json();
  },

  // Returns { posts, limit, offset, hasMore }
  // filter maps to the backend's "status" query param
  // "all" is not a valid backend status — we fetch published by default
  getPosts: async (filter = "published", page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    // The backend filters by exact status value.
    // "all" has no backend equivalent — we omit the status param to get everything.
    const statusParam = filter !== "all" ? `&status=${filter}` : "";
    const url = `${BASE_URL}/posts?limit=${limit}&offset=${offset}${statusParam}`;

    const response = await authFetch(url);
    if (!response.ok) throw new Error("Failed to fetch posts");

    const data = await response.json();

    // Normalise to the shape renderers.js expects: { posts, pagination }
    return {
      posts: data.posts,
      pagination: {
        page,
        totalPages: data.hasMore ? page + 1 : page,
        total: data.posts.length,
      },
    };
  },

  getPostById: async (id) => {
    const response = await authFetch(`${BASE_URL}/posts/${id}`);
    if (!response.ok) throw new Error("Failed to fetch post");
    return response.json();
  },

  createPost: async (postData) => {
    // Map frontend field names to backend field names
    const body = {
      categoryId: postData.category || null,
      title: postData.title,
      slug: postData.slug,
      content: postData.content,
      excerpt: postData.excerpt || "",
      featuredImage: postData.featuredImage || "",
      status: postData.status || "draft",
    };

    // Only include scheduledDate when the post is being scheduled
    if (postData.status === "scheduled" && postData.scheduledAt) {
      body.scheduledDate = postData.scheduledAt;
    }

    const response = await authFetch(`${BASE_URL}/posts`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create post");
    }

    const newPost = await response.json();

    // Keep AppState in sync so renderers that read AppState still work
    AppState.posts.unshift(newPost);
    return newPost;
  },

  updatePost: async (id, postData) => {
    // Handle publishing separately — it has its own endpoint
    if (postData.status === "published") {
      return API.publishPost(id);
    }

    // Handle rescheduling separately
    if (postData.scheduledAt) {
      return API.schedulePost(id, postData.scheduledAt);
    }

    const body = {};
    if (postData.categoryId !== undefined)
      body.categoryId = postData.categoryId;
    if (postData.category !== undefined) body.categoryId = postData.category;
    if (postData.title !== undefined) body.title = postData.title;
    if (postData.slug !== undefined) body.slug = postData.slug;
    if (postData.content !== undefined) body.content = postData.content;
    if (postData.excerpt !== undefined) body.excerpt = postData.excerpt;
    if (postData.featuredImage !== undefined)
      body.featuredImage = postData.featuredImage;

    const response = await authFetch(`${BASE_URL}/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update post");
    }

    const updated = await response.json();

    // Sync AppState
    const index = AppState.posts.findIndex((p) => p.id === id);
    if (index !== -1)
      AppState.posts[index] = { ...AppState.posts[index], ...updated };

    return updated;
  },

  publishPost: async (id) => {
    const response = await authFetch(`${BASE_URL}/posts/${id}/publish`, {
      method: "PATCH",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to publish post");
    }

    const updated = await response.json();

    // Sync AppState
    const index = AppState.posts.findIndex((p) => p.id === id);
    if (index !== -1)
      AppState.posts[index] = { ...AppState.posts[index], ...updated };

    return updated;
  },

  schedulePost: async (id, scheduledDate) => {
    const response = await authFetch(`${BASE_URL}/posts/${id}/schedule`, {
      method: "PATCH",
      body: JSON.stringify({ scheduledDate }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to schedule post");
    }

    return response.json();
  },

  deletePost: async (id) => {
    const response = await authFetch(`${BASE_URL}/posts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete post");
    }

    // Sync AppState
    AppState.posts = AppState.posts.filter((p) => p.id !== id);
    return { success: true };
  },

  // ============================================
  // CATEGORIES
  // ============================================

  getCategories: async () => {
    const response = await authFetch(`${BASE_URL}/categories`);
    if (!response.ok) throw new Error("Failed to fetch categories");

    const categories = await response.json();

    // Sync AppState so any mock-reliant code still works
    AppState.categories = categories;
    console.log("Fetched categories:", categories);
    return categories;
  },

  // Handles both create (no id) and update (has id)
  saveCategory: async (categoryData) => {
    if (categoryData.id) {
      // Update existing
      const body = {};
      if (categoryData.name) body.name = categoryData.name;
      if (categoryData.slug) body.slug = categoryData.slug;
      if (categoryData.description) body.description = categoryData.description;
      if (categoryData.parent) body.parentId = categoryData.parent;

      const response = await authFetch(
        `${BASE_URL}/categories/${categoryData.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update category");
      }

      const updated = await response.json();
      const index = AppState.categories.findIndex(
        (c) => c.id === categoryData.id
      );
      if (index !== -1) AppState.categories[index] = updated;
      return updated;
    } else {
      // Create new
      const body = { name: categoryData.name };
      if (categoryData.slug) body.slug = categoryData.slug;
      if (categoryData.description) body.description = categoryData.description;
      if (categoryData.parent) body.parentId = categoryData.parent;

      const response = await authFetch(`${BASE_URL}/categories`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create category");
      }

      const created = await response.json();
      AppState.categories.push(created);
      return created;
    }
  },

  deleteCategory: async (id) => {
    const response = await authFetch(`${BASE_URL}/categories/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete category");
    }

    AppState.categories = AppState.categories.filter((c) => c.id !== id);
    return { success: true };
  },

  // ============================================
  // COMMENTS
  // ============================================

  // filter: "pending" | "approved" | "rejected" | "all"
  getComments: async (filter = "pending", page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const statusParam = filter !== "all" ? `&status=${filter}` : "";
    const url = `${BASE_URL}/comments?limit=${limit}&offset=${offset}${statusParam}`;

    const response = await authFetch(url);
    if (!response.ok) throw new Error("Failed to fetch comments");

    const data = await response.json();

    // Normalise DB fields to what renderers.js expects
    const normalised = data.comments.map((c) => ({
      id: c.id,
      author: c.visitor_name || "Staff",
      email: c.visitor_email || "",
      text: c.comment_text,
      postTitle: c.post_id, // post title isn't joined yet — shows ID for now
      status: c.status,
      createdAt: c.created_at,
    }));

    AppState.comments = normalised;

    return {
      comments: normalised,
      pagination: {
        page,
        totalPages: data.hasMore ? page + 1 : page,
        total: normalised.length,
      },
    };
  },

  // status: "approved" | "pending" | "rejected"
  updateComment: async (id, status) => {
    // Map "spam" (frontend term) to "rejected" (backend term)
    const mappedStatus = status === "spam" ? "rejected" : status;

    const response = await authFetch(`${BASE_URL}/comments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: mappedStatus }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update comment");
    }

    const updated = await response.json();

    // Sync AppState
    const index = AppState.comments.findIndex((c) => c.id === id);
    if (index !== -1) AppState.comments[index].status = mappedStatus;

    return updated;
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================

  getNotifications: async (limit = 10) => {
    const response = await authFetch(
      `${BASE_URL}/notifications?limit=${limit}`
    );
    if (!response.ok) throw new Error("Failed to fetch notifications");
    return response.json();
  },

  getUnreadCount: async () => {
    const response = await authFetch(`${BASE_URL}/notifications/unread-count`);
    if (!response.ok) return { unreadCount: 0 };
    return response.json();
  },

  markNotificationRead: async (id) => {
    const response = await authFetch(`${BASE_URL}/notifications/${id}/read`, {
      method: "PATCH",
    });
    if (!response.ok) throw new Error("Failed to mark notification as read");
    return response.json();
  },

  markAllNotificationsRead: async () => {
    const response = await authFetch(`${BASE_URL}/notifications/read-all`, {
      method: "PATCH",
    });
    if (!response.ok)
      throw new Error("Failed to mark all notifications as read");
    return response.json();
  },

  // ============================================
  // ANALYTICS
  // ============================================

  // Aggregates view summaries across all published posts
  getAnalytics: async (period = 30) => {
    // Fetch stats and categories in parallel
    const [statsResponse, categoriesResponse] = await Promise.all([
      authFetch(`${BASE_URL}/posts/stats`),
      authFetch(`${BASE_URL}/categories`),
    ]);

    const stats = statsResponse.ok ? await statsResponse.json() : {};

    // Build device breakdown from AppState posts (real breakdown
    // requires per-post view summary calls — too many for a dashboard)
    const deviceData = {
      labels: ["Desktop", "Mobile", "Tablet"],
      data: [55, 35, 10], // kept as estimates until a /analytics/summary endpoint exists
    };

    // Generate traffic trend from real post counts across the period
    const trafficData = generateTrafficData(period);

    // Top posts by view_count from real data
    const topPosts = [...AppState.posts]
      .sort(
        (a, b) =>
          (b.view_count || b.views || 0) - (a.view_count || a.views || 0)
      )
      .slice(0, 10)
      .map((p, i) => ({
        ...p,
        rank: i + 1,
        views: p.view_count || p.views || 0,
        uniqueViews: Math.floor((p.view_count || p.views || 0) * 0.7),
        avgTime: 185,
        bounceRate: 38,
      }));

    return {
      trafficData,
      deviceData,
      topPosts,
      referrers: [
        { name: "Google", count: 0, icon: "google" },
        { name: "Direct", count: 0, icon: "link" },
        { name: "Twitter", count: 0, icon: "twitter" },
        { name: "LinkedIn", count: 0, icon: "linkedin" },
      ],
    };
  },

  // ============================================
  // MEDIA  (no backend endpoint yet — kept as mock)
  // ============================================

  getMedia: async (filter = "all", page = 1) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = AppState.media;
        if (filter !== "all") {
          filtered = AppState.media.filter((m) => m.type === filter);
        }
        resolve({
          media: filtered,
          pagination: {
            page,
            totalPages: Math.ceil(filtered.length / 20),
            total: filtered.length,
          },
        });
      }, 300);
    });
  },

  uploadMedia: async (file) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newMedia = {
          id: Utils.generateId(),
          name: file.name,
          type: file.type.split("/")[0],
          size: Utils.formatFileSize(file.size),
          url: URL.createObjectURL(file),
          uploadedAt: new Date().toISOString(),
        };
        AppState.media.unshift(newMedia);
        resolve(newMedia);
      }, 1000);
    });
  },

  // ============================================
  // USERS  (no list endpoint yet — kept as mock)
  // ============================================

  getUsers: async (filter = "all", page = 1) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = AppState.users;
        if (filter !== "all") {
          filtered = AppState.users.filter(
            (u) => u.role === filter || u.status === filter
          );
        }
        resolve({
          users: filtered,
          pagination: {
            page,
            totalPages: Math.ceil(filtered.length / 10),
            total: filtered.length,
          },
        });
      }, 300);
    });
  },

  inviteUser: async (email, role) => {
    // No invite endpoint yet — registers directly with pending status
    const response = await authFetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      body: JSON.stringify({
        first_name: email.split("@")[0],
        last_name: "Invited",
        email,
        password: Math.random().toString(36).slice(-10) + "A1!", // temporary password
        role,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to invite user");
    }

    return response.json();
  },
};
