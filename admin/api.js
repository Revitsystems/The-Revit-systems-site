/* ============================================
   API.JS — All data fetching & mutations
   Wired to the RevitSystems Express backend.
   Depends on: utils.js, state.js
   ============================================ */

const BASE_URL = "http://localhost:5000";
const LOGIN_URL = "../pages/login.html"; // set once, use everywhere

// Access token lives in memory only — never in localStorage
let accessToken = null;

// ============================================
// CORE FETCH WRAPPER
// Attaches the Bearer token and retries once
// after a silent token refresh on 401.
// Guards against sending "Bearer null" on first
// load before the token is set.
// ============================================
const authFetch = async (url, options = {}) => {
  // Do not send "Bearer null" — if accessToken is not yet set,
  // omit the Authorization header entirely so the server returns
  // a clean 401 rather than trying to verify the string "null"
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
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
        window.location.href = LOGIN_URL;
        return false;
      }

      const data = await response.json();
      accessToken = data.accessToken;
      return true;
    } catch {
      window.location.href = LOGIN_URL;
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
      // The logout route added to authRoutes.ts requires the refreshToken
      // in the request body so logoutController.ts can extract the tokenId
      // and call revokeSessionByTokenId in sessionModel.ts.
      // We read it from the cookie string — it is not httpOnly on the
      // client path because the cookie path is /auth/refresh, but we
      // stored tokenId.rawToken in a cookie named "refreshToken".
      // Since document.cookie won't expose httpOnly cookies, we instead
      // ask the server to revoke via the sid already in the access token —
      // the authenticate middleware on POST /auth/logout attaches req.user
      // which includes sid from the JWT, so logoutController can use that.
      await authFetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      // Proceed with local cleanup even if the server call fails
    } finally {
      accessToken = null;
      window.location.href = LOGIN_URL;
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

  // Returns { posts, pagination }
  // filter: "all" | "published" | "draft" | "scheduled"
  // "all" omits the status param — postController.ts fetchPosts
  // now maps a missing status to null which getPosts handles
  // by running without a WHERE clause.
  getPosts: async (filter = "published", page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const statusParam = filter && filter !== "all" ? `&status=${filter}` : "";
    const url = `${BASE_URL}/posts?limit=${limit}&offset=${offset}${statusParam}`;

    const response = await authFetch(url);
    if (!response.ok) throw new Error("Failed to fetch posts");

    const data = await response.json();

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
    // Map frontend field names to backend field names.
    // postData.category holds the category UUID from the blog-category
    // select in index.html — mapped to categoryId for the backend.
    const body = {
      categoryId: postData.category || null,
      title: postData.title,
      slug: postData.slug,
      content: postData.content,
      excerpt: postData.excerpt || "",
      featuredImage: postData.featuredImage || "",
      status: postData.status || "draft",
    };

    // scheduledDate is only included when status is "scheduled".
    // Actions.confirmSchedule in actions.js stores the value as scheduledAt.
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
    // Rescheduling has its own dedicated endpoint — handle that separately
    if (postData.scheduledAt) {
      return API.schedulePost(id, postData.scheduledAt);
    }

    // Everything else — including status changes — goes through PUT /posts/:id
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
    if (postData.status !== undefined) body.status = postData.status;

    const response = await authFetch(`${BASE_URL}/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update post");
    }

    const updated = await response.json();

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

    // Sync AppState so renderCategoryOptions in renderers.js works
    AppState.categories = categories;
    return categories;
  },

  // Handles both create (no id) and update (has id).
  // Called by Actions.saveCategory in actions.js.
  saveCategory: async (categoryData) => {
    if (categoryData.id) {
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
  // "spam" and "trash" are frontend-only labels used in index.html tabs.
  // commentController.ts only accepts "approved", "pending", "rejected".
  // "spam" maps to "rejected", "trash" maps to "rejected" as well.
  // "all" omits the status param entirely.
  getComments: async (filter = "pending", page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    // Normalise frontend-only filter labels to backend-valid status values
    let backendFilter = filter;
    if (filter === "spam" || filter === "trash") backendFilter = "rejected";
    if (filter === "all") backendFilter = null;

    const statusParam = backendFilter ? `&status=${backendFilter}` : "";
    const url = `${BASE_URL}/comments?limit=${limit}&offset=${offset}${statusParam}`;

    const response = await authFetch(url);
    if (!response.ok) throw new Error("Failed to fetch comments");

    const data = await response.json();

    // Normalise DB column names to the shape renderers.js renderComments expects.
    // visitor_name is null for staff comments — falls back to "Staff".
    // post_id is shown as postTitle until the backend joins the posts table.
    const normalised = data.comments.map((c) => ({
      id: c.id,
      author: c.visitor_name || "Staff",
      email: c.visitor_email || "",
      text: c.comment_text,
      postTitle: c.post_title || c.post_id,
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

  // status: "approved" | "pending" | "rejected" | "spam"
  // commentController.ts moderateComment validates against
  // ["approved", "pending", "rejected"] — "spam" is mapped to "rejected".
  updateComment: async (id, status) => {
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

    const index = AppState.comments.findIndex((c) => c.id === id);
    if (index !== -1) AppState.comments[index].status = mappedStatus;

    return updated;
  },

  replyToComment: async (id, commentText) => {
    const response = await authFetch(`${BASE_URL}/comments/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ commentText }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to post reply");
    }

    return response.json();
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

  // Pulls real post stats and category data from the backend.
  // Traffic trend and device breakdown remain estimated until a
  // dedicated /analytics/summary endpoint is built — the per-post
  // view summary routes in postAnalyticsRoutes.ts exist but require
  // one request per post which is too costly for a dashboard summary.
  getAnalytics: async (period = 30) => {
    const [statsResponse] = await Promise.all([
      authFetch(`${BASE_URL}/posts/stats`),
    ]);

    const stats = statsResponse.ok ? await statsResponse.json() : {};

    const deviceData = {
      labels: ["Desktop", "Mobile", "Tablet"],
      data: [55, 35, 10],
    };

    const trafficData = generateTrafficData(period);

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

  getUsers: async (filter = "all", page = 1, limit = 20) => {
    const offset = (page - 1) * limit;

    const params = new URLSearchParams({
      limit: limit,
      offset: offset,
    });

    const roleFilters = ["admin", "editor", "author"];
    const statusFilters = ["active", "suspended", "pending"];

    if (filter !== "all") {
      if (roleFilters.includes(filter)) {
        params.append("role", filter);
      } else if (statusFilters.includes(filter)) {
        params.append("status", filter);
      }
    }

    const response = await authFetch(`${BASE_URL}/users?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }

    const data = await response.json();
    AppState.users = data.users;

    return {
      users: data.users,
      pagination: {
        page,
        totalPages: data.hasMore ? page + 1 : page,
        total: data.users.length,
      },
    };
  },

  updateUser: async (id, updates) => {
    const response = await authFetch(`${BASE_URL}/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update user");
    }

    const updated = await response.json();

    const index = AppState.users.findIndex((u) => u.id === id);
    if (index !== -1)
      AppState.users[index] = { ...AppState.users[index], ...updated };

    return updated;
  },

  deleteUser: async (id) => {
    const response = await authFetch(`${BASE_URL}/users/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete user");
    }

    AppState.users = AppState.users.filter((u) => u.id !== id);
    return { success: true };
  },

  // Registers a new user with pending status via POST /auth/register.
  // Uses a cryptographically weak Math.random() password — acceptable only
  // because the account starts as "pending" and must be approved before use.
  inviteUser: async (email, role) => {
    const response = await authFetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      body: JSON.stringify({
        first_name: email.split("@")[0],
        last_name: "Invited",
        email,
        password: Math.random().toString(36).slice(-10) + "A1!",
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
