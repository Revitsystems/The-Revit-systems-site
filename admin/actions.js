/* ============================================
   ACTIONS.JS — User interactions & business logic
   Depends on: utils.js, state.js, api.js, renderers.js
   ============================================ */

const Actions = {
  // ==================
  // NAVIGATION
  // ==================
  showSection: (sectionName) => {
    document
      .querySelectorAll(".section")
      .forEach((s) => s.classList.remove("active"));
    document
      .querySelectorAll(".nav-item")
      .forEach((n) => n.classList.remove("active"));

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
    let formData;
    try {
      formData = await Actions.getBlogFormData(); // ← await
    } catch {
      return; // image upload failed, stop here
    }

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
      Utils.showToast(error.message || "Failed to save draft", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  schedulePost: async () => {
    let formData;
    try {
      formData = await Actions.getBlogFormData(); // ← await
    } catch {
      return;
    }

    if (!formData.title) {
      Utils.showToast("Please enter a title", "warning");
      return;
    }

    document.getElementById("schedule-preview-title").textContent =
      formData.title;
    document.getElementById("schedule-preview-category").textContent =
      formData.category || "Uncategorized";

    // Store form data so confirmSchedule can use it without re-uploading
    AppState.pendingFormData = formData;

    document.getElementById("schedule-post-modal").classList.remove("hidden");
  },

  confirmSchedule: async () => {
    const scheduleDate = document.getElementById("schedule-date").value;
    if (!scheduleDate) {
      Utils.showToast("Please select a date and time", "warning");
      return;
    }

    // Use the already-prepared form data — image already uploaded
    const formData = AppState.pendingFormData;
    if (!formData) return;

    Utils.showLoader();
    try {
      await API.createPost({
        ...formData,
        status: "scheduled",
        scheduledAt: scheduleDate,
      });
      Utils.showToast("Post scheduled successfully", "scheduled");
      document.getElementById("schedule-post-modal").classList.add("hidden");
      AppState.pendingFormData = null;
      Actions.resetBlogForm();
      Actions.showSection("posts");
    } catch (error) {
      Utils.showToast(error.message || "Failed to schedule post", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  publishPost: async (postId) => {
    if (postId) {
      // Publishing existing post from table — no form involved
      Utils.showLoader();
      try {
        await API.publishPost(postId);
        Utils.showToast("Post published successfully", "success");
        Renderers.renderPostsTable();
        Renderers.updateDashboardStats();
      } catch (error) {
        Utils.showToast(error.message || "Failed to publish post", "error");
      } finally {
        Utils.hideLoader();
      }
    } else {
      // Publishing from the write form
      let formData;
      try {
        formData = await Actions.getBlogFormData(); // ← await
      } catch {
        return;
      }

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
        Utils.showToast(error.message || "Failed to publish post", "error");
      } finally {
        Utils.hideLoader();
      }
    }
  },

  editPost: (id) => {
    const post = AppState.posts.find((p) => p.id === id);
    if (!post) return;

    AppState.editingPostId = id;
    document.getElementById("edit-id").value = id;
    document.getElementById("edit-title").value = post.title;
    document.getElementById("edit-slug").value = post.slug;
    document.getElementById("edit-excerpt").value = post.excerpt || "";
    document.getElementById("edit-content").value = post.content || "";
    document.getElementById("edit-category").value =
      post.category_id || post.category || "";
    document.getElementById("edit-status-display").textContent = post.status;
    document.getElementById(
      "edit-status-display"
    ).className = `status-display ${post.status}`;

    Renderers.renderCategoryOptions();
    document.getElementById("edit-modal").classList.remove("hidden");
  },

  saveEdit: async (status) => {
    const id = document.getElementById("edit-id").value;
    const postData = {
      title: document.getElementById("edit-title").value,
      slug: document.getElementById("edit-slug").value,
      excerpt: document.getElementById("edit-excerpt").value,
      content: document.getElementById("edit-content").value,
      categoryId: document.getElementById("edit-category").value,
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
      Utils.showToast(error.message || "Failed to update post", "error");
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
      Utils.showToast(error.message || "Failed to delete post", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  editSchedule: (id) => {
    const post = AppState.posts.find((p) => p.id === id);
    if (!post) return;

    document.getElementById("schedule-preview-title").textContent = post.title;
    document.getElementById("schedule-preview-category").textContent =
      post.category || "";
    document.getElementById("schedule-date").value = post.scheduled_date
      ? new Date(post.scheduled_date).toISOString().slice(0, 16)
      : "";
    document.getElementById("schedule-post-modal").classList.remove("hidden");

    document.getElementById("confirm-schedule-btn").onclick = async () => {
      const newDate = document.getElementById("schedule-date").value;
      if (!newDate) return;
      Utils.showLoader();
      try {
        await API.schedulePost(id, newDate);
        Utils.showToast("Schedule updated successfully", "success");
        document.getElementById("schedule-post-modal").classList.add("hidden");
        Renderers.renderPostsTable();
      } catch (error) {
        Utils.showToast(error.message || "Failed to update schedule", "error");
      } finally {
        Utils.hideLoader();
      }
    };
  },

  // ==================
  // MEDIA  (still mock — no backend endpoint yet)
  // ==================
  selectMedia: (id) => {
    document
      .querySelectorAll(".media-item")
      .forEach((item) => item.classList.remove("selected"));
    const item = document.querySelector(`.media-item[data-id="${id}"]`);
    if (item) item.classList.add("selected");
    AppState.selectedMedia = id;

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
      Utils.showToast(error.message || "Failed to approve comment", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  replyComment: (id) => {
    const comment = AppState.comments.find((c) => c.id === id);
    if (!comment) return;

    document.getElementById("reply-comment-id").value = id;
    document.getElementById("reply-comment-author").textContent =
      comment.author;
    document.getElementById("reply-original-comment").textContent =
      comment.text;
    document.getElementById("reply-text").value = "";
    document.getElementById("reply-comment-modal").classList.remove("hidden");
  },

  confirmReply: async () => {
    const id = document.getElementById("reply-comment-id").value;
    const reply = document.getElementById("reply-text").value.trim();

    if (!reply) {
      Utils.showToast("Please enter a reply", "warning");
      return;
    }

    Utils.showLoader();
    try {
      await API.replyToComment(id, reply);
      Utils.showToast("Reply posted successfully", "success");
      document.getElementById("reply-comment-modal").classList.add("hidden");
      Renderers.renderComments();
    } catch (error) {
      Utils.showToast(error.message || "Failed to post reply", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  markSpam: async (id) => {
    Utils.showLoader();
    try {
      await API.updateComment(id, "spam"); // maps to "rejected" inside API.updateComment
      Utils.showToast("Comment marked as spam", "warning");
      Renderers.renderComments();
    } catch (error) {
      Utils.showToast(error.message || "Failed to mark as spam", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  // ==================
  // USERS
  // ==================
  // Opens the edit modal and populates it with the selected user's data.
  // Reads from AppState.users so no extra API call is needed on open.
  editUser: (id) => {
    const user = AppState.users.find((u) => u.id === id);
    if (!user) return;

    document.getElementById("edit-user-id").value = id;
    document.getElementById("edit-user-first-name").value =
      user.first_name || "";
    document.getElementById("edit-user-last-name").value = user.last_name || "";
    document.getElementById("edit-user-email").value = user.email || "";
    document.getElementById("edit-user-role").value = user.role || "user";
    document.getElementById("edit-user-status").value =
      user.status || "pending";

    document.getElementById("edit-user-modal").classList.remove("hidden");
  },

  // Submits the edit-user form to PATCH /users/:id
  saveUserEdit: async () => {
    const id = document.getElementById("edit-user-id").value;
    const updates = {
      firstName: document.getElementById("edit-user-first-name").value.trim(),
      lastName: document.getElementById("edit-user-last-name").value.trim(),
      role: document.getElementById("edit-user-role").value,
      status: document.getElementById("edit-user-status").value,
    };

    if (!updates.firstName || !updates.lastName) {
      Utils.showToast("First and last name are required", "warning");
      return;
    }

    Utils.showLoader();
    try {
      await API.updateUser(id, updates);
      Utils.showToast("User updated successfully", "success");
      document.getElementById("edit-user-modal").classList.add("hidden");
      Renderers.renderUsers();
    } catch (error) {
      Utils.showToast(error.message || "Failed to update user", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  // One-click approve: sets status → "active"
  approveUser: async (id) => {
    Utils.showLoader();
    try {
      await API.updateUser(id, { status: "active" });
      Utils.showToast("User approved", "success");
      Renderers.renderUsers();
    } catch (error) {
      Utils.showToast(error.message || "Failed to approve user", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  // One-click suspend: sets status → "suspended"
  suspendUser: async (id) => {
    Utils.showLoader();
    try {
      await API.updateUser(id, { status: "suspended" });
      Utils.showToast("User suspended", "warning");
      Renderers.renderUsers();
    } catch (error) {
      Utils.showToast(error.message || "Failed to suspend user", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  // Opens the delete confirmation modal — no window.confirm()
  deleteUser: (id) => {
    const user = AppState.users.find((u) => u.id === id);
    if (!user) return;

    const fullName = `${user.first_name} ${user.last_name}`;
    document.getElementById("delete-user-id").value = id;
    document.getElementById("delete-user-name-display").textContent = fullName;
    document.getElementById("delete-user-modal").classList.remove("hidden");
  },

  // Confirmed delete from the modal
  confirmDeleteUser: async () => {
    const id = document.getElementById("delete-user-id").value;
    Utils.showLoader();
    try {
      await API.deleteUser(id);
      Utils.showToast("User deleted", "success");
      document.getElementById("delete-user-modal").classList.add("hidden");
      Renderers.renderUsers();
    } catch (error) {
      Utils.showToast(error.message || "Failed to delete user", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  inviteUser: async () => {
    const email = document.getElementById("invite-email").value;
    const role = document.getElementById("invite-role").value;

    if (!email) {
      Utils.showToast("Please enter an email", "warning");
      return;
    }
    Utils.showLoader();
    try {
      await API.inviteUser(email, role);
      Utils.showToast("User registered with pending status", "success");
      document.getElementById("invite-user-modal").classList.add("hidden");
      document.getElementById("invite-form").reset();
      Renderers.renderUsers();
    } catch (error) {
      Utils.showToast(error.message || "Failed to invite user", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  // ==================
  // CATEGORIES
  // ==================
  addCategory: () => {
    document.getElementById("category-modal-title").textContent =
      "Add Category";
    document.getElementById("category-form").reset();
    document.getElementById("edit-category-id").value = "";
    document.getElementById("delete-category-btn").classList.add("hidden");
    Renderers.renderCategoryOptions();
    document.getElementById("category-modal").classList.remove("hidden");
  },

  editCategory: (id) => {
    const cat = AppState.categories.find((c) => c.id === id);
    if (!cat) return;

    document.getElementById("category-modal-title").textContent =
      "Edit Category";
    document.getElementById("edit-category-id").value = cat.id;
    document.getElementById("category-name").value = cat.name;
    document.getElementById("category-slug").value = cat.slug || "";
    document.getElementById("category-description").value =
      cat.description || "";
    document.getElementById("category-parent").value = cat.parent_id || "";
    document.getElementById("delete-category-btn").classList.remove("hidden");
    Renderers.renderCategoryOptions();
    document.getElementById("category-modal").classList.remove("hidden");
  },

  saveCategory: async () => {
    const id = document.getElementById("edit-category-id").value;
    const categoryData = {
      id: id || null,
      name: document.getElementById("category-name").value,
      slug: document.getElementById("category-slug").value,
      description: document.getElementById("category-description").value,
      parent: document.getElementById("category-parent").value || null,
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
      Utils.showToast(error.message || "Failed to save category", "error");
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
      Utils.showToast(error.message || "Failed to delete category", "error");
    } finally {
      Utils.hideLoader();
    }
  },

  // ==================
  // PROFILE
  // ==================
  saveProfile: async (e) => {
    e.preventDefault();
    const name = document.getElementById("profile-display-name").value;
    const email = document.getElementById("profile-email-edit").value;

    AppState.currentUser.name = name;
    AppState.currentUser.email = email;

    document.getElementById("profile-name").textContent = name;
    document.getElementById("profile-email").textContent = email;
    document.getElementById("dropdown-user-name").textContent = name;
    document.getElementById("dropdown-user-email").textContent = email;

    Utils.showToast("Profile updated successfully", "success");
  },

  // Opens the styled modal instead of the native browser confirm()
  logoutUser: () => {
    document.getElementById("user-dropdown").classList.add("hidden");
    document.getElementById("confirm-logout-modal").classList.remove("hidden");
  },

  // Fired by the modal's Logout button
  confirmLogout: async () => {
    document.getElementById("confirm-logout-modal").classList.add("hidden");
    try {
      await API.logout(); // redirects to LOGIN_URL regardless of outcome
    } catch {
      // logout redirects regardless
    }
  },

  // ==================
  // HELPERS
  // ==================
  getBlogFormData: async () => {
    const content = AppState.editor ? AppState.editor.root.innerHTML : "";

    // If a file has been selected but not yet uploaded, upload it now
    const fileInput = document.getElementById("blog-image");
    const file = fileInput.files[0];
    console.log("Selected file:", file);

    if (file) {
      try {
        AppState.featuredImageUrl = await uploadToCloudinary(file);
      } catch (err) {
        console.error("Upload error:", err);
        Utils.showToast("Image upload failed", "error");
        throw new Error("Image upload failed"); // stop the post from saving
      }
    }

    return {
      title: document.getElementById("blog-title").value,
      slug:
        document.getElementById("blog-slug").value ||
        Utils.slugify(document.getElementById("blog-title").value),
      excerpt: document.getElementById("blog-excerpt").value,
      content,
      category: document.getElementById("blog-category").value,
      featuredImage: AppState.featuredImageUrl || null,
    };
  },

  resetBlogForm: () => {
    document.getElementById("blog-form").reset();
    if (AppState.editor) AppState.editor.setContents([]);
    AppState.featuredImageUrl = null;
    AppState.pendingFormData = null; // ← add this
    document.getElementById("image-preview").innerHTML = `
    <i class="fas fa-cloud-upload-alt"></i>
    <p>Click to upload image</p>
  `;
  },
};
