/* ============================================
   APP.JS — Entry point & event listeners
   Depends on: utils.js, state.js, api.js, renderers.js, actions.js
   Load this last.
   ============================================ */

// ==================
// INITIALIZERS
// ==================
function initializeEditor() {
  if (!document.getElementById("editor")) return;

  AppState.editor = new Quill("#editor", {
    theme: "snow",
    modules: {
      toolbar: {
        container: "#editor-toolbar",
        handlers: {
          image: () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";

            input.onchange = async () => {
              const file = input.files[0];
              if (!file) return;

              try {
                const url = await uploadToCloudinary(file);
                const range = AppState.editor.getSelection(true);
                AppState.editor.insertEmbed(range.index, "image", url);
                AppState.editor.setSelection(range.index + 1);
                Utils.showToast("Image inserted", "success");
              } catch {
                Utils.showToast("Failed to upload image", "error");
              }
            };

            input.click();
          },
        },
      },
    },
    placeholder: "Write your blog content here...",
  });
}

function initializeDateDisplay() {
  const dateDisplay = document.getElementById("current-date");
  if (dateDisplay) {
    dateDisplay.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

// ==================
// EVENT LISTENERS
// ==================
function initializeEventListeners() {
  // --- Navigation ---
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      Actions.showSection(item.dataset.section);
    });
  });

  // --- Filter tabs: Posts ---
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("[data-filter]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      AppState.filters.posts = btn.dataset.filter;
      AppState.pagination.posts.page = 1;
      Renderers.renderPostsTable();
    });
  });

  // --- Filter tabs: Media ---
  document.querySelectorAll("[data-media-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("[data-media-filter]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      AppState.filters.media = btn.dataset.mediaFilter;
      Renderers.renderMediaGrid();
    });
  });

  // --- Filter tabs: Comments ---
  document.querySelectorAll("[data-comment-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("[data-comment-filter]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      AppState.filters.comments = btn.dataset.commentFilter;
      Renderers.renderComments();
    });
  });

  // --- Filter tabs: Users ---
  document.querySelectorAll("[data-user-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("[data-user-filter]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      AppState.filters.users = btn.dataset.userFilter;
      Renderers.renderUsers();
    });
  });

  // --- Media view toggle ---
  document.querySelectorAll(".media-view-toggle .view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      document
        .querySelectorAll(".media-view-toggle .view-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document
        .getElementById("media-grid")
        .classList.toggle("hidden", view !== "grid");
      document
        .getElementById("media-list")
        .classList.toggle("hidden", view !== "list");
    });
  });

  // --- Modal close buttons ---
  document.querySelectorAll(".close-btn, [data-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.modal;
      if (modalId) document.getElementById(modalId).classList.add("hidden");
    });
  });

  // --- Modal overlay click-to-close ---
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", () => {
      overlay.closest(".modal").classList.add("hidden");
    });
  });

  // --- Header dropdowns ---
  document.getElementById("user-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("user-dropdown").classList.toggle("hidden");
    document.getElementById("notification-dropdown").classList.add("hidden");
  });

  document.getElementById("notification-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("notification-dropdown").classList.toggle("hidden");
    document.getElementById("user-dropdown").classList.add("hidden");
    // Mark all as read when dropdown is opened
    API.markAllNotificationsRead().catch(() => {});
  });

  document.addEventListener("click", () => {
    document.getElementById("user-dropdown").classList.add("hidden");
    document.getElementById("notification-dropdown").classList.add("hidden");
  });

  // --- Blog form submit (publish) ---
  document.getElementById("blog-form").addEventListener("submit", (e) => {
    e.preventDefault();
    Actions.publishPost();
  });

  // --- Auto-generate slug from title ---
  document.getElementById("blog-title").addEventListener("blur", () => {
    const slugInput = document.getElementById("blog-slug");
    if (!slugInput.value) {
      slugInput.value = Utils.slugify(
        document.getElementById("blog-title").value
      );
    }
  });

  document
    .getElementById("save-draft-btn")
    .addEventListener("click", Actions.saveDraft);
  document
    .getElementById("schedule-btn")
    .addEventListener("click", Actions.schedulePost);
  document
    .getElementById("confirm-schedule-btn")
    .addEventListener("click", Actions.confirmSchedule);

  // --- Edit modal ---
  document
    .getElementById("edit-draft-btn")
    .addEventListener("click", () => Actions.saveEdit("draft"));
  document
    .getElementById("edit-publish-btn")
    .addEventListener("click", () => Actions.saveEdit("published"));

  // --- Delete modal ---
  document
    .getElementById("confirm-delete-btn")
    .addEventListener("click", Actions.confirmDelete);

  // --- Featured image upload ---
  document.getElementById("blog-image").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg"];

    if (!allowedTypes.includes(file.type)) {
      Utils.showToast("Only PNG, JPG, and JPEG images are allowed", "error");
      return;
    }

    const maxSize = 8 * 1024 * 1024; // 8MB

    if (file.size > maxSize) {
      Utils.showToast("Image must be less than 8MB", "error");
      return;
    }

    if (AppState.previewUrl) {
      URL.revokeObjectURL(AppState.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    AppState.previewUrl = previewUrl;

    const previewContainer = document.getElementById("image-preview");
    previewContainer.innerHTML = `<img src="${previewUrl}" alt="Preview">`;

    AppState.featuredImageFile = file;
    Utils.showToast("Image selected", "success");
  });

  // --- Media library upload ---
  // document.getElementById("upload-media-btn").addEventListener("click", () => {
  //   const input = document.createElement("input");
  //   input.type = "file";
  //   input.accept = "image/*,video/*,.pdf,.doc,.docx";
  //   input.onchange = async (e) => {
  //     const file = e.target.files[0];
  //     if (file) {
  //       Utils.showLoader();
  //       try {
  //         await API.uploadMedia(file);
  //         Utils.showToast("Media uploaded successfully", "success");
  //         Renderers.renderMediaGrid();
  //       } catch {
  //         Utils.showToast("Failed to upload media", "error");
  //       } finally {
  //         Utils.hideLoader();
  //       }
  //     }
  //   };
  //   input.click();
  // });

  // --- Media library modal selection ---
  // document.getElementById("select-media-btn")?.addEventListener("click", () => {
  //   if (AppState.selectedMedia) {
  //     const media = AppState.media.find((m) => m.id === AppState.selectedMedia);
  //     if (media) {
  //       document.getElementById(
  //         "image-preview"
  //       ).innerHTML = `<img src="${media.url}" alt="Selected">`;
  //     }
  //     document.getElementById("media-library-modal").classList.add("hidden");
  //   }
  // });

  // --- User management ---
  document.getElementById("invite-user-btn").addEventListener("click", () => {
    document.getElementById("invite-user-modal").classList.remove("hidden");
  });
  document
    .getElementById("send-invite-btn")
    .addEventListener("click", Actions.inviteUser);

  // Edit user modal
  document
    .getElementById("save-user-edit-btn")
    .addEventListener("click", Actions.saveUserEdit);

  // Delete user modal
  document
    .getElementById("confirm-delete-user-btn")
    .addEventListener("click", Actions.confirmDeleteUser);

  document
    .getElementById("send-reply-btn")
    .addEventListener("click", Actions.confirmReply);

  // --- Category management ---
  document
    .getElementById("add-category-btn")
    .addEventListener("click", Actions.addCategory);
  document
    .getElementById("save-category-btn")
    .addEventListener("click", Actions.saveCategory);
  document
    .getElementById("delete-category-btn")
    .addEventListener("click", Actions.deleteCategory);

  // --- Logout ---
  document
    .getElementById("logout-btn")
    ?.addEventListener("click", Actions.logoutUser);

  document
    .getElementById("confirm-logout-btn")
    ?.addEventListener("click", Actions.confirmLogout);

  // --- Profile form ---
  document
    .getElementById("profile-form")
    .addEventListener("submit", Actions.saveProfile);

  // --- Analytics period selectors ---
  document
    .getElementById("analytics-period")
    ?.addEventListener("change", Renderers.renderAnalytics);
  document
    .getElementById("main-analytics-period")
    ?.addEventListener("change", Renderers.renderAnalytics);

  // --- Debounced search ---
  const debouncedSearch = Utils.debounce((type, value) => {
    // Add search logic per section when implemented
  }, 300);
  document.getElementById("media-search")?.addEventListener("input", (e) => {
    debouncedSearch("media", e.target.value);
  });

  // --- Chart editor ---
  document.getElementById("insert-chart-btn")?.addEventListener("click", () => {
    document.getElementById("chart-modal").classList.remove("hidden");
  });

  document.querySelectorAll(".chart-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".chart-type-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  document
    .getElementById("insert-chart-confirm")
    ?.addEventListener("click", () => {
      const type = document.querySelector(".chart-type-btn.active").dataset
        .chartType;
      const title = document.getElementById("chart-title").value;

      if (AppState.editor) {
        AppState.editor.insertEmbed(
          AppState.editor.getLength(),
          "image",
          `https://quickchart.io/chart?c={type:'${type}',data:{labels:['A','B','C'],datasets:[{label:'${title}',data:[10,20,30]}]}}`
        );
      }

      document.getElementById("chart-modal").classList.add("hidden");
      Utils.showToast("Chart inserted", "success");
    });

  // --- Bulk comment actions ---
  document
    .getElementById("apply-bulk-action")
    ?.addEventListener("click", () => {
      const action = document.getElementById("bulk-action-select").value;
      if (!action) return;

      const checked = document.querySelectorAll(".comment-checkbox:checked");
      if (checked.length === 0) {
        Utils.showToast("Please select comments first", "warning");
        return;
      }
      Utils.showToast(
        `${action} applied to ${checked.length} comments`,
        "success"
      );
    });

  // --- Pagination global handler ---
  window.changePage = (page) => {
    if (window.currentPageCallback && page > 0) {
      window.currentPageCallback(page);
    }
  };

  // ─── Reload buttons ───────────────────────────────────────────────────────
  // Each button clears the relevant cache namespace(s) then re-renders.
  // _runReload spins the icon while the async work runs.

  document
    .getElementById("reload-dashboard-btn")
    ?.addEventListener("click", function () {
      _runReload(this, () => Renderers.reloadDashboard(true));
    });

  document
    .getElementById("reload-posts-btn")
    ?.addEventListener("click", function () {
      _runReload(this, () => Renderers.renderPostsTable(true));
    });

  document
    .getElementById("reload-comments-btn")
    ?.addEventListener("click", function () {
      _runReload(this, () => Renderers.renderComments(true));
    });

  document
    .getElementById("reload-users-btn")
    ?.addEventListener("click", function () {
      _runReload(this, () => Renderers.renderUsers(true));
    });

  document
    .getElementById("reload-categories-btn")
    ?.addEventListener("click", function () {
      _runReload(this, async () => {
        await Renderers.renderCategories(true);
        Renderers.renderTags();
        await Renderers.renderCategoryOptions(true);
      });
    });

  document
    .getElementById("reload-analytics-btn")
    ?.addEventListener("click", function () {
      _runReload(this, () => Renderers.renderAnalytics(true));
    });

  document
    .getElementById("reload-media-btn")
    ?.addEventListener("click", function () {
      _runReload(this, () => Renderers.renderMediaGrid());
    });

  document
    .getElementById("reload-profile-btn")
    ?.addEventListener("click", function () {
      _runReload(this, () => Renderers.reloadUserProfile());
    });
}

