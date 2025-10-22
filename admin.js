let button = document.getElementById("menu-btn");
let side = document.getElementById("side-content");
let main = document.getElementById("main-content");
function decreaseSideBar() {
  side.classList.toggle("decrease");
  main.classList.toggle("increase");
}
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

let date = new Date();
console.log(new Date());
let day = document.getElementById("date");
let month = document.getElementById("month");
let year = document.getElementById("year");
day.innerText = date.getDate() + ",";
month.innerText = months[date.getUTCMonth()];
year.innerText = date.getFullYear();

let profileDiv = document.getElementById("profile-div");
function profileShow() {
  profileDiv.classList.toggle("come-out");
}
let imageInput = document.getElementById("ImgInput");
let imageDisplay = document.getElementById("thePreview");

function imagePreview() {
  const file = imageInput.files[0];
  if (file) {
    imageDisplay.src = URL.createObjectURL(file);
  }
}

let textArea = document.getElementById("the-text-area");

textArea.addEventListener("click", function openText() {
  const blogger = document.getElementsByClassName(
    "the-Blog-article-page-holder"
  )[0];

  // Example: toggle a class
  blogger.classList.toggle("show");
});

let theHtmlFromTheBlog;
function movePlace() {
  const blogger = document.getElementsByClassName(
    "the-Blog-article-page-holder"
  )[0];

  // Example: toggle a class
  blogger.classList.toggle("show");
  const theBlogArticle = document.getElementById("the-blog-article").innerHTML;
  theHtmlFromTheBlog = theBlogArticle;
  console.log(theBlogArticle);
  const theBlogArticleText =
    document.getElementById("the-blog-article").innerText;
  console.log(theBlogArticleText);
  const theTextArea = document.getElementById("the-text-area");
  theTextArea.innerText = theBlogArticleText;
}

function moveOut() {
  const blogger = document.getElementsByClassName(
    "the-Blog-article-page-holder"
  )[0];

  // Example: toggle a class
  blogger.classList.toggle("show");
}

let theOptionsPart = document.getElementById("the-options-part");

function dropDown() {
  theOptionsPart.classList.add("pick");
}

function createHeader() {
  const header = document.createElement("h2");
  header.className = "sub-headers";
  header.classList.add("header");
  header.setAttribute("contenteditable", "true");
  header.setAttribute("data-placeholder", "Enter header...");

  const blogArticle = document.getElementById("the-blog-article");
  blogArticle.appendChild(header);
  header.focus();

  // 🧠 Delete header on Backspace if empty
  header.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && header.textContent.trim() === "") {
      e.preventDefault();
      const prev = header.previousElementSibling;
      header.remove();
      if (prev) prev.focus();
    }
  });

  the();
}

function createTextTag() {
  const paragraph = document.createElement("p");
  paragraph.className = "paragraph-text";
  paragraph.setAttribute("contenteditable", "true");
  paragraph.setAttribute("data-placeholder", "Type something...");

  const blogArticle = document.getElementById("the-blog-article");
  blogArticle.appendChild(paragraph);
  paragraph.focus();

  // 🧠 Delete paragraph on Backspace if empty
  paragraph.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && paragraph.textContent.trim() === "") {
      e.preventDefault();
      const prev = paragraph.previousElementSibling;
      paragraph.remove();
      if (prev) prev.focus();
    }
  });

  the();
}

function createItalic() {
  const italicBlock = document.createElement("p");
  italicBlock.className = "italic-text";
  italicBlock.setAttribute("contenteditable", "true");
  italicBlock.setAttribute("data-placeholder", "Type italic text...");

  const blogArticle = document.getElementById("the-blog-article");
  blogArticle.appendChild(italicBlock);
  italicBlock.focus();

  // 🧠 Delete italic block on Backspace if empty
  italicBlock.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && italicBlock.textContent.trim() === "") {
      e.preventDefault();
      const prev = italicBlock.previousElementSibling;
      italicBlock.remove();
      if (prev) prev.focus();
    }
  });

  the();
}

