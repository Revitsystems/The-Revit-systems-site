// let button = document.getElementById("menu-btn");
// let side = document.getElementById("side-content");
// let main = document.getElementById("main-content");
// function decreaseSideBar() {
//   side.classList.toggle("decrease");
//   main.classList.toggle("increase");
// }

// //***** EVERYTHING THAT HAS TO DO WITH THE DATE */
// // List of abbreviated month names.
// // The position in the array corresponds to the month number (0–11).
// const monthNames = [
//   "Jan",
//   "Feb",
//   "Mar",
//   "Apr",
//   "May",
//   "Jun",
//   "Jul",
//   "Aug",
//   "Sept",
//   "Oct",
//   "Nov",
//   "Dec",
// ];

// // Create an object representing the current date and time
// const currentDate = new Date();

// // Select the HTML elements where we want to display the date parts
// const dayElement = document.getElementById("date");
// const monthElement = document.getElementById("month");
// const yearElement = document.getElementById("year");

// // Extract individual parts of the current date
// const currentDay = currentDate.getDate(); // 1–31
// const currentMonthIndex = currentDate.getMonth(); // 0–11
// const currentYear = currentDate.getFullYear(); // e.g., 2026

// // Convert month number to readable month name
// const currentMonthName = monthNames[currentMonthIndex];

// // Insert values into the page
// dayElement.innerText = currentDay + ",";
// monthElement.innerText = currentMonthName;
// yearElement.innerText = currentYear;

// //*********** SELECT THE PROFILE CONTAINER ELEMENT FROM THE DOM */
// let profileDiv = document.getElementById("profile-div");

// function profileShow() {
//   // Adds the "come-out" class if it's not there
//   // Removes it if it already exists
//   profileDiv.classList.toggle("come-out");
// }

// //*********** SELECT THE FILE INPUT ELEMENT FROM THE DOM */
// let imageInput = document.getElementById("ImgInput");

// // Select the <img> element where the preview will be displayed
// let imageDisplay = document.getElementById("thePreview");

// /**
//  * Displays a preview of the selected image file.
//  * This function reads the first selected file
//  * and generates a temporary URL for preview.
//  */
// function imagePreview() {
//   // Get the first selected file from the input
//   const file = imageInput.files[0];

//   // Check if a file was actually selected
//   if (file) {
//     // Create a temporary local URL for the selected file
//     // and assign it to the image source
//     imageDisplay.src = URL.createObjectURL(file);
//   }
// }

// let textArea = document.getElementById("the-text-area");

// textArea.addEventListener("click", function openText() {
//   const blogger = document.querySelector(".the-Blog-article-page-holder");

//   // Example: toggle a class
//   blogger.classList.toggle("show");
// });

// function cloneTextContentToTextareaTag() {
//   const blogger = document.getElementsByClassName(
//     "the-Blog-article-page-holder"
//   )[0];

//   // Example: toggle a class
//   blogger.classList.toggle("show");

//   const blogElement = document.getElementById("the-blog-article");

//   const blogText = blogElement.innerText;
//   console.log(blogText);

//   const textArea = document.getElementById("the-text-area");
//   textArea.value = blogText;
// }

// function closeElement() {
//   const blogger = document.getElementsByClassName(
//     "the-Blog-article-page-holder"
//   )[0];

//   // Example: toggle a class
//   blogger.classList.toggle("show");
// }

// function initializeContentEditableNormalization() {
//   document.querySelectorAll("[contenteditable]").forEach((element) => {
//     element.addEventListener("input", () => {
//       const isEmpty =
//         element.innerHTML === "<br>" || element.innerHTML.trim() === "";

//       if (isEmpty) {
//         element.innerHTML = "";
//       }
//     });
//   });
// }

// initializeContentEditableNormalization();

// //***************************************** */
// //******* THE CLOUDINARY SERVER UPLOAD CODE */
// //***************************************** */
// const CLOUD_NAME = "dmvltush8";
// const UPLOAD_PRESET = "revit_unsigned";

