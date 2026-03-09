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

// --- Mock Database ---
let posts = [
  {
    id: 1,
    title: "Building in 2024",
    category: "software development",
    status: "published",
    content: "Sample content",
  },
  {
    id: 2,
    title: "Branding 101",
    category: "branding",
    status: "draft",
    content: "Drafting logic",
  },
];

// --- Initialize ---
document.addEventListener("DOMContentLoaded", () => {
  updateDashboard();
  document.getElementById("current-date").innerText = new Date().toDateString();
});

// --- UI Logic ---
function toggleDropdown(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "flex" ? "none" : "flex";
}

function showLoader(show) {
  document.getElementById("loader").style.display = show ? "flex" : "none";
}

function showAlert(msg, type = "success") {
  const box = document.getElementById("alert-box");
  const message = document.getElementById("alert-message");
  message.innerText = msg;
  box.style.borderBottomColor = type === "success" ? "#28a745" : "#dc3545";
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), 3000);
}

// --- Dashboard Stats & Table ---
function updateDashboard() {
  const pub = posts.filter((p) => p.status === "published");
  const draft = posts.filter((p) => p.status === "draft");

  document.getElementById("pub-count").innerText = pub.length;
  document.getElementById("draft-count").innerText = draft.length;

  const tbody = document.getElementById("db-body");
  tbody.innerHTML = posts
    .map(
      (post) => `
        <tr>
            <td>${post.title}</td>
            <td>${post.category}</td>
            <td><span class="badge ${post.status}">${post.status}</span></td>
            <td><button onclick="editPost(${post.id})"><i class="fa-solid fa-pen"></i></button></td>
        </tr>
    `
    )
    .join("");
}

// --- Save Function (Form) ---
async function handleSave(status) {
  const title = document.getElementById("post-title").value;
  if (!title) return showAlert("Please enter a title", "error");

  showLoader(true);
  // Simulate API call
  setTimeout(() => {
    const newPost = {
      id: Date.now(),
      title: title,
      category: document.getElementById("post-category").value,
      status: status,
      content: document.getElementById("post-content").value,
    };
    posts.push(newPost);
    updateDashboard();
    showLoader(false);
    showAlert(`Post ${status} successfully!`);
    clearForm();
  }, 1500);
}

function clearForm() {
  document.getElementById("post-title").value = "";
  document.getElementById("post-content").value = "";
}

// --- Modal Logic ---
function openModal(modalId, type) {
  document.getElementById(modalId).style.display = "flex";
  if (type) renderList(type);
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

function renderList(type) {
  const container = document.getElementById("posts-container");
  document.getElementById("modal-list-title").innerText =
    type.toUpperCase() + " POSTS";

  const filtered = posts.filter((p) => p.status === type);
  container.innerHTML = filtered
    .map(
      (p) => `
        <div class="post-item">
            <span>${p.title}</span>
            <div class="form-buttons">
                <button onclick="editPost(${
                  p.id
                })"><i class="fa-solid fa-edit"></i></button>
                <button onclick="deletePost(${
                  p.id
                })" style="color:red"><i class="fa-solid fa-trash"></i></button>
                ${
                  type === "draft"
                    ? `<button onclick="quickPublish(${p.id})">Publish</button>`
                    : ""
                }
            </div>
        </div>
    `
    )
    .join("");
}

let activeEditId = null;
function editPost(id) {
  const post = posts.find((p) => p.id === id);
  activeEditId = id;
  document.getElementById("edit-title").value = post.title;
  document.getElementById("edit-category").value = post.category;
  document.getElementById("edit-content").value = post.content;

  closeModal("list-modal");
  openModal("edit-modal");
}

function handleEditSave(newStatus) {
  showLoader(true);
  setTimeout(() => {
    const index = posts.findIndex((p) => p.id === activeEditId);
    posts[index].title = document.getElementById("edit-title").value;
    posts[index].category = document.getElementById("edit-category").value;
    posts[index].content = document.getElementById("edit-content").value;
    posts[index].status = newStatus;

    updateDashboard();
    showLoader(false);
    closeModal("edit-modal");
    showAlert("Post updated successfully");
  }, 1000);
}

function deletePost(id) {
  if (confirm("Are you sure?")) {
    posts = posts.filter((p) => p.id !== id);
    updateDashboard();
    closeModal("list-modal");
    showAlert("Post deleted", "error");
  }
}

function loadMore() {
  showLoader(true);
  setTimeout(() => {
    showLoader(false);
    showAlert("No more posts in database");
  }, 800);
}
