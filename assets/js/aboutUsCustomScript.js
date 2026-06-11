document.getElementById("toggleBtn").addEventListener("click", function () {
  const text = document.getElementById("myText");

  if (text.classList.contains("show")) {
    // If hidden, show it
    text.classList.remove("show");
    text.classList.add("rv-active");
    this.textContent = "Read Less..."; // change button text
  } else {
    // If shown, hide it
    text.classList.remove("rv-active");
    text.classList.add("show");
    this.textContent = "Read More...";
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const testimonials = document.querySelectorAll(".abt-testimonial-card");
  let current = 0;

  function showNextTestimonial() {
    // Hide current
    testimonials[current].classList.remove("active");

    // Move to next index
    current = (current + 1) % testimonials.length;

    // Show next
    testimonials[current].classList.add("active");
  }

  // Change every 5 seconds
  setInterval(showNextTestimonial, 5000);
});
document.querySelector(".abt-join-button").addEventListener("click", (e) => {
  e.preventDefault();

  const email = "revitsystems@gmail.com";
  const subject = "Recruitment Request";
  const body = "Hello Revit Systems,\n\nI would like to Join your team";

  const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  try {
    window.location.href = mailtoLink;

    // As a fallback, after a short delay, open Gmail in a new tab
    setTimeout(() => {
      window.open(gmailLink, "_blank");
    }, 1000);
  } catch (err) {
    // If mailto fails outright, go straight to Gmail
    window.open(gmailLink, "_blank");
  }
});

const joinButton = document.getElementById("abt-join-button");

joinButton.addEventListener("click", () => {
  joinButton.disabled = true;
  joinButton.innerHTML = `
  <span class="spinner"></span>
  Loading...
`;

  setTimeout(() => {
    joinButton.disabled = false;
    joinButton.innerHTML = "Build With Us";
  }, 10000); // 10 seconds
});