// const loader = document.getElementById("loader");
// const statusEl = document.getElementById("status-element");
// const imgInput = document.getElementById("ImgInput");

// let statusTimer = null;

// // --------------------
// // Utility: Clear Timer
// // --------------------
// function clearStatusTimer() {
//   if (statusTimer !== null) {
//     clearTimeout(statusTimer);
//     statusTimer = null;
//   }
// }

// // --------------------
// // Utility: Show Status
// // --------------------
// function showTemporaryStatus(message, type = "pass", duration = 3000) {
//   clearStatusTimer();

//   statusEl.textContent = message;
//   statusEl.classList.add("status-update", type);

//   statusTimer = setTimeout(() => {
//     statusEl.classList.remove("status-update", type);
//     clearStatusTimer(); // disallocate
//   }, duration);
// }

// // --------------------
// // Main Function
// // --------------------
// const sendToCloudinary = async (event) => {
//   loader.classList.add("show-face");

//   const theButtonClickedIdentifier = event.target.id;

//   try {
//     // =====================
//     // PRE-CONDITIONS
//     // =====================

//     const imageFile = imgInput.files?.[0];

//     if (!imageFile) {
//       throw new Error("No file selected.");
//     }

//     if (!imageFile.type.startsWith("image/")) {
//       throw new Error("Invalid file type. Only images allowed.");
//     }

//     // =====================
//     // BUILD REQUEST
//     // =====================

//     const formData = new FormData();
//     formData.append("file", imageFile);
//     formData.append("upload_preset", UPLOAD_PRESET);

//     // =====================
//     // NETWORK CALL
//     // =====================

//     const res = await axios.post(
//       `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
//       formData,
//       { headers: { "Content-Type": "multipart/form-data" } }
//     );

//     // =====================
//     // POST-CONDITIONS
//     // =====================

//     const imageUrl = res?.data?.secure_url;

//     if (!imageUrl) {
//       throw new Error("Upload failed: missing secure_url.");
//     }

//     if (typeof imageUrl !== "string" || !imageUrl.startsWith("https://")) {
//       throw new Error("Upload failed: invalid URL returned.");
//     }

//     // =====================
//     // DATABASE SAVE
//     // =====================

//     await sendToDatabase(imageUrl, theButtonClickedIdentifier);
//   } catch (error) {
//     // =====================
//     // EXCEPTION HANDLING
//     // =====================

//     console.error("Upload error:", error);

//     showTemporaryStatus(
//       error.message || "Image upload failed. Please try again.",
//       "fail"
//     );
//   } finally {
//     // =====================
//     // RESOURCE CLEANUP
//     // =====================

//     loader.classList.remove("show-face");
//   }
// };

// // --------------------
// // sendToDatabase Function
// // --------------------
// const sendToDatabase = async (cover_image_url, theIdentifier) => {
//   loader.classList.add("show-face");
//   console.log(theIdentifier);
//   try {
//     // --------------------
//     // PRE-CONDITIONS
//     // --------------------
//     const title = document.getElementById("blog-header")?.value.trim();
//     const excerpt = document.getElementById("blog-intro")?.value.trim();
//     const content = document.getElementById("the-text-area").value.trim();
//     const categories = document.querySelector("select")?.value;
//     const status = theIdentifier === "the-save-btn" ? "published" : "drafted";

//     console.log(content);
//     if (!title) throw new Error("Blog title cannot be empty.");
//     if (!excerpt) throw new Error("Blog excerpt cannot be empty.");
//     if (!content) throw new Error("Blog content cannot be empty");
//     if (!cover_image_url) throw new Error("Cover image URL is required.");
//     if (!categories) throw new Error("Please select a category.");

//     // --------------------
//     // Build request data
//     // --------------------
//     const blogData = {
//       title,
//       excerpt,
//       content,
//       categories,
//       cover_image_url,
//       status,
//     };

//     console.log("Blog data to save:", blogData);

