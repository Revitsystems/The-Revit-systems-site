/**
 * Blog Admin Dashboard
 * Backend-driven pagination using limit + offset,
 * matching the API contract: GET /posts?status=&limit=&offset=
 * Response shape: { posts, limit, offset, hasMore }
 */

// ============================================
// MODULE: CONFIG
// ============================================
const Config = {
  API_BASE: "http://localhost:5000",
  DEFAULT_LIMIT: 10,
  CATEGORIES: {
    "software-development": "Software Development",
    branding: "Branding",
    "business-building": "Business Building",
    media: "Media",
  },
  TOAST_DURATION_MS: 5000,
};

// ============================================
// MODULE: API
// Matches your backend contract exactly:
//   GET /posts?status=published&limit=10&offset=0
//   Response: { posts, limit, offset, hasMore }
// ============================================
const API = {
  async getPosts({
    status = "published",
    limit = Config.DEFAULT_LIMIT,
    offset = 0,
  } = {}) {
    const params = new URLSearchParams({ status, limit, offset });
    const res = await fetch(`${Config.API_BASE}/posts?${params}`);
    if (!res.ok) throw new Error("Failed to fetch posts");
    return res.json(); // { posts, limit, offset, hasMore }
  },

  async getPost(id) {
    const res = await fetch(`${Config.API_BASE}/posts/${id}`);
    if (!res.ok) throw new Error("Failed to fetch post");
    return res.json();
  },

  async createPost(data) {
    const res = await fetch(`${Config.API_BASE}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create post");
    return res.json();
  },

  async updatePost(id, data) {
    const res = await fetch(`${Config.API_BASE}/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update post");
    return res.json();
  },

  async deletePost(id) {
    const res = await fetch(`${Config.API_BASE}/posts/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete post");
    return res.json();
  },
};

// ============================================
// MODULE: UTILS
// ============================================
const Utils = {
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  },

  getCategoryLabel(category) {
    return Config.CATEGORIES[category] || category;
  },

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  },
};

// ============================================
// MODULE: UI
// ============================================
const UI = {
  showLoader(message = "Loading...") {
    const loader = document.getElementById("loader");
    if (!loader) return;
    loader.querySelector("p").textContent = message;
    loader.classList.remove("hidden");
  },

  hideLoader() {
    document.getElementById("loader")?.classList.add("hidden");
  },

  showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const icons = {
      success: "check-circle",
      error: "times-circle",
      warning: "exclamation-triangle",
      info: "info-circle",
    };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${
      icons[type] || "info-circle"
    }"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), Config.TOAST_DURATION_MS);
  },

  showSection(sectionName) {
    document
      .querySelectorAll(".section")
      .forEach((s) => s.classList.remove("active"));
    document.getElementById(`${sectionName}-section`)?.classList.add("active");
    document.querySelectorAll(".nav-item").forEach((n) => {
      n.classList.toggle("active", n.dataset.section === sectionName);
    });
  },

  openModal(modalId) {
    document.getElementById(modalId)?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  },

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.add("hidden");
    document.body.style.overflow = "";
  },

  renderPostRow(post) {
    return `
      <tr data-id="${post.id}">
        <td>
          <strong>${post.title}</strong>
          <br><small class="text-muted">${post.slug ?? ""}</small>
        </td>
        <td>${Utils.getCategoryLabel(post.category)}</td>
        <td><span class="status-badge ${post.status}">${post.status}</span></td>
        <td>${Utils.formatDate(post.created_at)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" data-action="edit" data-id="${
              post.id
            }" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" data-action="delete" data-id="${
              post.id
            }" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
            ${
              post.status === "draft"
                ? `<button class="action-btn publish" data-action="publish" data-id="${post.id}" title="Publish">
                   <i class="fas fa-check"></i>
                 </button>`
                : ""
            }
          </div>
        </td>
      </tr>`;
  },

  renderModalPostRow(post, { showPublishBtn = false } = {}) {
    return `
      <tr data-id="${post.id}">
        <td>
          <strong>${post.title}</strong>
          <br><small>${post.slug ?? ""}</small>
        </td>
        <td>${Utils.getCategoryLabel(post.category)}</td>
        <td>${Utils.formatDate(post.created_at)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" data-action="edit" data-id="${
              post.id
            }" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" data-action="delete" data-id="${
              post.id
            }" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
            ${
              showPublishBtn
                ? `<button class="action-btn publish" data-action="publish" data-id="${post.id}" title="Publish">
                   <i class="fas fa-check"></i>
                 </button>`
                : ""
            }
          </div>
        </td>
      </tr>`;
  },

  renderEmptyRow(colSpan, message) {
    return `
      <tr>
        <td colspan="${colSpan}" class="text-center">
          <p style="padding:2rem;color:var(--gray-500);">
            <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:1rem;"></i>
            ${message}
          </p>
        </td>
      </tr>`;
  },

  /**
   * Renders Prev / Next controls from the backend's limit/offset/hasMore response.
   * onNavigate(newOffset) is called with the next offset to request.
   */
  renderPagination(containerId, { limit, offset, hasMore }, onNavigate) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    const hasPrev = offset > 0;
    if (!hasPrev && !hasMore) return; // single page — no controls needed

    const currentPage = Math.floor(offset / limit) + 1;

    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = !hasPrev;
    prevBtn.addEventListener("click", () =>
      onNavigate(Math.max(0, offset - limit))
    );
    container.appendChild(prevBtn);

    const pageInfo = document.createElement("span");
    pageInfo.className = "page-info";
    pageInfo.textContent = `Page ${currentPage}`;
    container.appendChild(pageInfo);

    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = !hasMore;
    nextBtn.addEventListener("click", () => onNavigate(offset + limit));
    container.appendChild(nextBtn);
  },

  populateEditModal(post) {
    document.getElementById("edit-id").value = post.id;
    document.getElementById("edit-title").value = post.title;
    document.getElementById("edit-slug").value = post.slug ?? "";
    document.getElementById("edit-excerpt").value = post.excerpt ?? "";
    document.getElementById("edit-content").value = post.content;
    document.getElementById("edit-category").value =
      post.category_id ?? post.category;
    const statusDisplay = document.getElementById("edit-status-display");
    statusDisplay.textContent =
      post.status === "published" ? "Published" : "Draft";
    statusDisplay.style.color =
      post.status === "published" ? "var(--success)" : "var(--warning)";
  },

  resetWriteForm() {
    document.getElementById("blog-form")?.reset();
    const preview = document.getElementById("image-preview");
    if (preview) {
      preview.innerHTML = `<i class="fas fa-cloud-upload-alt"></i><p>Click to upload image</p>`;
    }
    const slugInput = document.getElementById("blog-slug");
    if (slugInput) slugInput.dataset.auto = "true";
  },
};

// ============================================
// MODULE: POSTS RENDERER
// Each function fetches its own data and
// renders independently.
// ============================================
const PostsRenderer = {
  async renderStats() {
    try {
      // We only need the counts — fetch 1 row each and read hasMore to infer existence
      const [pub, draft] = await Promise.all([
        API.getPosts({ status: "published", limit: 1, offset: 0 }),
        API.getPosts({ status: "draft", limit: 1, offset: 0 }),
      ]);

      // Backend doesn't return a total count, so show relative labels
      document.getElementById("published-count").textContent = pub.posts.length
        ? pub.hasMore
          ? `${1}+`
          : pub.posts.length
        : 0;
      document.getElementById("drafts-count").textContent = draft.posts.length
        ? draft.hasMore
          ? `${1}+`
          : draft.posts.length
        : 0;

      // For a proper count, ask for a large limit and use the length
      const all = await API.getPosts({
        status: "published",
        limit: 1000,
        offset: 0,
      });
      const allDraft = await API.getPosts({
        status: "draft",
        limit: 1000,
        offset: 0,
      });
      const pubCount = all.posts.length;
      const draftCount = allDraft.posts.length;
      document.getElementById("published-count").textContent = pubCount;
      document.getElementById("drafts-count").textContent = draftCount;
      document.getElementById("total-count").textContent =
        pubCount + draftCount;
    } catch {
      UI.showToast("Failed to load stats", "error");
    }
  },

  async renderRecentPosts() {
    const tbody = document.getElementById("recent-posts-table");
    if (!tbody) return;
    try {
      const { posts } = await API.getPosts({
        status: "published",
        limit: 5,
        offset: 0,
      });
      tbody.innerHTML = posts.length
        ? posts.map(UI.renderPostRow).join("")
        : UI.renderEmptyRow(5, "No posts yet");
    } catch {
      tbody.innerHTML = UI.renderEmptyRow(5, "Failed to load posts");
    }
  },

  async renderAllPosts(status = "published", offset = 0) {
    const tbody = document.getElementById("all-posts-table");
    if (!tbody) return;
    try {
      const limit = Config.DEFAULT_LIMIT;
      const response = await API.getPosts({ status, limit, offset });
      const { posts } = response;

      tbody.innerHTML = posts.length
        ? posts.map(UI.renderPostRow).join("")
        : UI.renderEmptyRow(5, "No posts found");

      UI.renderPagination("posts-pagination", response, (newOffset) =>
        PostsRenderer.renderAllPosts(status, newOffset)
      );
    } catch {
      tbody.innerHTML = UI.renderEmptyRow(5, "Failed to load posts");
    }
  },

  async renderPublishedModal(offset = 0) {
    const tbody = document.getElementById("published-table");
    if (!tbody) return;
    try {
      const limit = Config.DEFAULT_LIMIT;
      const response = await API.getPosts({
        status: "published",
        limit,
        offset,
      });
      const { posts } = response;

      tbody.innerHTML = posts.length
        ? posts.map((p) => UI.renderModalPostRow(p)).join("")
        : UI.renderEmptyRow(4, "No published posts yet");

      UI.renderPagination("published-pagination", response, (newOffset) =>
        PostsRenderer.renderPublishedModal(newOffset)
      );
    } catch {
      tbody.innerHTML = UI.renderEmptyRow(4, "Failed to load published posts");
    }
  },

  async renderDraftsModal(offset = 0) {
    const tbody = document.getElementById("drafts-table");
    if (!tbody) return;
    try {
      const limit = Config.DEFAULT_LIMIT;
      const response = await API.getPosts({ status: "draft", limit, offset });
      const { posts } = response;

      tbody.innerHTML = posts.length
        ? posts
            .map((p) => UI.renderModalPostRow(p, { showPublishBtn: true }))
            .join("")
        : UI.renderEmptyRow(4, "No draft posts yet");

      UI.renderPagination("drafts-pagination", response, (newOffset) =>
        PostsRenderer.renderDraftsModal(newOffset)
      );
    } catch {
      tbody.innerHTML = UI.renderEmptyRow(4, "Failed to load drafts");
    }
  },

  async refreshAll() {
    await Promise.all([
      PostsRenderer.renderStats(),
      PostsRenderer.renderRecentPosts(),
      PostsRenderer.renderAllPosts(),
    ]);
    if (
      !document.getElementById("published-modal")?.classList.contains("hidden")
    ) {
      await PostsRenderer.renderPublishedModal();
    }
    if (
      !document.getElementById("drafts-modal")?.classList.contains("hidden")
    ) {
      await PostsRenderer.renderDraftsModal();
    }
  },
};

// ============================================
// MODULE: ACTIONS
// ============================================
const Actions = {
  async savePost(postData, status) {
    UI.showLoader("Saving post...");
    try {
      await API.createPost({ ...postData, status });
      await PostsRenderer.refreshAll();
      UI.showToast(`Post saved as ${status} successfully!`, "success");
      UI.resetWriteForm();
    } catch {
      UI.showToast("Failed to save post", "error");
    } finally {
      UI.hideLoader();
    }
  },

  async updatePost(postId, updates, newStatus) {
    UI.showLoader("Updating post...");
    try {
      await API.updatePost(postId, {
        ...updates,
        ...(newStatus && { status: newStatus }),
      });
      await PostsRenderer.refreshAll();
      UI.showToast("Post updated successfully!", "success");
    } catch {
      UI.showToast("Failed to update post", "error");
    } finally {
      UI.hideLoader();
    }
  },

  async deletePost(postId) {
    UI.showLoader("Deleting post...");
    try {
      await API.deletePost(postId);
      await PostsRenderer.refreshAll();
      UI.showToast("Post deleted successfully!", "success");
    } catch {
      UI.showToast("Failed to delete post", "error");
    } finally {
      UI.hideLoader();
    }
  },

  async publishPost(postId) {
    UI.showLoader("Publishing post...");
    try {
      await API.updatePost(postId, { status: "published" });
      await PostsRenderer.refreshAll();
      UI.showToast("Post published successfully!", "success");
    } catch {
      UI.showToast("Failed to publish post", "error");
    } finally {
      UI.hideLoader();
    }
  },

  async openEditModal(postId) {
    UI.showLoader("Loading post...");
    try {
      const post = await API.getPost(postId);
      UI.populateEditModal(post);
      UI.openModal("edit-modal");
    } catch {
      UI.showToast("Failed to load post", "error");
    } finally {
      UI.hideLoader();
    }
  },

  openDeleteModal(postId) {
    document.getElementById("delete-id").value = postId;
    UI.openModal("delete-modal");
  },

  async openPublishedModal() {
    UI.openModal("published-modal");
    await PostsRenderer.renderPublishedModal(0);
  },

  async openDraftsModal() {
    UI.openModal("drafts-modal");
    await PostsRenderer.renderDraftsModal(0);
  },

  markAllNotificationsRead() {
    document
      .querySelectorAll(".notification-item")
      .forEach((item) => item.classList.remove("unread"));
    const badge = document.querySelector(".notification-btn .badge");
    if (badge) badge.style.display = "none";
    UI.showToast("All notifications marked as read", "info");
  },
};

// ============================================
// MODULE: EVENT BUS
// ============================================
const EventBus = {
  handleActionClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    const actionMap = {
      edit: () => Actions.openEditModal(id),
      delete: () => Actions.openDeleteModal(id),
      publish: () => Actions.publishPost(id),
    };
    actionMap[btn.dataset.action]?.();
  },

  handleModalClose(e) {
    const el = e.target.closest("[data-modal]");
    if (el) UI.closeModal(el.dataset.modal);
  },

  handleOverlayClick(e) {
    if (!e.target.classList.contains("modal-overlay")) return;
    const modal = e.target.closest(".modal");
    if (modal) UI.closeModal(modal.id);
  },
};

// ============================================
// MODULE: FORMS
// ============================================
const Forms = {
  setupWriteForm() {
    const form = document.getElementById("blog-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      Actions.savePost(Forms._getWriteFormData(), "published");
    });

    document.getElementById("save-draft-btn")?.addEventListener("click", () => {
      const data = Forms._getWriteFormData();
      data.title = data.title || "Untitled Draft";
      data.slug = data.slug || Utils.generateSlug(data.title);
      data.category = data.category || "software-development";
      Actions.savePost(data, "draft");
    });

    const titleInput = document.getElementById("blog-title");
    const slugInput = document.getElementById("blog-slug");

    titleInput?.addEventListener("input", () => {
      if (!slugInput.value || slugInput.dataset.auto === "true") {
        slugInput.value = Utils.generateSlug(titleInput.value);
        slugInput.dataset.auto = "true";
      }
    });

    slugInput?.addEventListener("input", () => {
      slugInput.dataset.auto = slugInput.value ? "false" : "true";
    });

    document.getElementById("blog-image")?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        document.getElementById(
          "image-preview"
        ).innerHTML = `<img src="${evt.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    });
  },

  setupEditForm() {
    document
      .getElementById("edit-publish-btn")
      ?.addEventListener("click", () => {
        const postId = parseInt(document.getElementById("edit-id").value, 10);
        Actions.updatePost(postId, Forms._getEditFormData(), "published");
        UI.closeModal("edit-modal");
      });

    document.getElementById("edit-draft-btn")?.addEventListener("click", () => {
      const postId = parseInt(document.getElementById("edit-id").value, 10);
      Actions.updatePost(postId, Forms._getEditFormData(), "draft");
      UI.closeModal("edit-modal");
    });
  },

  setupDeleteForm() {
    document
      .getElementById("confirm-delete-btn")
      ?.addEventListener("click", () => {
        const postId = parseInt(document.getElementById("delete-id").value, 10);
        Actions.deletePost(postId);
        UI.closeModal("delete-modal");
      });
  },

  _getWriteFormData() {
    return {
      title: document.getElementById("blog-title").value,
      slug: document.getElementById("blog-slug").value,
      excerpt: document.getElementById("blog-excerpt").value,
      content: document.getElementById("blog-content").value,
      category: document.getElementById("blog-category").value,
    };
  },

  _getEditFormData() {
    return {
      title: document.getElementById("edit-title").value,
      slug: document.getElementById("edit-slug").value,
      excerpt: document.getElementById("edit-excerpt").value,
      content: document.getElementById("edit-content").value,
      category: document.getElementById("edit-category").value,
    };
  },
};

// ============================================
// MODULE: NAVBAR
// ============================================
const Navbar = {
  setup() {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        UI.showSection(item.dataset.section);
      });
    });

    document
      .getElementById("published-card")
      ?.addEventListener("click", Actions.openPublishedModal);
    document
      .getElementById("drafts-card")
      ?.addEventListener("click", Actions.openDraftsModal);

    // Filter tabs pass status + reset offset to 0
    document.querySelectorAll(".tab-btn").forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll(".tab-btn")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        PostsRenderer.renderAllPosts(tab.dataset.filter, 0);
      });
    });

    const notifBtn = document.getElementById("notification-btn");
    const notifDropdown = document.getElementById("notification-dropdown");
    const userBtn = document.getElementById("user-btn");
    const userDropdown = document.getElementById("user-dropdown");

    notifBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown?.classList.toggle("hidden");
      userDropdown?.classList.add("hidden");
    });

    userBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdown?.classList.toggle("hidden");
      notifDropdown?.classList.add("hidden");
    });

    document.addEventListener("click", () => {
      notifDropdown?.classList.add("hidden");
      userDropdown?.classList.add("hidden");
    });

    document
      .querySelector(".mark-all-read")
      ?.addEventListener("click", Actions.markAllNotificationsRead);
  },
};