function createOrdeorangeList() {
  const olList = document.createElement("ol");
  olList.className = "order-list";
  olList.classList.add("questions");
  const listItem = document.createElement("li");
  listItem.className = "order-list-li";
  listItem.setAttribute("contenteditable", "true");
  listItem.setAttribute("data-placeholder", "List item...");
  olList.appendChild(listItem);
  const blogArticle = document.getElementById("the-blog-article");
  blogArticle.appendChild(olList);

  // Handle Enter and Backspace for any <li> in this <ol>
  olList.addEventListener("keydown", (e) => {
    const currentLi = e.target;

    if (currentLi.tagName !== "LI") return;

    // ENTER → create new list item
    if (e.key === "Enter") {
      e.preventDefault();

      const newLi = document.createElement("li");
      newLi.className = "order-list-li";
      newLi.setAttribute("contenteditable", "true");
      newLi.setAttribute("data-placeholder", "List item...");
      olList.insertBefore(newLi, currentLi.nextSibling);
      newLi.focus();
    }

    // BACKSPACE → remove empty list item
    if (e.key === "Backspace" && currentLi.textContent.trim() === "") {
      e.preventDefault();

      const previous = currentLi.previousElementSibling;
      currentLi.remove();

      if (previous) previous.focus();
      else if (olList.children.length === 0) olList.remove();
    }
  });
  // Auto-focus on first item
  listItem.focus();

  listItem.classList("questions");
  // Reinitialize any editor logic
  the();
}

function createUnordeorangeList() {
  const unList = document.createElement("ul");
  unList.className = "un-order-list";
  unList.classList.add("questions");
  const list = document.createElement("li");
  list.className = "un-order-list-li";
  list.setAttribute("contenteditable", "true");
  list.setAttribute("data-placeholder", "List item...");
  unList.appendChild(list);
  const blogArticle = document.getElementById("the-blog-article");
  blogArticle.appendChild(unList);

  // Handle Enter and Backspace inside any <li> in this <ul>
  unList.addEventListener("keydown", (e) => {
    const currentLi = e.target;

    // Ensure we're typing inside an <li>
    if (currentLi.tagName !== "LI") return;

    // ENTER → create new list item
    if (e.key === "Enter") {
      e.preventDefault();

      const newLi = document.createElement("li");
      newLi.className = "un-order-list-li";
      newLi.setAttribute("contenteditable", "true");
      newLi.setAttribute("data-placeholder", "List item...");
      unList.insertBefore(newLi, currentLi.nextSibling);
      newLi.focus();
    }

    // BACKSPACE → remove empty <li>
    if (e.key === "Backspace" && currentLi.textContent.trim() === "") {
      e.preventDefault();

      const previous = currentLi.previousElementSibling;
      currentLi.remove();

      if (previous) previous.focus();
      else if (unList.children.length === 0) unList.remove();
    }
  });

  list.focus();
  the();
}

function the() {
  document.querySelectorAll("[contenteditable]").forEach((el) => {
    el.addEventListener("input", () => {
      if (el.innerHTML === "<br>" || el.innerHTML.trim() === "") {
        el.innerHTML = "";
      }
    });
  });
}

the();

// the cloudinary server upload code
const CLOUD_NAME = "dmvltush8";
const UPLOAD_PRESET = "revit_unsigned";

let loader = document.getElementById("loader");
let theIdentifier;
let statusEl = document.getElementById("status-element");

sendToCloudinary = async (event) => {
  console.log(event.target.id);
  theIdentifier = event.target.id;
  const imageFile = document.getElementById("ImgInput").files[0];
  if (!imageFile) {
    alert("Please select an image first.");
    return;
  }

  loader.classList.add("show-face");

  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    // Upload to Cloudinary
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    const theImageUrl = res.data.secure_url;
    console.log("✅ Image uploaded:", theImageUrl);

    // Now save to database
    await sendToDatabase(theImageUrl);
  } catch (error) {
    console.error("❌ Upload Drafts:", error);
    statusEl.textContent = `error when sending image ${error}`;
    statusEl.classList.add("status-update", "fail");
    setTimeout(() => statusEl.classList.remove("status-update"), 3000);
    loader.classList.remove("show-face");
  }
};