//     // --------------------
//     // POST to server
//     // --------------------
//     const res = await axios.post(
//       `${window.baseURL}/api/posts/upload`,
//       blogData,
//       { headers: { "Content-Type": "application/json" } }
//     );

//     // --------------------
//     // POST-CONDITIONS
//     // --------------------
//     const data = res?.data;
//     if (!data || !data.message) {
//       throw new Error("Invalid response from server.");
//     }

//     // --------------------
//     // Handle Success
//     // --------------------
//     if (status === "published") {
//       console.log("✅ Blog Published", data);
//       showTemporaryStatus(data.message, "success");
//     } else {
//       console.log("✅ Blog Drafted", data);
//       showTemporaryStatus("Blog drafted successfully", "success");
//     }

//     resetUploadForm(); // reset the form
//   } catch (err) {
//     // --------------------
//     // Exception Handling
//     // --------------------

//     // err.response?.data?.message || err.message ||
//     // console.error("❌ Error saving blog:", err);
//     const message = "Failed to save blog.";
//     showTemporaryStatus(message, "fail");
//   } finally {
//     // --------------------
//     // Resource Cleanup
//     // --------------------
//     resetUploadForm(); // reset the form
//     loader.classList.remove("show-face");
//   }
// };

// const exitPreview = async () => {
//   const list = document.getElementById("get-list");
//   list.classList.remove("display");
// };

// const loadCounts = async () => {
//   try {
//     const { data } = await axios.get(`${window.baseURL}/blog/counts`);

//     if (!data) {
//       throw new Error("Invalid response structure");
//     }

//     updateCounts(data);
//   } catch (err) {
//     console.error("Failed to load counts:", err);
//     updateCounts([]);
//   }
// };

// const updateCounts = (data) => {
//   const publish = document.getElementById("the-published-number");
//   const draft = document.getElementById("the-draft-number");

//   const published =
//     data.find((item) => item.status === "published")?.count || 0;

//   const drafted = data.find((item) => item.status === "drafted")?.count || 0;

//   publish.innerText = Number(published);
//   draft.innerText = Number(drafted);
// };

// let currentPage = 1;
// const LIMIT = 10;

// const loadBlogTableByStatus = async (status, page = 1) => {
//   const list = document.getElementById("get-list");
//   list.classList.add("display");

//   try {
//     const { data } = await axios.get(`${window.baseURL}/blog/posts`, {
//       params: {
//         status,
//         page,
//         limit: LIMIT,
//       },
//     });

//     renderTable(data.posts);
//     currentPage = page;
//   } catch (err) {
//     console.error("Error fetching posts:", err);
//   }
// };

// const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// const renderTable = (data, status) => {
//   const tableBody = document.querySelector(".edit-tbody");
//   if (!tableBody || !data) return;

//   tableBody.innerHTML = data
//     .filter((data) => data.status === status)
//     .map((data, index) => {
//       return `
//           <tr class="edit-tr">
//             <td class="edit-td">${index + 1}</td>
//             <td class="edit-td">${data.title}</td>
//             <td class="edit-td">${data.excerpt}</td>
//             <td class="edit-td">${data.categories}</td>
//             <td class="edit-td">
//               ${capitalize(data.status)}
//             </td>
//             <td class="edit-td edit-actions">
//               ${generateActionButtons(data, status)}
//             </td>
//           </tr>
//         `;
//     })
//     .join("");
// };

// const generateActionButtons = (data, status) => {
//   if (status === "published") {
//     return `
//         <button class="edit-delete-btn" data-id="${data.id}">
//           Delete
//         </button>
//       `;
//   }

//   if (status === "drafted") {
//     return `
//         <button class="edit-publish-btn" data-id="${data.id}">
//           Publish
//         </button>
//         <button class="edit-delete-btn" data-id="${data.id}">
//           Delete
//         </button>
//       `;
//   }

//   return "";
// };

