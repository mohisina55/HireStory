// Check if user is logged in
const currentUser = localStorage.getItem("user");
if (!currentUser) {
  alert("Please login to view full experience.");
  window.location.href = "login.html";
}

// Global variables
let post = null;
let likes = 0;
let comments = [];

// Load experience details
async function loadExperience() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    document.body.innerHTML = "<p>❌ Invalid post ID.</p>";
    return;
  }

  try {
    const res = await fetch(`http://localhost:5000/api/experience/${id}`);
    if (!res.ok) throw new Error("Post not found");

    post = await res.json();

    // Fill post data
    document.getElementById("roleCompany").textContent = `${post.role} @ ${post.company}`;
    document.getElementById("difficulty").textContent = post.difficulty;
    document.getElementById("tags").textContent = (post.tags || []).join(", ");
    document.getElementById("experienceText").textContent = post.experienceText;

    // Resources
    const resourcesList = document.getElementById("resourcesList");
    if (post.resources && post.resources.length > 0) {
      post.resources.forEach(link => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="${link}" target="_blank">${link}</a>`;
        resourcesList.appendChild(li);
      });
    } else {
      document.getElementById("resourcesSection").style.display = "none";
    }

    // Likes
    likes = post.likes || 0;
    document.getElementById("likeCount").textContent = likes;

    // Comments
    comments = post.comments || [];
    renderComments();

    // Check if post is already saved
    await checkIfPostSaved();

  } catch (err) {
    document.body.innerHTML = `<p>❌ Failed to load experience: ${err.message}</p>`;
  }
}

// Check if current post is saved by user
async function checkIfPostSaved() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  try {
    const res = await fetch(`http://localhost:5000/api/saved-posts/${user.email}`);
    if (res.ok) {
      const savedPosts = await res.json();
      const isAlreadySaved = savedPosts.some(savedPost => savedPost._id === post._id);
      
      const saveBtn = document.getElementById("saveBtn");
      if (isAlreadySaved) {
        saveBtn.textContent = "📌 Saved";
        saveBtn.disabled = true;
        saveBtn.style.opacity = "0.6";
      }
    }
  } catch (err) {
    console.error("Error checking saved status:", err);
  }
}

// Render comments
function renderComments() {
  const commentsList = document.getElementById("commentsList");
  commentsList.innerHTML = "";
  comments.forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.user}: ${c.text}`;
    commentsList.appendChild(li);
  });
}

// Like button
document.getElementById("likeBtn").addEventListener("click", async () => {
  try {
    const res = await fetch(`http://localhost:5000/api/experience/${post._id}/like`, {
      method: "POST"
    });
    const data = await res.json();
    likes = data.likes;
    document.getElementById("likeCount").textContent = likes;
  } catch (err) {
    console.error("❌ Error liking post:", err);
  }
});

// Updated Save button with backend integration
document.getElementById("saveBtn").addEventListener("click", async () => {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  if (!currentUser) {
    alert("Please login to save posts.");
    return;
  }

  const saveBtn = document.getElementById("saveBtn");
  
  try {
    const res = await fetch("http://localhost:5000/api/saved-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: currentUser.email,
        postId: post._id
      })
    });

    const result = await res.json();

    if (res.ok) {
      alert("Post saved successfully!");
      saveBtn.textContent = "📌 Saved";
      saveBtn.disabled = true;
      saveBtn.style.opacity = "0.6";
    } else {
      alert(result.message || "Failed to save post");
    }
  } catch (err) {
    console.error("❌ Error saving post:", err);
    alert("Error saving post. Please try again.");
  }
});

// Add comment
document.getElementById("addCommentBtn").addEventListener("click", async () => {
  const commentInput = document.getElementById("commentInput");
  const userEmail = JSON.parse(localStorage.getItem("user")).email || "Anonymous";
  const text = commentInput.value.trim();
  if (!text) return;

  try {
    const res = await fetch(`http://localhost:5000/api/experience/${post._id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: userEmail, text })
    });
    const data = await res.json();
    comments = data.comments;
    renderComments();
    commentInput.value = "";
  } catch (err) {
    console.error("❌ Error adding comment:", err);
  }
});

// Initialize
loadExperience();