const sendToDatabase = async (cover_image_url) => {
  const title = document.getElementById("blog-header").value.trim();
  const excerpt = document.getElementById("blog-intro").value.trim();
  const content =
    typeof theHtmlFromTheBlog !== "undefined" ? theHtmlFromTheBlog : "";
  const categories = document.querySelector("select").value;
  const status = theIdentifier === "the-save-btn" ? "published" : "drafted";

  console.log({
    title,
    excerpt,
    content,
    categories,
    cover_image_url,
  });

  const blogData = {
    title,
    excerpt,
    content,
    categories,
    cover_image_url,
    status,
  };

  try {
    const res = await axios.post(
      `${window.baseURL}/api/posts/upload`,
      blogData,
      { headers: { "Content-Type": "application/json" } }
    );

    const data = res.data;

    if (status === "published") {
      console.log("✅ Saved Published", res.data);
      statusEl.textContent = data.message;
      statusEl.classList.add("status-update");
      setTimeout(() => statusEl.classList.remove("status-update"), 3000);
      loader.classList.remove("show-face");
    } else {
      console.log("✅ Saved to draft", res.data);
      statusEl.textContent = "blog drafted successfully";
      statusEl.classList.add("status-update");
      setTimeout(() => statusEl.classList.remove("status-update"), 3000);
      loader.classList.remove("show-face");
    }

    loader.classList.remove("show-face");
    let load = document.getElementById("load");
    resetUploadForm();
  } catch (err) {
    console.error("❌ Upload Drafts:", err);
    statusEl.textContent = data.message;
    statusEl.classList.add("status-update");
    statusEl.classList.add("fail");
    setTimeout(() => statusEl.classList.remove("status-update"), 3000);
    loader.classList.remove("show-face");
  }
};

const exitPreview = async () => {
  const list = document.getElementById("get-list");
  list.classList.remove("display");
};

const gettingStatusBloggerSuccessful = async () => {
  console.log("meat");
  const list = document.getElementById("get-list");
  list.classList.add("display");
  try {
    const { data } = await axios.get(`${window.baseURL}/blog/status-counts`);

    // Extract counts
    const published =
      data.counts.find((item) => item.status === "published")?.count || 0;
    const drafted =
      data.counts.find((item) => item.status === "drafted")?.count || 0;

    // Display counts
    draft.innerText = drafted;
    publish.innerText = published;

    // === Render posts into the table ===
    const tableBody = document.querySelector(".edit-tbody");
    if (tableBody && data.posts) {
      tableBody.innerHTML = data.posts
        .filter((post) => post.status === "published")
        .map((post, index) => {
          return `
            <tr class="edit-tr">
              <td class="edit-td" data-label="#">${index + 1}</td>
              <td class="edit-td" data-label="Title">${post.title}</td> 
              <td class="edit-td" data-label="Excerpt">${post.excerpt}</td>
              <td class="edit-td" data-label="Categories">${
                post.categories
              }</td>
                <td class="edit-td" data-label="Status">${
                  post.status.charAt(0).toUpperCase() + post.status.slice(1)
                }</td>
            
              <td class="edit-td edit-actions" data-label="Action">
                <button class="edit-delete-btn" data-id="${
                  post.id
                }">Delete</button>
              </td>
            </tr>
          `;
        })
        .join("");
    }

    // === Delete button event listeners ===
    document.querySelectorAll(".edit-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const postId = e.target.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this post?")) {
          try {
            await axios.delete(`${window.baseURL}/blog/${postId}`);
            alert("Post deleted successfully!");
            gettingStatusBlog(); // refresh table
          } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post.");
          }
        }
      });
    });
  } catch (err) {
    console.error("Error fetching posts:", err);
  }
};
const gettingStatusBloggerDraft = async () => {
  const list = document.getElementById("get-list");
  list.classList.add("display");

  try {
    const { data } = await axios.get(`${window.baseURL}/blog/status-counts`);

    // Extract counts
    const published =
      data.counts.find((item) => item.status === "published")?.count || 0;
    const drafted =
      data.counts.find((item) => item.status === "drafted")?.count || 0;

    // Display counts
    draft.innerText = drafted;
    publish.innerText = published;

    // === Render posts into the table ===
    const tableBody = document.querySelector(".edit-tbody");
    if (tableBody && data.posts) {
      tableBody.innerHTML = data.posts
        .filter((post) => post.status === "drafted")
        .map((post, index) => {
          return `
            <tr class="edit-tr">
              <td class="edit-td" data-label="#">${index + 1}</td>
              <td class="edit-td" data-label="Title">${post.title}</td>
              <td class="edit-td" data-label="Excerpt">${post.excerpt}</td>
              <td class="edit-td" data-label="Categories">${
                post.categories
              }</td>
              <td class="edit-td" data-label="Status">${
                post.status.charAt(0).toUpperCase() + post.status.slice(1)
              }</td>
              <td class="edit-td edit-actions" data-label="Action">
                <button class="edit-publish-btn" data-id="${
                  post.id
                }">Publish</button>
                <button class="edit-delete-btn" data-id="${
                  post.id
                }">Delete</button>
              </td>
            </tr>
          `;
        })
        .join("");
    }

    // === DELETE POST EVENT LISTENER ===
    document.querySelectorAll(".edit-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const postId = e.target.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this post?")) {
          try {
            await axios.delete(`${window.baseURL}/blog/${postId}`);
            alert("Post deleted successfully!");
            gettingStatusBloggerDraft(); // refresh
          } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post.");
          }
        }
      });
    });

    // === PUBLISH POST EVENT LISTENER ===
    document.querySelectorAll(".edit-publish-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const postId = e.target.getAttribute("data-id");
        if (confirm("Do you want to publish this post?")) {
          try {
            btn.disabled = true;
            btn.innerText = "Publishing...";
            await axios.put(`${window.baseURL}/blog/publish/${postId}`);
            alert("Post published successfully!");
            gettingStatusBloggerDraft(); // refresh table
          } catch (error) {
            console.error("Error publishing post:", error);
            alert("Failed to publish post.");
          } finally {
            btn.disabled = false;
            btn.innerText = "Publish";
          }
        }
      });
    });
  } catch (err) {
    console.error("Error fetching posts:", err);
  }
};

