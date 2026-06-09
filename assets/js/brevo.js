// const BREVO_API_KEY = process.env.BREVO_API_KEY;
// const BREVO_LIST_ID = parseInt(process.env.BREVO_LIST_ID);
// document.addEventListener("DOMContentLoaded", () => {
//   const form = document.querySelector(".rv-news-form");
//   if (!form) return; // Exit if no newsletter form on this page

//   form.addEventListener("submit", async (e) => {
//     e.preventDefault();

//     const email = document.getElementById("user-email").value.trim();
//     const feedback = document.getElementById("newsletterFeedback");

//     feedback.textContent = "Subscribing...";
//     feedback.style.color = "inherit";

//     try {
//       const response = await fetch("https://api.brevo.com/v3/contacts", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "api-key": BREVO_API_KEY,
//         },
//         body: JSON.stringify({
//           email: email,
//           listIds: [BREVO_LIST_ID],
//           updateEnabled: true,
//         }),
//       });

//       if (response.ok || response.status === 204) {
//         feedback.textContent = "You're subscribed! Welcome aboard 🎉";
//         feedback.style.color = "green";
//         form.reset();
//       } else {
//         const data = await response.json();
//         feedback.textContent =
//           data.message || "Something went wrong. Try again.";
//         feedback.style.color = "red";
//       }
//     } catch (error) {
//       feedback.textContent = "Network error. Please try again.";
//       feedback.style.color = "red";
//     }
//   });
// });
