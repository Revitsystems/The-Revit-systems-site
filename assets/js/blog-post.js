/* =============================================
         BLOG POST PAGE LOGIC
         - Reads selectedPost from localStorage (set by blog.html)
         - Post fields from API: id, title, slug, content, excerpt,
           featured_image, category, created_at
         - Tracks page view via POST /posts/:id/views
         - Renders article, prev/next nav, suggested posts
         - Reading progress bar + sticky continue strip
         ============================================= */

const imgFallback =
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&q=80";

/* ---- Normalise API field names ---- */
const normalise = (p) =>
  p
    ? { ...p, cover_image_url: p.featured_image || p.cover_image_url || "" }
    : null;

/* ---- Estimated read time ---- */
const readTime = (content = "") => {
  const words = content
    .replace(/<[^>]+>/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
};

/* ---- Author initials ---- */
const initials = (name = "R") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/* ---- Track post view via API ---- */
const trackView = async (postId) => {
  try {
    const deviceType = /Mobi|Android/i.test(navigator.userAgent)
      ? "mobile"
      : /iPad|Tablet/i.test(navigator.userAgent)
      ? "tablet"
      : "desktop";

    // Determine base URL — reuse window.baseURL if config.js is loaded
    const base = typeof window.baseURL !== "undefined" ? window.baseURL : "";

    await fetch(`${base}/posts/${postId}/views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceType }),
    });
  } catch (_) {
    // View tracking is non-critical — swallow errors silently
  }
};

/* ---- Init ---- */
document.addEventListener("DOMContentLoaded", () => {
  const raw = (() => {
    try {
      return JSON.parse(localStorage.getItem("selectedPost"));
    } catch {
      return null;
    }
  })();

  const post = normalise(raw);

  const allPosts = (() => {
    try {
      return (JSON.parse(localStorage.getItem("allPosts")) || []).map(
        normalise
      );
    } catch {
      return [];
    }
  })();

  if (!post) {
    document.getElementById("postPage").innerHTML = `
            <div class="post-not-found">
              <i class="fas fa-file-alt"></i>
              <h2>Article not found</h2>
              <p>We couldn't load this article. It may have been moved or deleted.</p>
              <a href="./blog.html"><i class="fas fa-arrow-left"></i> Back to Blog</a>
            </div>`;
    return;
  }

  /* ---- Track the view ---- */
  if (post.id) trackView(post.id);

  /* ---- Populate article ---- */
  document.title = `${post.title} — Revit Systems`;

  const heroImg = document.getElementById("postHeroImg");
  heroImg.src = post.cover_image_url || imgFallback;
  heroImg.alt = post.title;
  heroImg.onerror = () => {
    heroImg.src = imgFallback;
  };

  document.getElementById("postTitle").textContent = post.title;
  document.getElementById("postTagText").textContent =
    post.category || "Article";
  document.getElementById("postAuthorAvatar").textContent =
    initials("Revit Info");
  document.getElementById("postReadTime").textContent = readTime(
    post.content || post.excerpt || ""
  );
  document.getElementById("postBody").innerHTML = post.content
    ? post.content
    : `<p>${post.excerpt || ""}</p>`;

  /* ---- Share URLs ---- */
  const pageUrl = encodeURIComponent(window.location.href);
  const pageTitle = encodeURIComponent(post.title);
  const twitterUrl = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`;

  ["shareTwitter", "shareTwitter2"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = twitterUrl;
  });
  ["shareLinkedin", "shareLinkedin2"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = linkedinUrl;
  });

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      ["copyLinkBtn", "copyLinkBtn2"].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
          setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-link"></i> Copy link';
          }, 2000);
        }
      });
    });
  };
  document.getElementById("copyLinkBtn")?.addEventListener("click", copyLink);
  document.getElementById("copyLinkBtn2")?.addEventListener("click", copyLink);

  /* ---- Prev / Next navigation ---- */
  const currentIndex = allPosts.findIndex((p) => p.id === post.id);

  const navigate = (targetPost) => {
    if (!targetPost) return;
    localStorage.setItem("selectedPost", JSON.stringify(targetPost));
    localStorage.setItem("allPosts", JSON.stringify(allPosts));
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => window.location.reload(), 300);
  };

  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost =
    currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  const prevCard = document.getElementById("prevCard");
  const nextCard = document.getElementById("nextCard");

  if (prevPost) {
    prevCard.classList.remove("disabled");
    document.getElementById("prevTitle").textContent = prevPost.title;
    prevCard.addEventListener("click", () => navigate(prevPost));
  }

  if (nextPost) {
    nextCard.classList.remove("disabled");
    document.getElementById("nextTitle").textContent = nextPost.title;
    nextCard.addEventListener("click", () => navigate(nextPost));
  }

  /* ---- Suggested posts (up to 3, excluding current) ---- */
  const suggested = allPosts.filter((p) => p.id !== post.id).slice(0, 3);
  const suggestedGrid = document.getElementById("suggestedGrid");

  if (suggested.length === 0) {
    document.getElementById("suggestedSegment").style.display = "none";
  } else {
    suggestedGrid.innerHTML = suggested
      .map((p) => {
        const safe = JSON.stringify(p).replace(/"/g, "&quot;");
        const img = p.cover_image_url || imgFallback;
        return `
              <div class="post-suggested-card" onclick="navigateTo(${safe})">
                <div class="post-suggested-img-wrap">
                  <img
                    class="post-suggested-img"
                    src="${img}"
                    alt="${p.title}"
                    onerror="this.src='${imgFallback}'"
                    loading="lazy"
                  />
                </div>
                <div class="post-suggested-body">
                  <span class="post-suggested-tag">${
                    p.category || "Article"
                  }</span>
                  <h3 class="post-suggested-card-title">${p.title}</h3>
                </div>
              </div>`;
      })
      .join("");
  }

  /* ---- Sticky continue reading strip ---- */
  const continueStrip = document.getElementById("continueStrip");
  const continueTitle = document.getElementById("continueTitle");
  const continueBtn = document.getElementById("continueBtn");
  const continueClose = document.getElementById("continueClose");
  let stripDismissed = false;

  if (nextPost) {
    continueTitle.textContent = nextPost.title;
    continueBtn.addEventListener("click", () => navigate(nextPost));
  } else if (suggested.length > 0) {
    continueTitle.textContent = suggested[0].title;
    continueBtn.addEventListener("click", () => navigateTo(suggested[0]));
  } else {
    continueStrip.style.display = "none";
  }

  continueClose.addEventListener("click", () => {
    stripDismissed = true;
    continueStrip.classList.remove("visible");
  });

  /* ---- Reading progress bar + strip trigger ---- */
  const progressBar = document.getElementById("progressBar");
  const hero = document.querySelector(".post-hero");

  const onScroll = () => {
    const scrollTop = window.scrollY;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = `${Math.min(progress, 100)}%`;

    const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 400;
    if (!stripDismissed && scrollTop > heroBottom) {
      continueStrip.classList.add("visible");
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});

/* ---- Global navigation helper (called from suggested cards) ---- */
function navigateTo(post) {
  const allPosts = (() => {
    try {
      return (JSON.parse(localStorage.getItem("allPosts")) || []).map(
        normalise
      );
    } catch {
      return [];
    }
  })();
  localStorage.setItem("selectedPost", JSON.stringify(post));
  localStorage.setItem("allPosts", JSON.stringify(allPosts));
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => window.location.reload(), 300);
}