function resetUploadForm() {
  // Clear text inputs
  document.getElementById("blog-header").value = "";
  document.getElementById("blog-intro").value = "";
  document.getElementById("the-text-area").value = "";
  document.getElementById("text-header").innerText = "";
  document.getElementById("text-paragraph").innerText = "";
  // Reset select dropdown
  const select = document.querySelector(".the-form select");
  if (select) select.selectedIndex = 0;

  // Reset image input & preview
  const imgInput = document.getElementById("ImgInput");
  const preview = document.getElementById("thePreview");
  imgInput.value = "";
  preview.src = "";
  preview.alt = "";

  // Optional: if you have preview styling, remove it
  preview.style.display = "none";
}

let draft = document.getElementById("the-draft-number");
let publish = document.getElementById("the-published-number");

gettingStatusBlog = async () => {
  try {
    const { data } = await axios.get(`${window.baseURL}/blog/status-counts`);
    const published =
      data.counts.find((item) => item.status === "published")?.count || 0;
    const drafted =
      data.counts.find((item) => item.status === "drafted")?.count || 0;
    console.log(drafted, published);
    draft.innerText = drafted;
    publish.innerText = published;

    // === Render blog list ===
    const blogList = document.getElementById("checkList-history");
    if (blogList && data.posts) {
      blogList.innerHTML = data.posts
        .map((post) => {
          const formattedDate = new Date(post.created_at).toLocaleDateString(
            "en-US",
            {
              day: "numeric",
              month: "short",
              year: "numeric",
            }
          );

          return `
            <li>
              <div class="the-date-and-status">
                <span>${formattedDate}</span>
                <span class="status-for-load ${post.status}">
                  ${post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                </span>
              </div>
              <div class="the-text-of-the-checkList">
                ${post.title}
              </div>
            </li>
          `;
        })
        .join("");
    }
  } catch (err) {
    console.error("Error fetching posts:", err);
  }
};

gettingStatusBlog();

document.addEventListener("DOMContentLoaded", () => {
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    alert("No user data found. Please log in again.");
    window.location.href = "./login.html"; // Redirect to login if not logged in
    return;
  }

  // Inject user data into HTML
  document.getElementById("user-name").textContent = user.username || "Unknown";
  document.querySelector(".User-name").textContent = user.username || "Unknown";
  document.querySelector(".User-email").textContent = user.email || "No email";
  document.querySelector(".position").textContent =
    user.role === "admin"
      ? "Administrator"
      : user.role === "superuser"
      ? "Super User"
      : "Staff";
});