// function resetUploadForm() {
//   // Clear text inputs
//   document.getElementById("blog-header").value = "";
//   document.getElementById("blog-intro").value = "";
//   document.getElementById("the-text-area").value = "";
//   document.getElementById("text-header").innerText = "";
//   document.getElementById("text-paragraph").innerText = "";
//   // Reset select dropdown
//   const select = document.querySelector(".the-form select");
//   if (select) select.selectedIndex = 0;

//   // Reset image input & preview
//   const imgInput = document.getElementById("ImgInput");
//   const preview = document.getElementById("thePreview");
//   imgInput.value = "";
//   preview.src = "";
//   preview.alt = "";

//   // Optional: if you have preview styling, remove it
//   preview.style.display = "none";
// }

// document.addEventListener("DOMContentLoaded", () => {
//   loadCounts();
//   // Get user from localStorage
//   const user = JSON.parse(localStorage.getItem("user"));

//   if (!user) {
//     alert("No user data found. Please log in again.");
//     window.location.href = "./login.html"; // Redirect to login if not logged in
//     return;
//   }

//   // Inject user data into HTML
//   document.getElementById("user-name").textContent = user.username || "Unknown";
//   document.querySelector(".User-name").textContent = user.username || "Unknown";
//   document.querySelector(".User-email").textContent = user.email || "No email";
//   document.querySelector(".position").textContent =
//     user.role === "admin"
//       ? "Administrator"
//       : user.role === "superuser"
//       ? "Super User"
//       : "Staff";
// });

/**
 * Blog Admin Dashboard - JavaScript
 * All functionality for the admin dashboard
 */

// ============================================
// MOCK DATABASE
// ============================================
const mockDatabase = {
  posts: [
    {
      id: 1,
      title: "Getting Started with React",
      slug: "getting-started-with-react",
      excerpt: "Learn the basics of React and build your first application.",
      content:
        "React is a popular JavaScript library for building user interfaces. In this post, we'll explore the fundamentals...",
      category: "software-development",
      status: "published",
      createdAt: "2024-03-01",
      updatedAt: "2024-03-01",
      image: null,
    },
    {
      id: 2,
      title: "Building Your Brand Identity",
      slug: "building-your-brand-identity",
      excerpt: "Discover the key elements of creating a strong brand identity.",
      content:
        "Your brand identity is more than just a logo. It's the visual and emotional representation of your business...",
      category: "branding",
      status: "published",
      createdAt: "2024-03-02",
      updatedAt: "2024-03-02",
      image: null,
    },
    {
      id: 3,
      title: "Startup Growth Strategies",
      slug: "startup-growth-strategies",
      excerpt: "Proven strategies to accelerate your startup's growth.",
      content:
        "Growing a startup requires a combination of smart strategies, persistence, and adaptability...",
      category: "business-building",
      status: "draft",
      createdAt: "2024-03-03",
      updatedAt: "2024-03-04",
      image: null,
    },
    {
      id: 4,
      title: "Social Media Marketing Tips",
      slug: "social-media-marketing-tips",
      excerpt: "Maximize your social media presence with these expert tips.",
      content:
        "Social media has become an essential tool for businesses to connect with their audience...",
      category: "media",
      status: "published",
      createdAt: "2024-03-05",
      updatedAt: "2024-03-05",
      image: null,
    },
    {
      id: 5,
      title: "JavaScript Best Practices",
      slug: "javascript-best-practices",
      excerpt: "Write cleaner, more maintainable JavaScript code.",
      content:
        "Following best practices in JavaScript can significantly improve your code quality...",
      category: "software-development",
      status: "draft",
      createdAt: "2024-03-06",
      updatedAt: "2024-03-07",
      image: null,
    },
    {
      id: 6,
      title: "Content Creation Guide",
      slug: "content-creation-guide",
      excerpt:
        "Learn how to create engaging content that resonates with your audience.",
      content:
        "Content is king in today's digital landscape. Creating valuable content...",
      category: "media",
      status: "published",
      createdAt: "2024-03-08",
      updatedAt: "2024-03-08",
      image: null,
    },
    {
      id: 7,
      title: "E-commerce Strategies",
      slug: "ecommerce-strategies",
      excerpt:
        "Boost your online sales with these proven e-commerce strategies.",
      content:
        "Running a successful e-commerce business requires understanding your customers...",
      category: "business-building",
      status: "draft",
      createdAt: "2024-03-09",
      updatedAt: "2024-03-09",
      image: null,
    },
    {
      id: 8,
      title: "Logo Design Principles",
      slug: "logo-design-principles",
      excerpt: "Essential principles for creating memorable logos.",
      content:
        "A great logo is simple, memorable, and effectively communicates your brand...",
      category: "branding",
      status: "published",
      createdAt: "2024-03-10",
      updatedAt: "2024-03-10",
      image: null,
    },
  ],
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
};

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
  posts: [...mockDatabase.posts],
  user: { ...mockDatabase.user },
  pagination: {
    published: { page: 1, limit: 5, total: 0 },
    drafts: { page: 1, limit: 5, total: 0 },
    all: { page: 1, limit: 10, total: 0 },
  },
  currentFilter: "all",
  editingPost: null,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show/Hide Loader
 */