/* =============================================
         COMMENTS LOGIC
         API:
           GET  /posts/:postId/comments?limit=20&offset=0
                → { comments: [...], hasMore }
           POST /posts/:postId/comments/guest
                → body: { visitorName, visitorEmail?, commentText }
         Comment fields: id, visitor_name, comment_text,
                         created_at, status
         ============================================= */

const COMMENTS_PREVIEW = 3; // comments visible before "show more"

/* ---- Helpers ---- */
const base = () =>
  typeof window.baseURL !== "undefined" ? window.baseURL : "";

const commentInitials = (name = "?") =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const relativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/* ---- Build one reply element (staff reply) ---- */
const buildReplyEl = (r) => {
  // Staff replies have author_id set; visitor_name is null
  // The name we show is "Revit Systems" since all staff reply as the team
  const name = "Revit Systems";
  const date = relativeTime(r.created_at);

  const div = document.createElement("div");
  div.className = "rv-reply";
  div.innerHTML = `
          <div class="rv-reply-avatar">RS</div>
          <div class="rv-reply-body">
            <div class="rv-reply-meta">
              <span class="rv-reply-name">${name}</span>
              <span class="rv-reply-badge">Staff</span>
              <span class="rv-reply-date">${date}</span>
            </div>
            <p class="rv-reply-text">${r.comment_text}</p>
          </div>`;
  return div;
};