// ============================================
// INIT
// ============================================
async function init() {
  document.getElementById("current-date").textContent =
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const userEmail = sessionStorage.getItem("userEmail");
  if (userEmail) {
    document.querySelector(".user-details h4").textContent =
      userEmail.split("@")[0];
    document.querySelector(".user-details p").textContent = userEmail;
    document.querySelector(".info-row .value").textContent = userEmail;
  }

  Forms.setupWriteForm();
  Forms.setupEditForm();
  Forms.setupDeleteForm();
  Navbar.setup();

  document.addEventListener("click", EventBus.handleActionClick);
  document.addEventListener("click", EventBus.handleModalClose);
  document.addEventListener("click", EventBus.handleOverlayClick);

  await Promise.all([
    PostsRenderer.renderStats(),
    PostsRenderer.renderRecentPosts(),
    PostsRenderer.renderAllPosts("published", 0),
  ]);

  const name = userEmail ? userEmail.split("@")[0] : "Admin";
  UI.showToast(`Welcome back, ${name}!`, "info");
}

// ============================================
// GLOBAL EXPORTS
// ============================================
window.showSection = UI.showSection.bind(UI);
window.logoutUser = function () {
  UI.showLoader("Logging out...");
  sessionStorage.clear();
  UI.showToast("Logged out successfully!", "success");
  setTimeout(() => (window.location.href = "login.html"), 1000);
  UI.hideLoader();
};

document.addEventListener("DOMContentLoaded", init);
