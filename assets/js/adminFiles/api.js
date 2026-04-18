/* ============================================
   API.JS — All data fetching & mutations
   Depends on: utils.js, state.js
   Replace mock implementations with real fetch() calls here.
   ============================================
   */ // In api.js - top of file
let accessToken = null; // lives in memory only

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
    return fetch(url, {
      // retry once with new token
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });
  }

  return response; // ← this was missing
};
const API = {
  refreshToken: async () => {
    try {
      const response = await fetch("http://localhost:5000/auth/refresh", {
        method: "POST",
        credentials: "include", // browser sends the httpOnly cookie automatically
      });

      if (!response.ok) {
        window.location.href = "/pages/auth/login.html";
        return false;
      }

      const data = await response.json();
      accessToken = data.accessToken; // restore token in memory
      return true;
    } catch (error) {
      // Network error or server down
      window.location.href = "/pages/auth/login.html";
      return false;
    }
  },
  // ==================
  // POSTS
  // ==================
  getPostStats: async () => {
    const response = await authFetch("http://localhost:5000/posts/stats");
    if (!response.ok) throw new Error("Failed to fetch stats");
    const stats = await response.json();
    console.log("Fetched post stats:", stats); // Debugging line
    return stats;
  },

  getPosts: async (filter = "all", page = 1, limit = 10) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = AppState.posts;
        if (filter !== "all") {
          filtered = AppState.posts.filter((p) => p.status === filter);
        }
        resolve({
          posts: filtered.slice((page - 1) * limit, page * limit),
          pagination: {
            page,
            totalPages: Math.ceil(filtered.length / limit),
            total: filtered.length,
          },
        });
      }, 300);
    });
  },

  createPost: async (postData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newPost = {
          id: Utils.generateId(),
          ...postData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        AppState.posts.unshift(newPost);
        resolve(newPost);
      }, 500);
    });
  },

  updatePost: async (id, postData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = AppState.posts.findIndex((p) => p.id === id);
        if (index !== -1) {
          AppState.posts[index] = {
            ...AppState.posts[index],
            ...postData,
            updatedAt: new Date().toISOString(),
          };
          resolve(AppState.posts[index]);
        }
      }, 500);
    });
  },

  deletePost: async (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        AppState.posts = AppState.posts.filter((p) => p.id !== id);
        resolve({ success: true });
      }, 500);
    });
  },

  // ==================
  // MEDIA
  // ==================
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

  // ==================
  // COMMENTS
  // ==================
  getComments: async (filter = "pending", page = 1) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = AppState.comments;
        if (filter !== "all") {
          filtered = AppState.comments.filter((c) => c.status === filter);
        }
        resolve({
          comments: filtered,
          pagination: {
            page,
            totalPages: Math.ceil(filtered.length / 10),
            total: filtered.length,
          },
        });
      }, 300);
    });
  },

  updateComment: async (id, status) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = AppState.comments.findIndex((c) => c.id === id);
        if (index !== -1) {
          AppState.comments[index].status = status;
          resolve(AppState.comments[index]);
        }
      }, 300);
    });
  },

  // ==================
  // USERS
  // ==================
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

  inviteUser: async (email, role, message) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newUser = {
          id: Utils.generateId(),
          email,
          role,
          status: "pending",
          invitedAt: new Date().toISOString(),
        };
        AppState.users.push(newUser);
        resolve(newUser);
      }, 500);
    });
  },

  // ==================
  // CATEGORIES & TAGS
  // ==================
  getCategories: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(AppState.categories);
      }, 300);
    });
  },

  saveCategory: async (categoryData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (categoryData.id) {
          const index = AppState.categories.findIndex(
            (c) => c.id === categoryData.id
          );
          AppState.categories[index] = {
            ...AppState.categories[index],
            ...categoryData,
          };
          resolve(AppState.categories[index]);
        } else {
          const newCategory = {
            id: Utils.generateId(),
            ...categoryData,
            count: 0,
          };
          AppState.categories.push(newCategory);
          resolve(newCategory);
        }
      }, 300);
    });
  },

  deleteCategory: async (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        AppState.categories = AppState.categories.filter((c) => c.id !== id);
        resolve({ success: true });
      }, 300);
    });
  },

  // ==================
  // ANALYTICS
  // ==================
  getAnalytics: async (period = 30) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          trafficData: generateTrafficData(period),
          deviceData: {
            labels: ["Desktop", "Mobile", "Tablet"],
            data: [55, 35, 10],
          },
          topPosts: AppState.posts.slice(0, 10).map((p, i) => ({
            ...p,
            rank: i + 1,
            uniqueViews: Math.floor(p.views * 0.7),
            avgTime: Math.floor(Math.random() * 300) + 60,
            bounceRate: Math.floor(Math.random() * 40) + 20,
          })),
          referrers: [
            { name: "Google", count: 15420, icon: "google" },
            { name: "Direct", count: 8930, icon: "link" },
            { name: "Twitter", count: 5420, icon: "twitter" },
            { name: "Facebook", count: 3890, icon: "facebook" },
            { name: "LinkedIn", count: 2150, icon: "linkedin" },
          ],
        });
      }, 500);
    });
  },
};