/* ---- Fetch replies for a single comment and inject them ---- */
const fetchReplies = async (commentId, repliesContainer) => {
  try {
    const res = await fetch(`${base()}/comments/${commentId}/replies`);
    if (!res.ok) return; // silently skip — replies are non-critical
    const replies = await res.json();
    if (!Array.isArray(replies) || replies.length === 0) return;

    // Clear any placeholder and inject reply elements
    repliesContainer.innerHTML = "";
    replies.forEach((r) => repliesContainer.appendChild(buildReplyEl(r)));
  } catch (_) {
    // Swallow — a failed reply fetch should never break the comment display
  }
};

/* ---- Build one comment element ---- */
const buildCommentEl = (c) => {
  const name = c.visitor_name || "Reader";
  const initStr = commentInitials(name);
  const date = relativeTime(c.created_at);
  const pending = c.status === "pending";

  const div = document.createElement("div");
  div.className = "rv-comment";

  // Replies area — empty div that fetchReplies will populate
  const repliesDiv = document.createElement("div");
  repliesDiv.className = "rv-comment-replies";

  div.innerHTML = `
          <div class="rv-comment-avatar reader">${initStr}</div>
          <div class="rv-comment-body">
            <div class="rv-comment-meta">
              <span class="rv-comment-name">${name}</span>
              <span class="rv-comment-date">${date}</span>
              ${
                pending
                  ? '<span class="rv-comment-pending">Pending review</span>'
                  : ""
              }
            </div>
            <p class="rv-comment-text">${c.comment_text}</p>
          </div>`;

  // Append the replies container inside the comment body
  div.querySelector(".rv-comment-body").appendChild(repliesDiv);

  // Only fetch replies for approved, persisted comments (not optimistic ones)
  if (c.id && !String(c.id).startsWith("opt-") && c.status !== "pending") {
    fetchReplies(c.id, repliesDiv);
  }

  return div;
};

/* ---- Comments state ---- */
let _allComments = []; // full fetched list
let _showingAll = false;

const updateCountBadge = () => {
  const el = document.getElementById("commentsCount");
  if (el) el.textContent = _allComments.length;
};

/* ---- Render the visible slice ---- */
const renderComments = () => {
  const list = document.getElementById("commentsList");
  const moreWrap = document.getElementById("commentsMoreWrap");
  const moreBtn = document.getElementById("commentsMoreBtn");
  if (!list) return;

  list.innerHTML = "";

  if (_allComments.length === 0) {
    list.innerHTML = `
            <div class="post-comments-empty">
              <i class="far fa-comment-dots"></i>
              <p>No comments yet — be the first to share your thoughts!</p>
            </div>`;
    if (moreWrap) moreWrap.style.display = "none";
    return;
  }

  const visible = _showingAll
    ? _allComments
    : _allComments.slice(0, COMMENTS_PREVIEW);

  visible.forEach((c) => list.appendChild(buildCommentEl(c)));

  // Show / update the "show more" button
  const remaining = _allComments.length - COMMENTS_PREVIEW;
  if (!_showingAll && _allComments.length > COMMENTS_PREVIEW) {
    moreWrap.style.display = "flex";
    moreBtn.innerHTML = `<i class="fas fa-chevron-down"></i> Show ${remaining} more comment${
      remaining !== 1 ? "s" : ""
    }`;
  } else {
    moreWrap.style.display = "none";
  }
};

