/* ============================================
   STATE.JS — Global state & mock data
   Depends on: utils.js
   ============================================ */

const AppState = {
  currentUser: {
    name: "Admin User",
    email: "admin@blog.com",
    role: "admin",
    avatar: null,
  },
  currentSection: "dashboard",
  posts: [],
  media: [],
  comments: [],
  users: [],
  categories: [],
  tags: [],
  analytics: {
    trafficData: [],
    deviceData: {},
    topPosts: [],
    referrers: [],
  },
  filters: {
    posts: "all",
    media: "all",
    comments: "pending",
    users: "all",
  },
  pagination: {
    posts: { page: 1, totalPages: 1, total: 0 },
    media: { page: 1, totalPages: 1, total: 0 },
    comments: { page: 1, totalPages: 1, total: 0 },
    users: { page: 1, totalPages: 1, total: 0 },
  },
  editor: null,
  charts: {},
  selectedMedia: null,
  editingPostId: null,
  scheduleDate: null,
};

// ============================================
// MOCK DATA GENERATION
// ============================================
function generateMockData() {
  const categories = ["Technology", "Design", "Tutorial", "News", "Lifestyle"];
  const statuses = ["published", "draft", "scheduled"];

  // Posts
  for (let i = 1; i <= 25; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));

    AppState.posts.push({
      id: Utils.generateId(),
      title: `Blog Post ${i}: ${
        [
          "Getting Started",
          "Advanced Tips",
          "Best Practices",
          "Complete Guide",
          "Tutorial",
        ][Math.floor(Math.random() * 5)]
      } ${
        ["with React", "for Beginners", "in 2024", "Explained", "Deep Dive"][
          Math.floor(Math.random() * 5)
        ]
      }`,
      slug: `blog-post-${i}`,
      excerpt: `This is a brief excerpt for blog post ${i}. It provides a summary of what readers can expect.`,
      content: "<p>Full blog post content here...</p>",
      category: categories[Math.floor(Math.random() * categories.length)],
      status: status,
      views: Math.floor(Math.random() * 10000),
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
      scheduledAt:
        status === "scheduled"
          ? new Date(
              Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000
            ).toISOString()
          : null,
      featuredImage: null,
      pendingFormData: null,
    });
  }

  // Media
  const mediaTypes = ["image", "video", "document"];
  for (let i = 1; i <= 20; i++) {
    const type = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
    AppState.media.push({
      id: Utils.generateId(),
      name: `media-file-${i}.${
        type === "image" ? "jpg" : type === "video" ? "mp4" : "pdf"
      }`,
      type: type,
      size: `${Math.floor(Math.random() * 10) + 1} MB`,
      url: `https://via.placeholder.com/150?text=Media+${i}`,
      uploadedAt: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  }

  // Comments
  for (let i = 1; i <= 15; i++) {
    AppState.comments.push({
      id: Utils.generateId(),
      author: `User ${i}`,
      email: `user${i}@example.com`,
      text: `This is a sample comment ${i}. Great article! Thanks for sharing.`,
      postTitle: `Blog Post ${Math.floor(Math.random() * 25) + 1}`,
      status: Math.random() > 0.5 ? "pending" : "approved",
      createdAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  }

  // Users
  // const roles = ["admin", "editor", "author"];
  // for (let i = 1; i <= 10; i++) {
  //   AppState.users.push({
  //     id: Utils.generateId(),
  //     name: `User ${i}`,
  //     email: `user${i}@blog.com`,
  //     role: roles[Math.floor(Math.random() * roles.length)],
  //     status: "active",
  //     posts: Math.floor(Math.random() * 20),
  //     joinedAt: new Date(
  //       Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
  //     ).toISOString(),
  //     lastActive: new Date(
  //       Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
  //     ).toISOString(),
  //   });
  // }

  // Categories
  categories.forEach((cat) => {
    AppState.categories.push({
      id: Utils.generateId(),
      name: cat,
      slug: Utils.slugify(cat),
      description: `All posts related to ${cat}`,
      count: Math.floor(Math.random() * 20),
      parent: null,
    });
  });
}

function generateTrafficData(days) {
  const data = [];
  const labels = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    labels.push(
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );
    data.push(Math.floor(Math.random() * 1000) + 500);
  }

  return { labels, data };
}