// ==================
// BOOT
// ==================
async function init() {
  // 1. Hide app immediately — show nothing until token verified
  document.getElementById("dashboard-app").style.display = "none";

  const ok = await API.refreshToken();
  if (!ok) return; // refreshToken already redirects to login

  try {
    const me = await API.getCurrentUser();
    AppState.currentUser = {
      id: me.id,
      name: `${me.first_name} ${me.last_name}`,
      email: me.email,
      role: me.role,
      createdAt: me.created_at,
      lastLogin: me.last_login,
    };
  } catch (err) {
    console.error("Failed to load current user:", err);
    Utils.showToast("Could not load your profile info", "warning");
  }

  // 2. Auth confirmed — now show the app
  document.getElementById("dashboard-app").style.display = "block";
  document.getElementById("skeleton-body").style.display = "none";

  // Seed mock data for media (no backend endpoint yet)
  generateMockData();

  // 3. Apply role-based UI restrictions before anything renders
  const role = AppState.currentUser.role;
  RoleAccess.applySidebarVisibility(role);
  RoleAccess.applyDashboardVisibility(role);

  // 4. Wire up the UI
  initializeEditor();
  initializeEventListeners();
  initializeDateDisplay();
  Renderers.renderUserProfile();

  // 5. Load all real data in parallel for the dashboard
  await Promise.allSettled([
    Renderers.renderNotifications(),
    Renderers.updateDashboardStats(),
    Renderers.renderCategoryOptions(),
  ]);

  // 6. Render dashboard sections
  Renderers.renderRecentPosts();
  Renderers.renderTopPosts();
  // Authors don't see the analytics chart on the dashboard
  if (role !== "author") {
    Renderers.renderAnalytics();
  }

  Actions.showSection("dashboard");

  console.log(`RevitSystems Admin Dashboard initialized — role: ${role}`);
}

// DOM-safe boot
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