/* ---- Fetch comments from the API ---- */
const fetchComments = async (postId) => {
  const list = document.getElementById("commentsList");
  // Skeletons are already in the DOM from the HTML; just fetch and replace
  try {
    const res = await fetch(
      `${base()}/posts/${postId}/comments?limit=100&offset=0`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Response: { comments: [...], hasMore, ... }
    _allComments = Array.isArray(data.comments) ? data.comments : [];
    updateCountBadge();
    renderComments();
  } catch (err) {
    console.error("fetchComments error:", err);
    if (list) {
      list.innerHTML = `
              <div class="post-comments-empty">
                <i class="fas fa-wifi"></i>
                <p>Couldn't load comments. Try refreshing the page.</p>
              </div>`;
    }
  }
};

/* ---- Show more / collapse toggle ---- */
document.addEventListener("DOMContentLoaded", () => {
  const moreBtn = document.getElementById("commentsMoreBtn");
  if (moreBtn) {
    moreBtn.addEventListener("click", () => {
      _showingAll = !_showingAll;
      renderComments();
      if (!_showingAll) {
        // Scroll back up to the top of the comments section
        document
          .getElementById("commentsSection")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
});

/* ---- Submit a guest comment ---- */
const setupCommentForm = (postId) => {
  const btn = document.getElementById("commentSubmitBtn");
  const nameEl = document.getElementById("commentName");
  const emailEl = document.getElementById("commentEmail");
  const textEl = document.getElementById("commentText");
  const feedback = document.getElementById("commentFeedback");

  if (!btn) return;

  const showFeedback = (msg, type) => {
    feedback.textContent = "";
    feedback.className = `post-comment-feedback ${type}`;
    const icon = document.createElement("i");
    icon.className =
      type === "success" ? "fas fa-check-circle" : "fas fa-exclamation-circle";
    feedback.appendChild(icon);
    feedback.appendChild(document.createTextNode(" " + msg));
    feedback.style.display = "flex";
  };

  btn.addEventListener("click", async () => {
    // Clear previous feedback
    feedback.style.display = "none";
    feedback.className = "post-comment-feedback";

    const visitorName = nameEl.value.trim();
    const visitorEmail = emailEl.value.trim();
    const commentText = textEl.value.trim();

    // Client-side validation
    if (!visitorName) {
      nameEl.focus();
      return showFeedback("Please enter your name.", "error");
    }
    if (!commentText) {
      textEl.focus();
      return showFeedback("Please write your comment.", "error");
    }
    if (visitorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail)) {
      emailEl.focus();
      return showFeedback("Please enter a valid email address.", "error");
    }

    // Disable button during request
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting…';

    try {
      const body = { visitorName, commentText };
      if (visitorEmail) body.visitorEmail = visitorEmail;

      const res = await fetch(`${base()}/posts/${postId}/comments/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      // Optimistically prepend the new comment so the author sees it immediately.
      // It will show "Pending review" since the backend sets status='pending' for guests.
      const optimistic = {
        id: data.id || `opt-${Date.now()}`,
        visitor_name: visitorName,
        comment_text: commentText,
        created_at: new Date().toISOString(),
        status: "pending",
      };
      _allComments = [optimistic, ..._allComments];
      _showingAll = true; // make sure the new comment is visible
      updateCountBadge();
      renderComments();

      // Reset form
      nameEl.value = "";
      emailEl.value = "";
      textEl.value = "";

      showFeedback(
        "Thanks! Your comment has been submitted and will appear after a quick review.",
        "success"
      );
    } catch (err) {
      console.error("Post comment error:", err);
      showFeedback(
        err.message || "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Post comment <i class="fas fa-paper-plane"></i>';
    }
  });
};

/* ---- Bootstrap comments once the post is known ---- */
// We hook into DOMContentLoaded, but the post id comes from localStorage
// which is already read by the main init block above. We need to wait for
// that block to run first, so we piggyback on a second DOMContentLoaded
// listener (both fire in order on the same tick).
document.addEventListener("DOMContentLoaded", () => {
  const raw = (() => {
    try {
      return JSON.parse(localStorage.getItem("selectedPost"));
    } catch {
      return null;
    }
  })();
  if (!raw || !raw.id) return; // no post — not-found state handles it
  fetchComments(raw.id);
  setupCommentForm(raw.id);
});
