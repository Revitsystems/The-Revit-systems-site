/* =============================================
         BLOG POST PAGE LOGIC
         - Reads selectedPost from localStorage
         - Reads allPosts from localStorage for prev/next
         - Renders article content
         - Reading progress bar
         - Prev/Next navigation
         - Suggested posts (3 from the same pool)
         - Sticky continue reading strip
         - Share buttons
         ============================================= */

const imgFallback =
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&q=80";

/* ---- Estimated read time ---- */
const readTime = (content = "") => {
  const words = content
    .replace(/<[^>]+>/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
};

/* ---- Author initials ---- */
const initials = (name = "R") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/* ---- Init ---- */
document.addEventListener("DOMContentLoaded", () => {
  const post = (() => {
    try {
      return JSON.parse(localStorage.getItem("selectedPost"));
    } catch {
      return null;
    }
  })();

  const allPosts = (() => {
    try {
      return JSON.parse(localStorage.getItem("allPosts")) || [];
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
            </div>
          `;
    return;
  }

  /* ---- Populate article ---- */
  document.title = `${post.title} — Revit Systems`;
  document.getElementById("postHeroImg").src =
    post.cover_image_url || imgFallback;
  document.getElementById("postHeroImg").alt = post.title;
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

  /* ---- Prev / Next ---- */
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
      .map(
        (p) => `
            <div class="post-suggested-card" onclick="navigateTo(${JSON.stringify(
              p
            ).replace(/"/g, "&quot;")})">
              <div class="post-suggested-img-wrap">
                <img
                  class="post-suggested-img"
                  src="${p.cover_image_url || imgFallback}"
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
            </div>
          `
      )
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
    // No next — strip stays hidden
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

    // Show continue strip after scrolling past hero
    const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 400;
    if (!stripDismissed && scrollTop > heroBottom) {
      continueStrip.classList.add("visible");
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll(); // run once on load
});

/* ---- Global navigation helper (called from suggested cards) ---- */
function navigateTo(post) {
  const allPosts = (() => {
    try {
      return JSON.parse(localStorage.getItem("allPosts")) || [];
    } catch {
      return [];
    }
  })();
  localStorage.setItem("selectedPost", JSON.stringify(post));
  localStorage.setItem("allPosts", JSON.stringify(allPosts));
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => window.location.reload(), 300);
}
