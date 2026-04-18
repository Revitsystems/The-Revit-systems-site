/* ============================================
   ACTIONS.JS — User interactions & business logic
   Depends on: utils.js, state.js, api.js, renderers.js
   ============================================ */

const Actions = {
  // ==================
  // NAVIGATION
  // ==================
  showSection: (sectionName) => {
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) targetSection.classList.add("active");

    const navItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (navItem) navItem.classList.add("active");

    AppState.currentSection = sectionName;

    document.getElementById("user-dropdown").classList.add("hidden");
    document.getElementById("notification-dropdown").classList.add("hidden");

    Actions.loadSectionData(sectionName);
  },

  loadSectionData: (sectionName) => {
    switch (sectionName) {
      case "dashboard":
        Renderers.updateDashboardStats();
        Renderers.renderRecentPosts();
        Renderers.renderTopPosts();
        Renderers.renderAnalytics();
        break;
      case "posts":
        Renderers.renderPostsTable();
        break;
      case "media":
        Renderers.renderMediaGrid();
        break;
      case "analytics":
        Renderers.renderAnalytics();
        break;
      case "comments":
        Renderers.renderComments();
        break;
      case "users":
        Renderers.renderUsers();
        break;
      case "categories":
        Renderers.renderCategories();
        Renderers.renderTags();
        break;
      case "write":
        Renderers.renderCategoryOptions();
        break;
    }
  },

  // ==================
  // POSTS
  // ==================
  saveDraft: async () => {
    const formData = Actions.getBlogFormData();
    if (!formData.title) {
      Utils.showToast("Please enter a title", "warning");
      return;
    }
    Utils.showLoader();
    try {
      await API.createPost({ ...formData, status: "draft" });
      Utils.showToast("Draft saved successfully", "success");
      Actions.resetBlogForm();
      Actions.showSection("posts");
    } catch (error) {
      Utils.showToast("Failed to save draft", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  schedulePost: () => {
    const formData = Actions.getBlogFormData();
    if (!formData.title) {
      Utils.showToast("Please enter a title", "warning");
      return;
    }
    document.getElementById("schedule-preview-title").textContent    = formData.title;
    document.getElementById("schedule-preview-category").textContent = formData.category || "Uncategorized";
    document.getElementById("schedule-post-modal").classList.remove("hidden");
  },

  confirmSchedule: async () => {
    const scheduleDate = document.getElementById("schedule-date").value;
    if (!scheduleDate) {
      Utils.showToast("Please select a date and time", "warning");
      return;
    }
    const formData = Actions.getBlogFormData();
    Utils.showLoader();
    try {
      await API.createPost({ ...formData, status: "scheduled", scheduledAt: scheduleDate });
      Utils.showToast("Post scheduled successfully", "scheduled");
      document.getElementById("schedule-post-modal").classList.add("hidden");
      Actions.resetBlogForm();
      Actions.showSection("posts");
    } catch (error) {
      Utils.showToast("Failed to schedule post", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  publishPost: async (postId) => {
    if (postId) {
      Utils.showLoader();
      try {
        await API.updatePost(postId, { status: "published" });
        Utils.showToast("Post published successfully", "success");
        Renderers.renderPostsTable();
        Renderers.updateDashboardStats();
      } catch (error) {
        Utils.showToast("Failed to publish post", "error");
      } finally {
        Utils.hideLoader();
      }
    } else {
      const formData = Actions.getBlogFormData();
      if (!formData.title || !formData.content) {
        Utils.showToast("Please fill in all required fields", "warning");
        return;
      }
      Utils.showLoader();
      try {
        await API.createPost({ ...formData, status: "published" });
        Utils.showToast("Post published successfully", "success");
        Actions.resetBlogForm();
        Actions.showSection("posts");
      } catch (error) {
        Utils.showToast("Failed to publish post", "error");
      } finally {
        Utils.hideLoader();
      }
    }
  },

  editPost: (id) => {
    const post = AppState.posts.find((p) => p.id === id);
    if (!post) return;

    AppState.editingPostId = id;
    document.getElementById("edit-id").value       = id;
    document.getElementById("edit-title").value    = post.title;
    document.getElementById("edit-slug").value     = post.slug;
    document.getElementById("edit-excerpt").value  = post.excerpt;
    document.getElementById("edit-content").value  = post.content;
    document.getElementById("edit-category").value = post.category;
    document.getElementById("edit-status-display").textContent  = post.status;
    document.getElementById("edit-status-display").className    = `status-display ${post.status}`;

    Renderers.renderCategoryOptions();
    document.getElementById("edit-modal").classList.remove("hidden");
  },

  saveEdit: async (status) => {
    const id = document.getElementById("edit-id").value;
    const postData = {
      title:    document.getElementById("edit-title").value,
      slug:     document.getElementById("edit-slug").value,
      excerpt:  document.getElementById("edit-excerpt").value,
      content:  document.getElementById("edit-content").value,
      category: document.getElementById("edit-category").value,
      status,
    };
    Utils.showLoader();
    try {
      await API.updatePost(id, postData);
      Utils.showToast("Post updated successfully", "success");
      document.getElementById("edit-modal").classList.add("hidden");
      Renderers.renderPostsTable();
      Renderers.updateDashboardStats();
    } catch (error) {
      Utils.showToast("Failed to update post", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  deletePost: (id) => {
    AppState.editingPostId = id;
    document.getElementById("delete-id").value = id;
    document.getElementById("delete-modal").classList.remove("hidden");
  },

  confirmDelete: async () => {
    const id = document.getElementById("delete-id").value;
    Utils.showLoader();
    try {
      await API.deletePost(id);
      Utils.showToast("Post deleted successfully", "success");
      document.getElementById("delete-modal").classList.add("hidden");
      Renderers.renderPostsTable();
      Renderers.updateDashboardStats();
    } catch (error) {
      Utils.showToast("Failed to delete post", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  editSchedule: (id) => {
    const post = AppState.posts.find((p) => p.id === id);
    if (!post) return;

    document.getElementById("schedule-preview-title").textContent    = post.title;
    document.getElementById("schedule-preview-category").textContent = post.category;
    document.getElementById("schedule-date").value = post.scheduledAt ? post.scheduledAt.slice(0, 16) : "";
    document.getElementById("schedule-post-modal").classList.remove("hidden");

    document.getElementById("confirm-schedule-btn").onclick = async () => {
      const newDate = document.getElementById("schedule-date").value;
      if (!newDate) return;
      Utils.showLoader();
      try {
        await API.updatePost(id, { scheduledAt: newDate });
        Utils.showToast("Schedule updated successfully", "success");
        document.getElementById("schedule-post-modal").classList.add("hidden");
        Renderers.renderPostsTable();
      } catch (error) {
        Utils.showToast("Failed to update schedule", "error");
      } finally {
        Utils.hideLoader();
      }
    };
  },

  // ==================
  // MEDIA
  // ==================
  selectMedia: (id) => {
    AppState.selectedMedia = id;
    document.querySelectorAll(".media-item").forEach((item) => {
      item.classList.toggle("selected", item.dataset.id === id);
    });
    const selectBtn = document.getElementById("select-media-btn");
    if (selectBtn) selectBtn.disabled = false;
  },

  viewMedia: (id) => {
    const media = AppState.media.find((m) => m.id === id);
    if (media) window.open(media.url, "_blank");
  },

  deleteMedia: async (id) => {
    if (!confirm("Are you sure you want to delete this media?")) return;
    AppState.media = AppState.media.filter((m) => m.id !== id);
    Renderers.renderMediaGrid();
    Utils.showToast("Media deleted", "success");
  },

  openMediaLibrary: () => {
    Renderers.renderMediaGrid();
    document.getElementById("media-library-modal").classList.remove("hidden");
  },

  // ==================
  // COMMENTS
  // ==================
  approveComment: async (id) => {
    Utils.showLoader();
    try {
      await API.updateComment(id, "approved");
      Utils.showToast("Comment approved", "success");
      Renderers.renderComments();
    } catch (error) {
      Utils.showToast("Failed to approve comment", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  replyComment: (id) => {
    const comment = AppState.comments.find((c) => c.id === id);
    const reply = prompt(`Reply to ${comment.author}:`);
    if (reply) Utils.showToast("Reply posted", "success");
  },

  markSpam: async (id) => {
    Utils.showLoader();
    try {
      await API.updateComment(id, "spam");
      Utils.showToast("Comment marked as spam", "warning");
      Renderers.renderComments();
    } catch (error) {
      Utils.showToast("Failed to mark as spam", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  // ==================
  // USERS
  // ==================
  inviteUser: async () => {
    const email   = document.getElementById("invite-email").value;
    const role    = document.getElementById("invite-role").value;
    const message = document.getElementById("invite-message").value;

    if (!email) {
      Utils.showToast("Please enter an email", "warning");
      return;
    }
    Utils.showLoader();
    try {
      await API.inviteUser(email, role, message);
      Utils.showToast("Invitation sent successfully", "success");
      document.getElementById("invite-user-modal").classList.add("hidden");
      document.getElementById("invite-form").reset();
      Renderers.renderUsers();
    } catch (error) {
      Utils.showToast("Failed to send invitation", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  editUser: (id) => {
    Utils.showToast("User edit functionality coming soon", "info");
  },

  deleteUser: (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    AppState.users = AppState.users.filter((u) => u.id !== id);
    Renderers.renderUsers();
    Utils.showToast("User deleted", "success");
  },

  // ==================
  // CATEGORIES & TAGS
  // ==================
  addCategory: () => {
    document.getElementById("category-modal-title").textContent = "Add Category";
    document.getElementById("category-form").reset();
    document.getElementById("edit-category-id").value = "";
    document.getElementById("delete-category-btn").classList.add("hidden");
    Renderers.renderCategoryOptions();
    document.getElementById("category-modal").classList.remove("hidden");
  },

  editCategory: (id) => {
    const cat = AppState.categories.find((c) => c.id === id);
    if (!cat) return;

    document.getElementById("category-modal-title").textContent  = "Edit Category";
    document.getElementById("edit-category-id").value            = cat.id;
    document.getElementById("category-name").value               = cat.name;
    document.getElementById("category-slug").value               = cat.slug;
    document.getElementById("category-description").value        = cat.description || "";
    document.getElementById("category-parent").value             = cat.parent || "";
    document.getElementById("delete-category-btn").classList.remove("hidden");
    Renderers.renderCategoryOptions();
    document.getElementById("category-modal").classList.remove("hidden");
  },

  saveCategory: async () => {
    const id = document.getElementById("edit-category-id").value;
    const categoryData = {
      id:          id || null,
      name:        document.getElementById("category-name").value,
      slug:        document.getElementById("category-slug").value,
      description: document.getElementById("category-description").value,
      parent:      document.getElementById("category-parent").value || null,
    };
    if (!categoryData.name) {
      Utils.showToast("Please enter a category name", "warning");
      return;
    }
    Utils.showLoader();
    try {
      await API.saveCategory(categoryData);
      Utils.showToast("Category saved successfully", "success");
      document.getElementById("category-modal").classList.add("hidden");
      Renderers.renderCategories();
      Renderers.renderCategoryOptions();
    } catch (error) {
      Utils.showToast("Failed to save category", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  deleteCategory: async () => {
    const id = document.getElementById("edit-category-id").value;
    if (!confirm("Are you sure you want to delete this category?")) return;
    Utils.showLoader();
    try {
      await API.deleteCategory(id);
      Utils.showToast("Category deleted", "success");
      document.getElementById("category-modal").classList.add("hidden");
      Renderers.renderCategories();
    } catch (error) {
      Utils.showToast("Failed to delete category", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  addTag: () => {
    const input = document.getElementById("new-tag-input");
    const name = input.value.trim();
    if (!name) return;

    AppState.tags.push({ id: Utils.generateId(), name, count: 0 });
    input.value = "";
    Renderers.renderTags();
    Utils.showToast("Tag added", "success");
  },

  deleteTag: (id) => {
    AppState.tags = AppState.tags.filter((t) => t.id !== id);
    Renderers.renderTags();
    Utils.showToast("Tag removed", "success");
  },

  // ==================
  // PROFILE
  // ==================
  saveProfile: async (e) => {
    e.preventDefault();
    const name  = document.getElementById("profile-display-name").value;
    const email = document.getElementById("profile-email-edit").value;

    AppState.currentUser.name  = name;
    AppState.currentUser.email = email;

    document.getElementById("profile-name").textContent          = name;
    document.getElementById("profile-email").textContent         = email;
    document.getElementById("dropdown-user-name").textContent    = name;
    document.getElementById("dropdown-user-email").textContent   = email;

    Utils.showToast("Profile updated successfully", "success");
  },

  logoutUser: () => {
    if (confirm("Are you sure you want to logout?")) {
      Utils.showToast("Logged out successfully", "success");
      setTimeout(() => { window.location.href = "/pages/auth/login.html"; }, 1000);
    }
  },

  // ==================
  // HELPERS
  // ==================
  getBlogFormData: () => {
    const content = AppState.editor ? AppState.editor.root.innerHTML : "";
    return {
      title:         document.getElementById("blog-title").value,
      slug:          document.getElementById("blog-slug").value || Utils.slugify(document.getElementById("blog-title").value),
      excerpt:       document.getElementById("blog-excerpt").value,
      content,
      category:      document.getElementById("blog-category").value,
      tags:          document.getElementById("blog-tags").value.split(",").map((t) => t.trim()).filter((t) => t),
      featuredImage: document.getElementById("image-preview").querySelector("img")?.src || null,
    };
  },

  resetBlogForm: () => {
    document.getElementById("blog-form").reset();
    if (AppState.editor) AppState.editor.setContents([]);
    document.getElementById("image-preview").innerHTML = `
      <i class="fas fa-cloud-upload-alt"></i>
      <p>Click to upload image</p>
    `;
  },
};
