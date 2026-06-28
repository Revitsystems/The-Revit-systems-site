/* ============================================
   RENDERERS.JS — All DOM rendering logic
   Depends on: utils.js, state.js, api.js, cache.js

   Every renderer that hits the network accepts an optional
   `force` boolean. When true it bypasses the cache so the
   reload button always fetches fresh data.
   ============================================ */

// ─── shared reload-button helper ──────────────────────────────────────────────
// Spins the icon while the async fn runs, then restores it.
// Usage: Renderers._withReloadSpin(btn, () => Renderers.renderPostsTable(true))
const _runReload = async (btn, asyncFn) => {
  const icon = btn.querySelector("i");
  if (icon) icon.classList.add("fa-spin");
  btn.disabled = true;
  try {
    await asyncFn();
  } finally {
    if (icon) icon.classList.remove("fa-spin");
    btn.disabled = false;
  }
};

const Renderers = {
  // ==================
  // DASHBOARD
  // ==================

  // Pulls real post stats from the backend via API.getPostStats in api.js.
  // force=true used by the dashboard reload button.
  updateDashboardStats: async (force = false) => {
    try {
      const stats = await API.getPostStats(force);

      document.getElementById("published-count").textContent =
        stats.published || 0;
      document.getElementById("drafts-count").textContent = stats.draft || 0;
      document.getElementById("scheduled-count").textContent =
        stats.scheduled || 0;
      document.getElementById("total-count").textContent = stats.total || 0;
    } catch {
      // Fall back to AppState counts if the request fails
      const published = AppState.posts.filter(
        (p) => p.status === "published"
      ).length;
      const drafts = AppState.posts.filter((p) => p.status === "draft").length;
      const scheduled = AppState.posts.filter(
        (p) => p.status === "scheduled"
      ).length;

      document.getElementById("published-count").textContent = published;
      document.getElementById("drafts-count").textContent = drafts;
      document.getElementById("scheduled-count").textContent = scheduled;
      document.getElementById("total-count").textContent =
        AppState.posts.length;
    }
  },

  renderRecentPosts: () => {
    const tbody = document.getElementById("recent-posts-table");
    const recent = AppState.posts.slice(0, 5);

    tbody.innerHTML = recent
      .map(
        (post) => `
      <tr>
        <td>${post.title}</td>
        <td>${post.category || post.category_id || "—"}</td>
        <td><span class="status-badge ${post.status}">${post.status}</span></td>
        <td>${Utils.formatDate(post.created_at || post.createdAt)}</td>
        <td>${Utils.formatNumber(post.view_count || post.views || 0)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" onclick="Actions.editPost('${
              post.id
            }')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" onclick="Actions.deletePost('${
              post.id
            }')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  },

  renderTopPosts: () => {
    const container = document.getElementById("top-posts-list");
    const sorted = [...AppState.posts]
      .sort(
        (a, b) =>
          (b.view_count || b.views || 0) - (a.view_count || a.views || 0)
      )
      .slice(0, 5);

    container.innerHTML = sorted
      .map(
        (post, index) => `
      <div class="top-post-item">
        <div class="top-post-rank ${index < 3 ? "top-3" : ""}">${
          index + 1
        }</div>
        <div class="top-post-info">
          <div class="top-post-title">${post.title}</div>
          <div class="top-post-meta">${
            post.category || "—"
          } • ${Utils.formatDate(post.created_at || post.createdAt)}</div>
        </div>
        <div class="top-post-views">
          <div class="top-post-views-count">${Utils.formatNumber(
            post.view_count || post.views || 0
          )}</div>
          <div class="top-post-views-label">views</div>
        </div>
      </div>
    `
      )
      .join("");
  },

  // ─── reload the entire dashboard section ─────────────────────────────────
  reloadDashboard: async (force = true) => {
    await Promise.allSettled([
      Renderers.updateDashboardStats(force),
      Renderers.renderNotifications(force),
    ]);
    Renderers.renderRecentPosts();
    Renderers.renderTopPosts();
    await Renderers.renderAnalytics(force);
  },

  // ==================
  // POSTS
  // ==================
  renderPostsTable: async (force = false) => {
    const tbody = document.getElementById("all-posts-table");
    Utils.showLoader();

    try {
      const response = await API.getPosts(
        AppState.filters.posts,
        AppState.pagination.posts.page,
        10,
        force
      );

      // Keep AppState in sync so dashboard and top posts renderers work
      AppState.posts = response.posts;

      tbody.innerHTML = response.posts
        .map(
          (post) => `
        <tr>
          <td>${post.title}</td>
          <td>${post.category || post.category_id || "—"}</td>
          <td><span class="status-badge ${post.status}">${
            post.status
          }</span></td>
          <td>${
            post.status === "scheduled"
              ? Utils.formatDateTime(post.scheduled_date || post.scheduledAt)
              : Utils.formatDate(post.created_at || post.createdAt)
          }</td>
          <td>${Utils.formatNumber(post.view_count || post.views || 0)}</td>
          <td>
            <div class="action-btns">
              ${
                post.status === "draft"
                  ? `<button class="action-btn publish" onclick="Actions.publishPost('${post.id}')" title="Publish">
                      <i class="fas fa-check"></i>
                    </button>`
                  : ""
              }
              ${
                post.status === "scheduled"
                  ? `<button class="action-btn schedule" onclick="Actions.editSchedule('${post.id}')" title="Edit Schedule">
                      <i class="fas fa-calendar"></i>
                    </button>`
                  : ""
              }
              <button class="action-btn edit" onclick="Actions.editPost('${
                post.id
              }')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn delete" onclick="Actions.deletePost('${
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

      AppState.pagination.posts = response.pagination;

      Renderers.renderPagination(
        "posts-pagination",
        response.pagination,
        (page) => {
          AppState.pagination.posts.page = page;
          Renderers.renderPostsTable();
        }
      );
    } catch (error) {
      Utils.showToast("Failed to load posts", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  // ==================
  // MEDIA
  // ==================
  renderMediaGrid: async () => {
    const grid = document.getElementById("media-grid");
    const list = document.getElementById("media-list-body");
    Utils.showLoader();

    try {
      const response = await API.getMedia(AppState.filters.media);

      grid.innerHTML = response.media
        .map(
          (item) => `
        <div class="media-item" data-id="${item.id}" onclick="Actions.selectMedia('${item.id}')">
          <img src="${item.url}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/150'">
          <div class="media-item-overlay">
            <div class="media-item-name">${item.name}</div>
          </div>
        </div>
      `
        )
        .join("");

      list.innerHTML = response.media
        .map(
          (item) => `
        <tr>
          <td><img src="${
            item.url
          }" alt="" style="width:50px;height:50px;object-fit:cover;border-radius:4px;"></td>
          <td>${item.name}</td>
          <td>${item.type}</td>
          <td>${item.size}</td>
          <td>${Utils.formatDate(item.uploadedAt)}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn edit" onclick="Actions.viewMedia('${
                item.id
              }')">
                <i class="fas fa-eye"></i>
              </button>
              <button class="action-btn delete" onclick="Actions.deleteMedia('${
                item.id
              }')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `
        )
        .join("");

      AppState.pagination.media = response.pagination;
    } catch (error) {
      Utils.showToast("Failed to load media", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  // ==================
  // COMMENTS
  // ==================
  renderComments: async (force = false) => {
    const container = document.getElementById("comments-list");
    Utils.showLoader();

    try {
      const response = await API.getComments(
        AppState.filters.comments,
        AppState.pagination.comments.page,
        10,
        force
      );

      if (response.comments.length === 0) {
        container.innerHTML = `
          <div class="comment-item" style="justify-content:center;padding:2rem;color:var(--gray-500);">
            No comments found.
          </div>`;
        return;
      }

      container.innerHTML = response.comments
        .map(
          (comment) => `
        <div class="comment-item">
          <input type="checkbox" class="comment-checkbox" data-id="${
            comment.id
          }">
          <div class="comment-avatar">
            <i class="fas fa-user"></i>
          </div>
          <div class="comment-content">
            <div class="comment-header">
              <div>
                <span class="comment-author">${comment.author}</span>
                <span class="comment-meta">${
                  comment.email || "Staff"
                } • ${Utils.formatDateTime(comment.createdAt)}</span>
              </div>
              <span class="status-badge ${comment.status}">${
            comment.status
          }</span>
            </div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-post">on <strong>${
              comment.postTitle
            }</strong></div>
            <div class="comment-actions">
              ${
                comment.status !== "approved"
                  ? `<button class="approve-btn" onclick="Actions.approveComment('${comment.id}')">
                      <i class="fas fa-check"></i> Approve
                    </button>`
                  : ""
              }
              <button class="reply-btn" onclick="Actions.replyComment('${
                comment.id
              }')">
                <i class="fas fa-reply"></i> Reply
              </button>
              <button class="spam-btn" onclick="Actions.markSpam('${
                comment.id
              }')">
                <i class="fas fa-ban"></i> Spam
              </button>
            </div>
          </div>
        </div>
      `
        )
        .join("");

      AppState.pagination.comments = response.pagination;

      Renderers.renderPagination(
        "comments-pagination",
        response.pagination,
        (page) => {
          AppState.pagination.comments = {
            ...AppState.pagination.comments,
            page,
          };
          Renderers.renderComments();
        }
      );
    } catch (error) {
      console.error("renderComments error:", error);
      container.innerHTML = `
        <div class="comment-item" style="justify-content:center;padding:2rem;color:var(--gray-500);">
          Failed to load comments: ${error.message}
        </div>`;
      Utils.showToast(`Failed to load comments: ${error.message}`, "error");
    } finally {
      Utils.hideLoader();
    }
  },

  // ==================
  // USERS
  // ==================
  renderUsers: async (force = false) => {
    const tbody = document.getElementById("users-table-body");
    if (!tbody) return;

    Utils.showLoader();

    try {
      const data = await API.getUsers(
        AppState.filters.users,
        AppState.pagination.users.page,
        20,
        force
      );

      if (data.users.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center;padding:2rem;color:var(--gray-500);">
              No users found.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.users
        .map((user) => {
          const fullName = `${user.first_name} ${user.last_name}`;
          const statusColor =
            user.status === "active"
              ? "approved"
              : user.status === "suspended"
              ? "spam"
              : "pending";

          return `
          <tr>
            <td><input type="checkbox" class="user-checkbox" data-id="${
              user.id
            }" /></td>
            <td>
              <div class="user-cell">
                <div class="user-cell-avatar">
                  <i class="fas fa-user"></i>
                </div>
                <div class="user-cell-info">
                  <span class="user-cell-name">${fullName}</span>
                  <span class="user-cell-email">${user.email}</span>
                </div>
              </div>
            </td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td><span class="status-badge ${statusColor}">${
            user.status
          }</span></td>
            <td>—</td>
            <td>${Utils.formatDate(user.created_at)}</td>
            <td>${
              user.last_login ? Utils.formatDate(user.last_login) : "Never"
            }</td>
            <td>
              <div class="action-btns">
                <button class="action-btn edit" title="Edit user" onclick="Actions.editUser('${
                  user.id
                }')">
                  <i class="fas fa-edit"></i>
                </button>
                ${
                  user.status !== "active"
                    ? `<button class="action-btn approve" title="Approve user" onclick="Actions.approveUser('${user.id}')">
                        <i class="fas fa-check"></i>
                      </button>`
                    : `<button class="action-btn reject" title="Suspend user" onclick="Actions.suspendUser('${user.id}')">
                        <i class="fas fa-ban"></i>
                      </button>`
                }
                <button class="action-btn delete" title="Delete user" onclick="Actions.deleteUser('${
                  user.id
                }')">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
        })
        .join("");

      AppState.pagination.users = data.pagination;

      Renderers.renderPagination(
        "users-pagination",
        data.pagination,
        (page) => {
          AppState.pagination.users.page = page;
          Renderers.renderUsers();
        }
      );
    } catch (error) {
      Utils.showToast("Failed to load users", "error");
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;padding:2rem;color:var(--gray-500);">
            Failed to load users. Try again.
          </td>
        </tr>
      `;
    } finally {
      Utils.hideLoader();
    }
  },

  // ==================
  // CATEGORIES
  // ==================
  renderCategories: async (force = false) => {
    const container = document.getElementById("categories-list");
    if (!container) return;

    Utils.showLoader();

    try {
      const categories = await API.getCategories(force);

      if (categories.length === 0) {
        container.innerHTML = `
          <div class="taxonomy-item">
            <div class="taxonomy-info">
              <span class="taxonomy-name">No categories yet</span>
              <span class="taxonomy-count">Click "Add Category" to create one</span>
            </div>
          </div>
        `;
        return;
      }

      const parentMap = {};
      categories.forEach((c) => {
        parentMap[c.id] = c.name;
      });

      container.innerHTML = categories
        .map(
          (cat) => `
        <div class="taxonomy-item">
          <div class="taxonomy-info">
            <span class="taxonomy-name">
              ${
                cat.parent_id
                  ? '<i class="fas fa-level-up-alt fa-rotate-90" style="font-size:0.75rem;color:var(--gray-400);margin-right:6px;"></i>'
                  : ""
              }
              ${cat.name}
              ${
                cat.slug
                  ? `<span style="font-size:0.75rem;color:var(--gray-500);font-weight:400;margin-left:6px;">/${cat.slug}</span>`
                  : ""
              }
            </span>
            <span class="taxonomy-count">
              ${
                cat.parent_id && parentMap[cat.parent_id]
                  ? `Parent: ${parentMap[cat.parent_id]}`
                  : "Top level"
              }
              ${cat.description ? ` • ${cat.description}` : ""}
            </span>
          </div>
          <div class="taxonomy-actions">
            <button onclick="Actions.editCategory('${
              cat.id
            }')" title="Edit category">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>
      `
        )
        .join("");
    } catch (error) {
      Utils.showToast("Failed to load categories", "error");
      container.innerHTML = `
        <div class="taxonomy-item">
          <div class="taxonomy-info">
            <span class="taxonomy-name">Failed to load categories</span>
          </div>
        </div>
      `;
    } finally {
      Utils.hideLoader();
    }
  },

  renderTags: () => {
    const container = document.getElementById("tags-cloud");
    if (!container) return;

    if (!AppState.tags || AppState.tags.length === 0) {
      container.innerHTML = `
        <div style="color:var(--gray-500);font-size:0.9rem;padding:1rem 0;">
          No tags yet. Use the input below to add your first tag.
        </div>
      `;
      return;
    }

    container.innerHTML = AppState.tags
      .map(
        (tag) => `
      <div class="tag-item">
        <span>${tag.name}</span>
        <button class="remove-tag" onclick="AppState.tags = AppState.tags.filter(t => t.id !== '${tag.id}'); Renderers.renderTags();">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `
      )
      .join("");
  },

  // force=true used when a category is saved/deleted so dropdowns are fresh
  renderCategoryOptions: async (force = false) => {
    const selects = ["blog-category", "edit-category", "category-parent"];

    try {
      const categories = await API.getCategories(force);

      selects.forEach((selectId) => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;

        const placeholder =
          selectId === "category-parent"
            ? '<option value="">None (Top Level)</option>'
            : '<option value="">Select Category</option>';

        select.innerHTML =
          placeholder +
          categories
            .map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
            .join("");

        if (currentValue) select.value = currentValue;
      });
    } catch (error) {
      console.error("Failed to load category options:", error);
    }
  },

  // ==================
  // NOTIFICATIONS
  // ==================
  renderNotifications: async (force = false) => {
    const list = document.getElementById("notification-list");
    const badge = document.getElementById("notification-badge");

    try {
      const [notifData, countData] = await Promise.all([
        API.getNotifications(20, force),
        API.getUnreadCount(force),
      ]);

      const notifications = notifData.notifications || [];

      if (notifications.length === 0) {
        list.innerHTML = `
          <div class="notification-item">
            <div class="notification-content">
              <p style="color:var(--gray-500);font-style:italic;">No notifications yet</p>
            </div>
          </div>`;
        badge.textContent = 0;
        return;
      }

      // Build notification items with proper event listeners instead of
      // inline onclick — inline onclick was calling API.markNotificationRead
      // but never re-rendering the list, so the unread highlight never cleared
      // and the badge never updated.
      list.innerHTML = notifications
        .map(
          (n) => `
          <div class="notification-item ${!n.is_read ? "unread" : ""}"
               data-id="${n.id}"
               data-read="${n.is_read}"
               style="position:relative;">
            <i class="fas fa-${
              n.type === "comment"
                ? "comment"
                : n.type === "warning"
                ? "exclamation-triangle"
                : "bell"
            }"></i>
            <div class="notification-content" style="flex:1;min-width:0;">
              <p>${n.message}</p>
              <span class="time">${Utils.formatDateTime(n.created_at)}</span>
            </div>
            <button
              class="notif-delete-btn"
              data-id="${n.id}"
              title="Dismiss"
              style="background:none;border:none;color:var(--gray-400);cursor:pointer;padding:4px 6px;flex-shrink:0;font-size:0.8rem;">
              <i class="fas fa-times"></i>
            </button>
          </div>`
        )
        .join("");

      // Update badge with real unread count
      badge.textContent = countData.unreadCount || 0;

      // Wire up click-to-read on each notification row
      list.querySelectorAll(".notification-item[data-id]").forEach((item) => {
        item.addEventListener("click", async (e) => {
          // Don't trigger read when clicking the delete button
          if (e.target.closest(".notif-delete-btn")) return;

          const id = item.dataset.id;
          const alreadyRead = item.dataset.read === "true";
          if (alreadyRead) return;

          try {
            await API.markNotificationRead(id);
            item.classList.remove("unread");
            item.dataset.read = "true";
            // Decrement badge
            const current = parseInt(badge.textContent || "0", 10);
            badge.textContent = Math.max(0, current - 1);
          } catch (_) {
            // Non-critical — ignore silently
          }
        });
      });

      // Wire up delete buttons
      list.querySelectorAll(".notif-delete-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          try {
            await API.deleteNotification(id);
            // Re-render the whole list so counts stay accurate
            await Renderers.renderNotifications(true);
          } catch (_) {
            Utils.showToast("Failed to dismiss notification", "error");
          }
        });
      });
    } catch (error) {
      console.error("renderNotifications error:", error);
      list.innerHTML = `
        <div class="notification-item">
          <i class="fas fa-exclamation-circle" style="color:var(--danger)"></i>
          <div class="notification-content">
            <p>Could not load notifications</p>
            <span class="time">${error.message}</span>
          </div>
        </div>`;
      badge.textContent = 0;
    }
  },

  // ==================
  // USER PROFILE
  // ==================
  renderUserProfile: () => {
    const user = AppState.currentUser;
    if (!user) return;

    const roleLabels = {
      admin: "Administrator",
      editor: "Editor",
      author: "Author",
    };

    const dropdownName = document.getElementById("dropdown-user-name");
    const dropdownEmail = document.getElementById("dropdown-user-email");
    if (dropdownName) dropdownName.textContent = user.name;
    if (dropdownEmail) dropdownEmail.textContent = user.email;

    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    const profileRole = document.getElementById("profile-role");
    const profileJoined = document.getElementById("profile-joined");
    const lastLogin = document.getElementById("last-login");

    if (profileName) profileName.textContent = user.name;
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileRole)
      profileRole.textContent = roleLabels[user.role] || user.role;
    if (profileJoined && user.createdAt)
      profileJoined.textContent = Utils.formatDate(user.createdAt);
    if (lastLogin)
      lastLogin.textContent = user.lastLogin
        ? Utils.formatDateTime(user.lastLogin)
        : "First login";

    const displayNameInput = document.getElementById("profile-display-name");
    const emailInput = document.getElementById("profile-email-edit");
    if (displayNameInput) displayNameInput.value = user.name;
    if (emailInput) emailInput.value = user.email;
  },

  // Reload profile from network, update AppState, re-render
  reloadUserProfile: async () => {
    try {
      const me = await API.getCurrentUser(true);
      AppState.currentUser = {
        id: me.id,
        name: `${me.first_name} ${me.last_name}`,
        email: me.email,
        role: me.role,
        createdAt: me.created_at,
        lastLogin: me.last_login,
      };
      Renderers.renderUserProfile();
      Utils.showToast("Profile refreshed", "success");
    } catch (err) {
      Utils.showToast("Failed to refresh profile", "error");
    }
  },

  // ==================
  // ANALYTICS
  // ==================
  renderAnalytics: async (force = false) => {
    Utils.showLoader();

    try {
      const period =
        document.getElementById("main-analytics-period")?.value || 30;
      const data = await API.getAnalytics(period, force);

      const totalViews = data.trafficData.data.reduce((a, b) => a + b, 0);
      document.getElementById("analytics-total-views").textContent =
        Utils.formatNumber(totalViews);
      document.getElementById("analytics-unique-visitors").textContent =
        Utils.formatNumber(Math.floor(totalViews * 0.7));
      document.getElementById("analytics-avg-time").textContent = "3:45";
      document.getElementById("analytics-bounce-rate").textContent = "42%";

      // Main traffic chart
      const trafficCtx = document.getElementById("main-traffic-chart");
      if (trafficCtx) {
        if (AppState.charts.traffic) AppState.charts.traffic.destroy();
        AppState.charts.traffic = new Chart(trafficCtx, {
          type: "line",
          data: {
            labels: data.trafficData.labels,
            datasets: [
              {
                label: "Page Views",
                data: data.trafficData.data,
                borderColor: "#d17609",
                backgroundColor: "rgba(209, 118, 9, 0.1)",
                fill: true,
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
          },
        });
      }

      // Device doughnut chart
      const deviceCtx = document.getElementById("device-chart");
      if (deviceCtx) {
        if (AppState.charts.device) AppState.charts.device.destroy();
        AppState.charts.device = new Chart(deviceCtx, {
          type: "doughnut",
          data: {
            labels: data.deviceData.labels,
            datasets: [
              {
                data: data.deviceData.data,
                backgroundColor: ["#d17609", "#2196f3", "#4caf50"],
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        });
      }

      // Top posts table
      const topPostsBody = document.getElementById("analytics-top-posts");
      if (topPostsBody) {
        topPostsBody.innerHTML = data.topPosts
          .map(
            (post, index) => `
          <tr>
            <td>#${index + 1}</td>
            <td>${post.title}</td>
            <td>${Utils.formatNumber(post.views)}</td>
            <td>${Utils.formatNumber(post.uniqueViews)}</td>
            <td>${Math.floor(post.avgTime / 60)}:${(post.avgTime % 60)
              .toString()
              .padStart(2, "0")}</td>
            <td>${post.bounceRate}%</td>
          </tr>
        `
          )
          .join("");
      }

      // Referrers
      const referrersContainer = document.getElementById("referrers-list");
      if (referrersContainer) {
        const maxCount = Math.max(...data.referrers.map((r) => r.count), 1);
        referrersContainer.innerHTML = data.referrers
          .map(
            (ref) => `
          <div class="referrer-item">
            <div class="referrer-info">
              <div class="referrer-icon"><i class="fab fa-${
                ref.icon
              }"></i></div>
              <span class="referrer-name">${ref.name}</span>
            </div>
            <div style="display:flex;align-items:center;gap:1rem;">
              <div class="referrer-bar">
                <div class="referrer-bar-fill" style="width:${
                  (ref.count / maxCount) * 100
                }%"></div>
              </div>
              <span class="referrer-count">${Utils.formatNumber(
                ref.count
              )}</span>
            </div>
          </div>
        `
          )
          .join("");
      }

      // Dashboard preview chart (7-day)
      const previewCtx = document.getElementById("traffic-chart");
      if (previewCtx) {
        if (AppState.charts.preview) AppState.charts.preview.destroy();
        AppState.charts.preview = new Chart(previewCtx, {
          type: "line",
          data: {
            labels: data.trafficData.labels.slice(-7),
            datasets: [
              {
                label: "Views",
                data: data.trafficData.data.slice(-7),
                borderColor: "#d17609",
                backgroundColor: "rgba(209, 118, 9, 0.1)",
                fill: true,
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
          },
        });

        const weekViews = data.trafficData.data
          .slice(-7)
          .reduce((a, b) => a + b, 0);
        document.getElementById("total-views").textContent =
          Utils.formatNumber(weekViews);
        document.getElementById("unique-visitors").textContent =
          Utils.formatNumber(Math.floor(weekViews * 0.7));
      }
    } catch (error) {
      Utils.showToast("Failed to load analytics", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  // ==================
  // SHARED
  // ==================
  renderPagination: (containerId, pagination, onPageChange) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <button class="page-btn" onclick="window.changePage(${
        pagination.page - 1
      })" ${pagination.page === 1 ? "disabled" : ""}>
        <i class="fas fa-chevron-left"></i>
      </button>
      <span class="page-info">Page ${pagination.page} of ${
      pagination.totalPages
    }</span>
      <button class="page-btn" onclick="window.changePage(${
        pagination.page + 1
      })" ${pagination.page >= pagination.totalPages ? "disabled" : ""}>
        <i class="fas fa-chevron-right"></i>
      </button>
    `;

    window.currentPageCallback = onPageChange;
  },
};
