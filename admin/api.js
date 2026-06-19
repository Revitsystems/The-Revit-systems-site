/* ============================================
   API.JS — All data fetching & mutations
   Wired to the RevitSystems Express backend.
   Depends on: utils.js, state.js, cache.js
   ============================================ */

const BASE_URL = window.baseURL;
const LOGIN_URL = "../pages/login.html"; // set once, use everywhere

// Access token lives in memory only — never in localStorage
let accessToken = null;

// ============================================
// FETCH WITH TIMEOUT
// Render's free tier can take 30-50s to wake up from a cold start.
// Without an explicit timeout, a single hung request can make the
// whole app *look* like it's frozen with no feedback. Aborting after
// a bounded window turns "hangs forever" into "fails predictably",
// which the rest of the error-handling chain can then act on.
// ============================================
const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

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

  const response = await fetchWithTimeout(url, {
    ...options,
    credentials: "include",
    headers,
  });

  if (response.status === 401) {
    const result = await API.refreshToken();

    if (!result.ok) {
      // Either already redirected to login (bad session), or the
      // refresh endpoint itself is unreachable/erroring. Either way
      // there is no new token to retry with — return the original
      // 401 so the caller's existing catch/error-toast logic handles
      // it instead of silently hanging.
      return response;
    }

    // Retry the original request with the new token
    return fetchWithTimeout(url, {
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

  // Returns a structured result instead of a plain boolean so callers
  // (app.js init, authFetch above) can tell apart three distinct outcomes:
  //   { ok: true }                              — refreshed, accessToken is live
  //   { ok: false, redirected: true }           — bad session, already sent to login
  //   { ok: false, redirected: false, reason }  — backend unreachable/erroring,
  //                                                caller must show its own error UI
  refreshToken: async (retriesLeft = 1) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        accessToken = data.accessToken;
        return { ok: true };
      }

      // 401/403 = the backend explicitly says this session is invalid
      // (no cookie, expired/revoked session, suspended/pending user).
      // That's the only case where bouncing to the login page is correct.
      if (response.status === 401 || response.status === 403) {
        window.location.href = LOGIN_URL;
        return { ok: false, redirected: true };
      }

      // Anything else (503 from a DB hiccup, etc.) is transient — retry
      // once before giving up, and never redirect for it.
      if (retriesLeft > 0) {
        await new Promise((r) => setTimeout(r, 1000));
        return API.refreshToken(retriesLeft - 1);
      }

      console.error("Refresh failed after retry:", response.status);
      return {
        ok: false,
        redirected: false,
        reason: `Server returned ${response.status}`,
      };
    } catch (err) {
      if (retriesLeft > 0) {
        await new Promise((r) => setTimeout(r, 1000));
        return API.refreshToken(retriesLeft - 1);
      }
      // AbortError = our own fetchWithTimeout abort, almost always a cold/sleeping backend
      const reason =
        err.name === "AbortError"
          ? "Request timed out — the server may be waking up. Please retry."
          : err.message || "Network error";
      console.error("Refresh network error:", err);
      return { ok: false, redirected: false, reason };
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
      await authFetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      // Proceed with local cleanup even if the server call fails
    } finally {
      accessToken = null;
      Cache.clear(); // wipe all cached data on logout
      window.location.href = LOGIN_URL;
    }
  },

  // "Who am I" — cached for the session duration
  // force=true bypasses the cache (used by the profile reload button)
  getCurrentUser: async (force = false) => {
    const key = "currentUser";
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const response = await authFetch(`${BASE_URL}/auth/me`);
    if (!response.ok) throw new Error("Failed to fetch current user");
    const data = await response.json();
    Cache.set(key, data, "currentUser");
    return data;
  },

  // ============================================
  // POSTS
  // ============================================

  // force=true skips the cache — used by the reload button
  getPostStats: async (force = false) => {
    const key = "postStats";
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const response = await authFetch(`${BASE_URL}/posts/stats`);
    if (!response.ok) throw new Error("Failed to fetch post stats");
    const data = await response.json();
    Cache.set(key, data, "postStats");
    return data;
  },

  // Returns { posts, pagination }
  // filter: "all" | "published" | "draft" | "scheduled"
  getPosts: async (
    filter = "published",
    page = 1,
    limit = 10,
    force = false
  ) => {
    const key = `posts:${filter}:${page}:${limit}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const offset = (page - 1) * limit;
    const statusParam = filter && filter !== "all" ? `&status=${filter}` : "";
    const url = `${BASE_URL}/posts?limit=${limit}&offset=${offset}${statusParam}`;

    const response = await authFetch(url);
    if (!response.ok) throw new Error("Failed to fetch posts");

    const data = await response.json();
    const result = {
      posts: data.posts,
      pagination: {
        page,
        totalPages: data.hasMore ? page + 1 : page,
        total: data.posts.length,
      },
    };

    Cache.set(key, result, "posts");
    return result;
  },

  getPostById: async (id, force = false) => {
    const key = `posts:id:${id}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const response = await authFetch(`${BASE_URL}/posts/${id}`);
    if (!response.ok) throw new Error("Failed to fetch post");
    const data = await response.json();
    Cache.set(key, data, "posts");
    return data;
  },

  createPost: async (postData) => {
    const body = {
      categoryId: postData.category || null,
      title: postData.title,
      slug: postData.slug,
      content: postData.content,
      excerpt: postData.excerpt || "",
      featuredImage: postData.featuredImage || "",
      status: postData.status || "draft",
    };

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
    AppState.posts.unshift(newPost);

    // New post changes counts and the list — invalidate both
    Cache.invalidateMany("posts", "postStats");
    return newPost;
  },

  updatePost: async (id, postData) => {
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

    // Status may have changed — invalidate list and stats
    Cache.invalidateMany("posts", "postStats");
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

    Cache.invalidateMany("posts", "postStats");
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

    Cache.invalidateMany("posts", "postStats");
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
    Cache.invalidateMany("posts", "postStats");
    return { success: true };
  },

  // ============================================
  // CATEGORIES
  // ============================================

  getCategories: async (force = false) => {
    const key = "categories";
    if (!force) {
      const cached = Cache.get(key);
      if (cached) {
        AppState.categories = cached;
        return cached;
      }
    }

    const response = await authFetch(`${BASE_URL}/categories`);
    if (!response.ok) throw new Error("Failed to fetch categories");

    const categories = await response.json();
    AppState.categories = categories;
    Cache.set(key, categories, "categories");
    return categories;
  },

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

      // Changing a category also affects post list display
      Cache.invalidateMany("categories", "posts");
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
      Cache.invalidate("categories");
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
    // Deleting a category un-categorizes posts — invalidate both
    Cache.invalidateMany("categories", "posts");
    return { success: true };
  },

  // ============================================
  // COMMENTS
  // ============================================

  getComments: async (
    filter = "pending",
    page = 1,
    limit = 10,
    force = false
  ) => {
    // Normalise frontend-only filter labels to backend-valid status values
    let backendFilter = filter;
    if (filter === "spam" || filter === "trash") backendFilter = "rejected";
    if (filter === "all") backendFilter = null;

    const key = `comments:${backendFilter ?? "all"}:${page}:${limit}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) {
        AppState.comments = cached.comments;
        return cached;
      }
    }

    const offset = (page - 1) * limit;
    const statusParam = backendFilter ? `&status=${backendFilter}` : "";
    const url = `${BASE_URL}/comments?limit=${limit}&offset=${offset}${statusParam}`;

    const response = await authFetch(url);
    if (!response.ok) throw new Error("Failed to fetch comments");

    const data = await response.json();

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

    const result = {
      comments: normalised,
      pagination: {
        page,
        totalPages: data.hasMore ? page + 1 : page,
        total: normalised.length,
      },
    };

    Cache.set(key, result, "comments");
    return result;
  },

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

    // Status changed — all comment filter pages are potentially stale
    Cache.invalidate("comments");
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

    // A new reply shows up in the approved list
    Cache.invalidate("comments");
    return response.json();
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================

  getNotifications: async (limit = 10, force = false) => {
    const key = `notifications:${limit}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const response = await authFetch(
      `${BASE_URL}/notifications?limit=${limit}`
    );
    if (!response.ok) throw new Error("Failed to fetch notifications");
    const data = await response.json();
    Cache.set(key, data, "notifications");
    return data;
  },

  getUnreadCount: async (force = false) => {
    const key = "notifications:unreadCount";
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const response = await authFetch(`${BASE_URL}/notifications/unread-count`);
    if (!response.ok) return { unreadCount: 0 };
    const data = await response.json();
    Cache.set(key, data, "notifications");
    return data;
  },

  markNotificationRead: async (id) => {
    const response = await authFetch(`${BASE_URL}/notifications/${id}/read`, {
      method: "PATCH",
    });
    if (!response.ok) throw new Error("Failed to mark notification as read");
    Cache.invalidate("notifications");
    return response.json();
  },

  markAllNotificationsRead: async () => {
    const response = await authFetch(`${BASE_URL}/notifications/read-all`, {
      method: "PATCH",
    });
    if (!response.ok)
      throw new Error("Failed to mark all notifications as read");
    Cache.invalidate("notifications");
    return response.json();
  },

  // ============================================
  // ANALYTICS
  // ============================================

  getAnalytics: async (period = 30, force = false) => {
    const key = `postStats:analytics:${period}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

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

    const result = {
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

    Cache.set(key, result, "postStats");
    return result;
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
  // USERS
  // ============================================

  getUsers: async (filter = "all", page = 1, limit = 20, force = false) => {
    const key = `users:${filter}:${page}:${limit}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) {
        AppState.users = cached.users;
        return cached;
      }
    }

    const offset = (page - 1) * limit;
    const params = new URLSearchParams({ limit, offset });

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
    if (!response.ok) throw new Error("Failed to fetch users");

    const data = await response.json();
    AppState.users = data.users;

    const result = {
      users: data.users,
      pagination: {
        page,
        totalPages: data.hasMore ? page + 1 : page,
        total: data.users.length,
      },
    };

    Cache.set(key, result, "users");
    return result;
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

    Cache.invalidate("users");
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
    Cache.invalidate("users");
    return { success: true };
  },

  // Registers a new user with pending status via POST /auth/register.
  inviteUser: async (email, role) => {
    const response = await authFetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      body: JSON.stringify({
        first_name: email.split("@")[0],/* ============================================
   API.JS — All data fetching & mutations
   Wired to the RevitSystems Express backend.
   Depends on: utils.js, state.js, cache.js
   ============================================ */

const BASE_URL = window.baseURL;
const LOGIN_URL = "../pages/login.html"; // set once, use everywhere

// Access token lives in memory only — never in localStorage
let accessToken = null;

// ============================================
// FETCH WITH TIMEOUT
// Render's free tier can take 30-50s to wake up from a cold start.
// Without an explicit timeout, a single hung request can make the
// whole app *look* like it's frozen with no feedback. Aborting after
// a bounded window turns "hangs forever" into "fails predictably",
// which the rest of the error-handling chain can then act on.
// ============================================
const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

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

  const response = await fetchWithTimeout(url, {
    ...options,
    credentials: "include",
    headers,
  });

  if (response.status === 401) {
    const result = await API.refreshToken();

    if (!result.ok) {
      // Either already redirected to login (bad session), or the
      // refresh endpoint itself is unreachable/erroring. Either way
      // there is no new token to retry with — return the original
      // 401 so the caller's existing catch/error-toast logic handles
      // it instead of silently hanging.
      return response;
    }

    // Retry the original request with the new token
    return fetchWithTimeout(url, {
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

  // Returns a structured result instead of a plain boolean so callers
  // (app.js init, authFetch above) can tell apart three distinct outcomes:
  //   { ok: true }                              — refreshed, accessToken is live
  //   { ok: false, redirected: true }           — bad session, already sent to login
  //   { ok: false, redirected: false, reason }  — backend unreachable/erroring,
  //                                                caller must show its own error UI
  refreshToken: async (retriesLeft = 1) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        accessToken = data.accessToken;
        return { ok: true };
      }

      // 401/403 = the backend explicitly says this session is invalid
      // (no cookie, expired/revoked session, suspended/pending user).
      // That's the only case where bouncing to the login page is correct.
      if (response.status === 401 || response.status === 403) {
        window.location.href = LOGIN_URL;
        return { ok: false, redirected: true };
      }

      // Anything else (503 from a DB hiccup, etc.) is transient — retry
      // once before giving up, and never redirect for it.
      if (retriesLeft > 0) {
        await new Promise((r) => setTimeout(r, 1000));
        return API.refreshToken(retriesLeft - 1);
      }

      console.error("Refresh failed after retry:", response.status);
      return {
        ok: false,
        redirected: false,
        reason: `Server returned ${response.status}`,
      };
    } catch (err) {
      if (retriesLeft > 0) {
        await new Promise((r) => setTimeout(r, 1000));
        return API.refreshToken(retriesLeft - 1);
      }
      // AbortError = our own fetchWithTimeout abort, almost always a cold/sleeping backend
      const reason =
        err.name === "AbortError"
          ? "Request timed out — the server may be waking up. Please retry."
          : err.message || "Network error";
      console.error("Refresh network error:", err);
      return { ok: false, redirected: false, reason };
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
      await authFetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      // Proceed with local cleanup even if the server call fails
    } finally {
      accessToken = null;
      Cache.clear(); // wipe all cached data on logout
      window.location.href = LOGIN_URL;
    }
  },

  // "Who am I" — cached for the session duration
  // force=true bypasses the cache (used by the profile reload button)
  getCurrentUser: async (force = false) => {
    const key = "currentUser";
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const response = await authFetch(`${BASE_URL}/auth/me`);
    if (!response.ok) throw new Error("Failed to fetch current user");
    const data = await response.json();
    Cache.set(key, data, "currentUser");
    return data;
  },

  // ============================================
  // POSTS
  // ============================================

  // force=true skips the cache — used by the reload button
  getPostStats: async (force = false) => {
    const key = "postStats";
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const response = await authFetch(`${BASE_URL}/posts/stats`);
    if (!response.ok) throw new Error("Failed to fetch post stats");
    const data = await response.json();
    Cache.set(key, data, "postStats");
    return data;
  },

  // Returns { posts, pagination }
  // filter: "all" | "published" | "draft" | "scheduled"
  getPosts: async (
    filter = "published",
    page = 1,
    limit = 10,
    force = false
  ) => {
    const key = `posts:${filter}:${page}:${limit}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const offset = (page - 1) * limit;
    const statusParam = filter && filter !== "all" ? `&status=${filter}` : "";
    const url = `${BASE_URL}/posts?limit=${limit}&offset=${offset}${statusParam}`;

    const response = await authFetch(url);
    if (!response.ok) throw new Error("Failed to fetch posts");

    const data = await response.json();
    const result = {
      posts: data.posts,
      pagination: {
        page,
        totalPages: data.hasMore ? page + 1 : page,
        total: data.posts.length,
      },
    };

    Cache.set(key, result, "posts");
    return result;
  },

  getPostById: async (id, force = false) => {
    const key = `posts:id:${id}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const response = await authFetch(`${BASE_URL}/posts/${id}`);
    if (!response.ok) throw new Error("Failed to fetch post");
    const data = await response.json();
    Cache.set(key, data, "posts");
    return data;
  },

  createPost: async (postData) => {
    const body = {
      categoryId: postData.category || null,
      title: postData.title,
      slug: postData.slug,
      content: postData.content,
      excerpt: postData.excerpt || "",
      featuredImage: postData.featuredImage || "",
      status: postData.status || "draft",
    };

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
    AppState.posts.unshift(newPost);

    // New post changes counts and the list — invalidate both
    Cache.invalidateMany("posts", "postStats");
    return newPost;
  },

  updatePost: async (id, postData) => {
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

    // Status may have changed — invalidate list and stats
    Cache.invalidateMany("posts", "postStats");
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

    Cache.invalidateMany("posts", "postStats");
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

    Cache.invalidateMany("posts", "postStats");
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
    Cache.invalidateMany("posts", "postStats");
    return { success: true };
  },

  // ============================================
  // CATEGORIES
  // ============================================

  getCategories: async (force = false) => {
    const key = "categories";
    if (!force) {
      const cached = Cache.get(key);
      if (cached) {
        AppState.categories = cached;
        return cached;
      }
    }

    const response = await authFetch(`${BASE_URL}/categories`);
    if (!response.ok) throw new Error("Failed to fetch categories");

    const categories = await response.json();
    AppState.categories = categories;
    Cache.set(key, categories, "categories");
    return categories;
  },

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

      // Changing a category also affects post list display
      Cache.invalidateMany("categories", "posts");
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
      Cache.invalidate("categories");
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
    // Deleting a category un-categorizes posts — invalidate both
    Cache.invalidateMany("categories", "posts");
    return { success: true };
  },

  // ============================================
  // COMMENTS
  // ============================================

  getComments: async (
    filter = "pending",
    page = 1,
    limit = 10,
    force = false
  ) => {
    // Normalise frontend-only filter labels to backend-valid status values
    let backendFilter = filter;
    if (filter === "spam" || filter === "trash") backendFilter = "rejected";
    if (filter === "all") backendFilter = null;

    const key = `comments:${backendFilter ?? "all"}:${page}:${limit}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) {
        AppState.comments = cached.comments;
        return cached;
      }
    }

    const offset = (page - 1) * limit;
    const statusParam = backendFilter ? `&status=${backendFilter}` : "";
    const url = `${BASE_URL}/comments?limit=${limit}&offset=${offset}${statusParam}`;

    const response = await authFetch(url);
    if (!response.ok) throw new Error("Failed to fetch comments");

    const data = await response.json();

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

    const result = {
      comments: normalised,
      pagination: {
        page,
        totalPages: data.hasMore ? page + 1 : page,
        total: normalised.length,
      },
    };

    Cache.set(key, result, "comments");
    return result;
  },

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

    // Status changed — all comment filter pages are potentially stale
    Cache.invalidate("comments");
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

    // A new reply shows up in the approved list
    Cache.invalidate("comments");
    return response.json();
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================

  getNotifications: async (limit = 10, force = false) => {
    const key = `notifications:${limit}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const response = await authFetch(
      `${BASE_URL}/notifications?limit=${limit}`
    );
    if (!response.ok) throw new Error("Failed to fetch notifications");
    const data = await response.json();
    Cache.set(key, data, "notifications");
    return data;
  },

  getUnreadCount: async (force = false) => {
    const key = "notifications:unreadCount";
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

    const response = await authFetch(`${BASE_URL}/notifications/unread-count`);
    if (!response.ok) return { unreadCount: 0 };
    const data = await response.json();
    Cache.set(key, data, "notifications");
    return data;
  },

  markNotificationRead: async (id) => {
    const response = await authFetch(`${BASE_URL}/notifications/${id}/read`, {
      method: "PATCH",
    });
    if (!response.ok) throw new Error("Failed to mark notification as read");
    Cache.invalidate("notifications");
    return response.json();
  },

  markAllNotificationsRead: async () => {
    const response = await authFetch(`${BASE_URL}/notifications/read-all`, {
      method: "PATCH",
    });
    if (!response.ok)
      throw new Error("Failed to mark all notifications as read");
    Cache.invalidate("notifications");
    return response.json();
  },

  // ============================================
  // ANALYTICS
  // ============================================

  getAnalytics: async (period = 30, force = false) => {
    const key = `postStats:analytics:${period}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) return cached;
    }

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

    const result = {
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

    Cache.set(key, result, "postStats");
    return result;
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
  // USERS
  // ============================================

  getUsers: async (filter = "all", page = 1, limit = 20, force = false) => {
    const key = `users:${filter}:${page}:${limit}`;
    if (!force) {
      const cached = Cache.get(key);
      if (cached) {
        AppState.users = cached.users;
        return cached;
      }
    }

    const offset = (page - 1) * limit;
    const params = new URLSearchParams({ limit, offset });

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
    if (!response.ok) throw new Error("Failed to fetch users");

    const data = await response.json();
    AppState.users = data.users;

    const result = {
      users: data.users,
      pagination: {
        page,
        totalPages: data.hasMore ? page + 1 : page,
        total: data.users.length,
      },
    };

    Cache.set(key, result, "users");
    return result;
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

    Cache.invalidate("users");
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
    Cache.invalidate("users");
    return { success: true };
  },

  // Registers a new user with pending status via POST /auth/register.
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

    // New user should appear in the list on next load
    Cache.invalidate("users");
    return response.json();
  },
};
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

    // New user should appear in the list on next load
    Cache.invalidate("users");
    return response.json();
  },
};