function showLoader(message = "Loading...") {
  const loader = document.getElementById("loader");
  loader.querySelector("p").textContent = message;
  loader.classList.remove("hidden");
}

function hideLoader() {
  document.getElementById("loader").classList.add("hidden");
}

/**
 * Toast Notifications
 */
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "check-circle",
    error: "times-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
  };

  toast.innerHTML = `
        <i class="fas fa-${icons[type]}"></i>
        <span>${message}</span>
    `;

  container.appendChild(toast);

  // Remove toast after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

/**
 * Format Date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get Category Label
 */
function getCategoryLabel(category) {
  const labels = {
    "software-development": "Software Development",
    branding: "Branding",
    "business-building": "Business Building",
    media: "Media",
  };
  return labels[category] || category;
}

/**
 * Generate Slug from Title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================
// PAGINATION FUNCTIONS
// ============================================

function getPaginatedPosts(posts, page, limit) {
  const start = (page - 1) * limit;
  const end = start + limit;
  return posts.slice(start, end);
}

function renderPagination(
  containerId,
  currentPage,
  totalPages,
  type,
  callback
) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (totalPages <= 1) return;

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      state.pagination[type].page = currentPage - 1;
      callback();
    }
  };
  container.appendChild(prevBtn);

  // Page info
  const pageInfo = document.createElement("span");
  pageInfo.className = "page-info";
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  container.appendChild(pageInfo);

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      state.pagination[type].page = currentPage + 1;
      callback();
    }
  };
  container.appendChild(nextBtn);
}

// ============================================
// POSTS FUNCTIONS
// ============================================

function getPublishedPosts() {
  return state.posts.filter((post) => post.status === "published");
}

function getDraftPosts() {
  return state.posts.filter((post) => post.status === "draft");
}

function getFilteredPosts() {
  if (state.currentFilter === "published") return getPublishedPosts();
  if (state.currentFilter === "draft") return getDraftPosts();
  return state.posts;
}

function updateStats() {
  const published = getPublishedPosts().length;
  const drafts = getDraftPosts().length;
  const total = state.posts.length;

  document.getElementById("published-count").textContent = published;
  document.getElementById("drafts-count").textContent = drafts;
  document.getElementById("total-count").textContent = total;

  // Update pagination totals
  state.pagination.published.total = Math.ceil(
    published / state.pagination.published.limit
  );
  state.pagination.drafts.total = Math.ceil(
    drafts / state.pagination.drafts.limit
  );
  state.pagination.all.total = Math.ceil(total / state.pagination.all.limit);
}

function renderPostRow(post, showActions = true) {
  const actions = showActions
    ? `
        <div class="action-bts">
            <button class="action-btn edit" onclick="openEditModal(${
              post.id
            })" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" onclick="openDeleteModal(${
              post.id
            })" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
            ${
              post.status === "draft"
                ? `
                <button class="action-btn publish" onclick="publishPost(${post.id})" title="Publish">
                    <i class="fas fa-check"></i>
                </button>
            `
                : ""
            }
        </div>
    `
    : "";

  return `
        <tr data-id="${post.id}">
            <td>
                <strong>${post.title}</strong>
                <br><small class="text-muted">${post.slug}</small>
            </td>
            <td>${getCategoryLabel(post.category)}</td>
            <td><span class="status-badge ${post.status}">${
    post.status
  }</span></td>
            <td>${formatDate(post.createdAt)}</td>
            <td>${actions}</td>
        </tr>
    `;
}

function renderRecentPosts() {
  const tbody = document.getElementById("recent-posts-table");
  const recent = state.posts.slice(0, 5);
  tbody.innerHTML = recent.map((post) => renderPostRow(post)).join("");
}

function renderAllPosts() {
  const tbody = document.getElementById("all-posts-table");
  const filtered = getFilteredPosts();
  const { page, limit } = state.pagination.all;
  const paginated = getPaginatedPosts(filtered, page, limit);

  tbody.innerHTML = paginated.map((post) => renderPostRow(post)).join("");

  const totalPages = Math.ceil(filtered.length / limit);
  renderPagination("posts-pagination", page, totalPages, "all", renderAllPosts);
}

function renderPublishedModal() {
  const tbody = document.getElementById("published-table");
  const published = getPublishedPosts();
  const { page, limit } = state.pagination.published;
  const paginated = getPaginatedPosts(published, page, limit);

  if (paginated.length === 0) {
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
    tbody.innerHTML = paginated
      .map(
        (post) => `
            <tr data-id="${post.id}">
                <td>
                    <strong>${post.title}</strong>
                    <br><small>${post.slug}</small>
                </td>
                <td>${getCategoryLabel(post.category)}</td>
                <td>${formatDate(post.createdAt)}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="openEditModal(${
                          post.id
                        })" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="openDeleteModal(${
                          post.id
                        })" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `
      )
      .join("");
  }

  const totalPages = Math.ceil(published.length / limit) || 1;
  renderPagination(
    "published-pagination",
    page,
    totalPages,
    "published",
    renderPublishedModal
  );
}

function renderDraftsModal() {
  const tbody = document.getElementById("drafts-table");
  const drafts = getDraftPosts();
  const { page, limit } = state.pagination.drafts;
  const paginated = getPaginatedPosts(drafts, page, limit);

  if (paginated.length === 0) {
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
    tbody.innerHTML = paginated
      .map(
        (post) => `
            <tr data-id="${post.id}">
                <td>
                    <strong>${post.title}</strong>
                    <br><small>${post.slug}</small>
                </td>
                <td>${getCategoryLabel(post.category)}</td>
                <td>${formatDate(post.updatedAt)}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="openEditModal(${
                          post.id
                        })" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="openDeleteModal(${
                          post.id
                        })" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="action-btn publish" onclick="publishPost(${
                          post.id
                        })" title="Publish">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `
      )
      .join("");
  }

  const totalPages = Math.ceil(drafts.length / limit) || 1;
  renderPagination(
    "drafts-pagination",
    page,
    totalPages,
    "drafts",
    renderDraftsModal
  );
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

function openPublishedModal() {
  state.pagination.published.page = 1;
  renderPublishedModal();
  openModal("published-modal");
}

function openDraftsModal() {
  state.pagination.drafts.page = 1;
  renderDraftsModal();
  openModal("drafts-modal");
}

function openEditModal(postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;

  state.editingPost = post;

  document.getElementById("edit-id").value = post.id;
  document.getElementById("edit-title").value = post.title;
  document.getElementById("edit-slug").value = post.slug;
  document.getElementById("edit-excerpt").value = post.excerpt;
  document.getElementById("edit-content").value = post.content;
  document.getElementById("edit-category").value = post.category;
  document.getElementById("edit-status-display").textContent =
    post.status === "published" ? "Published" : "Draft";
  document.getElementById("edit-status-display").style.color =
    post.status === "published" ? "var(--success)" : "var(--warning)";

  openModal("edit-modal");
}

function openDeleteModal(postId) {
  document.getElementById("delete-id").value = postId;
  openModal("delete-modal");
}

// ============================================
// POST OPERATIONS
// ============================================

function savePost(postData, status) {
  showLoader("Saving post...");

  // Simulate API delay
  setTimeout(() => {
    const newPost = {
      id:
        state.posts.length > 0
          ? Math.max(...state.posts.map((p) => p.id)) + 1
          : 1,
      ...postData,
      status,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    state.posts.unshift(newPost);

    updateStats();
    renderRecentPosts();
    renderAllPosts();

    hideLoader();
    showToast(`Post saved as ${status} successfully!`, "success");

    // Reset form
    document.getElementById("blog-form").reset();
    document.getElementById("image-preview").innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Click to upload image</p>
        `;
  }, 1000);
}

function updatePost(postId, updates, newStatus = null) {
  showLoader("Updating post...");

  setTimeout(() => {
    const index = state.posts.findIndex((p) => p.id === postId);
    if (index === -1) {
      hideLoader();
      showToast("Post not found!", "error");
      return;
    }

    state.posts[index] = {
      ...state.posts[index],
      ...updates,
      updatedAt: new Date().toISOString().split("T")[0],
      ...(newStatus && { status: newStatus }),
    };

    updateStats();
    renderRecentPosts();
    renderAllPosts();

    // Update modals if open
    if (
      !document.getElementById("published-modal").classList.contains("hidden")
    ) {
      renderPublishedModal();
    }
    if (!document.getElementById("drafts-modal").classList.contains("hidden")) {
      renderDraftsModal();
    }

    hideLoader();
    showToast("Post updated successfully!", "success");
  }, 800);
}

function deletePost(postId) {
  showLoader("Deleting post...");

  setTimeout(() => {
    state.posts = state.posts.filter((p) => p.id !== postId);

    updateStats();
    renderRecentPosts();
    renderAllPosts();

    // Update modals if open
    if (
      !document.getElementById("published-modal").classList.contains("hidden")
    ) {
      renderPublishedModal();
    }
    if (!document.getElementById("drafts-modal").classList.contains("hidden")) {
      renderDraftsModal();
    }

    hideLoader();
    showToast("Post deleted successfully!", "success");
  }, 800);
}

function publishPost(postId) {
  showLoader("Publishing post...");

  setTimeout(() => {
    const index = state.posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      state.posts[index].status = "published";
      state.posts[index].updatedAt = new Date().toISOString().split("T")[0];

      updateStats();
      renderRecentPosts();
      renderAllPosts();

      // Update modals if open
      if (
        !document.getElementById("published-modal").classList.contains("hidden")
      ) {
        renderPublishedModal();
      }
      if (
        !document.getElementById("drafts-modal").classList.contains("hidden")
      ) {
        renderDraftsModal();
      }

      hideLoader();
      showToast("Post published successfully!", "success");
    }
  }, 800);
}

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
  document
    .getElementById("published-card")
    .addEventListener("click", openPublishedModal);
  document
    .getElementById("drafts-card")
    .addEventListener("click", openDraftsModal);

  // Modal close buttons
  document.querySelectorAll(".close-btn, .modal-overlay").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modalId = btn.dataset.modal || btn.closest(".modal").id;
      closeModal(modalId);
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
      state.pagination.all.page = 1;
      renderAllPosts();
    });
  });

  // Notification dropdown
  const notificationBtn = document.getElementById("notification-btn");
  const notificationDropdown = document.getElementById("notification-dropdown");

  notificationBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    notificationDropdown.classList.toggle("hidden");
    document.getElementById("user-dropdown").classList.add("hidden");
  });

  // User dropdown
  const userBtn = document.getElementById("user-btn");
  const userDropdown = document.getElementById("user-dropdown");

  userBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("hidden");
    notificationDropdown.classList.add("hidden");
  });

  // Close dropdowns on outside click
  document.addEventListener("click", () => {
    notificationDropdown.classList.add("hidden");
    userDropdown.classList.add("hidden");
  });

  // Mark all notifications as read
  document.querySelector(".mark-all-read").addEventListener("click", () => {
    document.querySelectorAll(".notification-item").forEach((item) => {
      item.classList.remove("unread");
    });
    document.querySelector(".notification-btn .badge").style.display = "none";
    showToast("All notifications marked as read", "info");
  });

  // Blog form submission
  document.getElementById("blog-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const postData = {
      title: document.getElementById("blog-title").value,
      slug: document.getElementById("blog-slug").value,
      excerpt: document.getElementById("blog-excerpt").value,
      content: document.getElementById("blog-content").value,
      category: document.getElementById("blog-category").value,
      image: null,
    };

    savePost(postData, "published");
  });

  // Save as draft button
  document.getElementById("save-draft-btn").addEventListener("click", () => {
    const postData = {
      title: document.getElementById("blog-title").value || "Untitled Draft",
      slug:
        document.getElementById("blog-slug").value ||
        generateSlug(document.getElementById("blog-title").value || "untitled"),
      excerpt: document.getElementById("blog-excerpt").value,
      content: document.getElementById("blog-content").value,
      category:
        document.getElementById("blog-category").value ||
        "software-development",
      image: null,
    };

    savePost(postData, "draft");
  });

  // Auto-generate slug from title
  document.getElementById("blog-title").addEventListener("input", (e) => {
    const slugInput = document.getElementById("blog-slug");
    if (!slugInput.value || slugInput.dataset.auto === "true") {
      slugInput.value = generateSlug(e.target.value);
      slugInput.dataset.auto = "true";
    }
  });

  document.getElementById("blog-slug").addEventListener("input", (e) => {
    e.target.dataset.auto = e.target.value ? "false" : "true";
  });

  // Image upload preview
  document.getElementById("blog-image").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById("image-preview").innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                `;
      };
      reader.readAsDataURL(file);
    }
  });

  // Edit form buttons
  document.getElementById("edit-publish-btn").addEventListener("click", () => {
    const postId = parseInt(document.getElementById("edit-id").value);
    const updates = {
      title: document.getElementById("edit-title").value,
      slug: document.getElementById("edit-slug").value,
      excerpt: document.getElementById("edit-excerpt").value,
      content: document.getElementById("edit-content").value,
      category: document.getElementById("edit-category").value,
    };

    updatePost(postId, updates, "published");
    closeModal("edit-modal");
  });

  document.getElementById("edit-draft-btn").addEventListener("click", () => {
    const postId = parseInt(document.getElementById("edit-id").value);
    const updates = {
      title: document.getElementById("edit-title").value,
      slug: document.getElementById("edit-slug").value,
      excerpt: document.getElementById("edit-excerpt").value,
      content: document.getElementById("edit-content").value,
      category: document.getElementById("edit-category").value,
    };

    updatePost(postId, updates, "draft");
    closeModal("edit-modal");
  });

  // Delete confirmation
  document
    .getElementById("confirm-delete-btn")
    .addEventListener("click", () => {
      const postId = parseInt(document.getElementById("delete-id").value);
      deletePost(postId);
      closeModal("delete-modal");
    });
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

// Make showSection globally accessible
window.showSection = showSection;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.publishPost = publishPost;

// ============================================
// INITIALIZATION
// ============================================

function init() {
  // Set current date
  const dateOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
    weekday: "long",
  };
  document.getElementById("current-date").textContent =
    new Date().toLocaleDateString("en-US", dateOptions);

  // Set last login
  document.getElementById("last-login").textContent = state.user.lastLogin;

  // Initialize stats
  updateStats();

  // Render posts
  renderRecentPosts();
  renderAllPosts();

  // Setup event listeners
  setupEventListeners();

  // Show welcome toast
  setTimeout(() => {
    showToast("Welcome back, Admin!", "info");
  }, 500);
}

// Start the app when DOM is ready
document.addEventListener("DOMContentLoaded", init);
