// Complete details.js with proper activity tracking

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
    // Get user info for view tracking
    const user = JSON.parse(currentUser);
    const userEmail = user.email;

    // Fetch post with view tracking
    const res = await fetch(`http://localhost:5000/api/experience/${id}?userEmail=${encodeURIComponent(userEmail)}`);
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
    console.error("❌ Error loading experience:", err);
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
  
  if (!comments || comments.length === 0) {
    commentsList.innerHTML = '<li style="color: #999; font-style: italic;">No comments yet. Be the first to comment!</li>';
    return;
  }
  
  comments.forEach(c => {
    const li = document.createElement("li");
    li.style.marginBottom = "10px";
    li.style.padding = "8px";
    li.style.backgroundColor = "#f9f9f9";
    li.style.borderRadius = "5px";
    
    const date = c.date ? new Date(c.date).toLocaleDateString() : 'Recently';
    li.innerHTML = `
      <strong>${c.user}:</strong> ${c.text}
      <div style="font-size: 12px; color: #666; margin-top: 4px;">${date}</div>
    `;
    commentsList.appendChild(li);
  });
}

// Like button with user tracking and visual feedback
document.getElementById("likeBtn").addEventListener("click", async () => {
  const likeBtn = document.getElementById("likeBtn");
  const likeCountSpan = document.getElementById("likeCount");
  
  // Prevent multiple clicks
  if (likeBtn.disabled) return;
  
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    
    // Disable button during request
    likeBtn.disabled = true;
    likeBtn.style.opacity = "0.6";
    likeBtn.textContent = "👍 Liking...";
    
    console.log(`Sending like request for post ${post._id} by user ${user.email}`);
    
    const res = await fetch(`http://localhost:5000/api/experience/${post._id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userEmail: user.email
      })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || `HTTP ${res.status}`);
    }
    
    const data = await res.json();
    console.log("✅ Like response:", data);
    
    // Update UI
    likes = data.likes;
    likeCountSpan.textContent = likes;
    likeBtn.textContent = "👍 Liked!";
    
    // Show success message
    showMessage("👍 Post liked successfully!", "success");
    
    // Re-enable button after a delay
    setTimeout(() => {
      likeBtn.disabled = false;
      likeBtn.style.opacity = "1";
      likeBtn.textContent = `👍 Like (${likes})`;
    }, 1000);
    
  } catch (err) {
    console.error("❌ Error liking post:", err);
    showMessage(`❌ Failed to like post: ${err.message}`, "error");
    
    // Re-enable button
    likeBtn.disabled = false;
    likeBtn.style.opacity = "1";
    likeBtn.textContent = `👍 Like (${likes})`;
  }
});

// Save button with backend integration
document.getElementById("saveBtn").addEventListener("click", async () => {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  if (!currentUser) {
    alert("Please login to save posts.");
    return;
  }

  const saveBtn = document.getElementById("saveBtn");
  
  try {
    saveBtn.disabled = true;
    saveBtn.textContent = "💾 Saving...";
    
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
      saveBtn.textContent = "📌 Saved";
      saveBtn.style.opacity = "0.6";
      showMessage("💾 Post saved successfully!", "success");
    } else {
      saveBtn.disabled = false;
      saveBtn.textContent = "💾 Save";
      showMessage(result.message || "Failed to save post", "error");
    }
  } catch (err) {
    console.error("❌ Error saving post:", err);
    saveBtn.disabled = false;
    saveBtn.textContent = "💾 Save";
    showMessage("Error saving post. Please try again.", "error");
  }
});

// Add comment with user tracking and visual feedback
document.getElementById("addCommentBtn").addEventListener("click", async () => {
  const commentInput = document.getElementById("commentInput");
  const addCommentBtn = document.getElementById("addCommentBtn");
  const userEmail = JSON.parse(localStorage.getItem("user")).email || "Anonymous";
  const text = commentInput.value.trim();
  
  if (!text) {
    showMessage("Please enter a comment before posting.", "error");
    return;
  }

  try {
    // Disable button and show loading
    addCommentBtn.disabled = true;
    addCommentBtn.textContent = "Posting...";
    
    console.log(`Sending comment for post ${post._id} by user ${userEmail}`);
    
    const res = await fetch(`http://localhost:5000/api/experience/${post._id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: userEmail, text })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || `HTTP ${res.status}`);
    }
    
    const data = await res.json();
    console.log("✅ Comment response:", data);
    
    // Update UI
    comments = data.comments;
    renderComments();
    commentInput.value = "";
    
    showMessage("💬 Comment added successfully!", "success");
    
  } catch (err) {
    console.error("❌ Error adding comment:", err);
    showMessage(`❌ Failed to add comment: ${err.message}`, "error");
  } finally {
    // Re-enable button
    addCommentBtn.disabled = false;
    addCommentBtn.textContent = "Post Comment";
  }
});

// Helper function to show messages
function showMessage(message, type = "info") {
  // Create message element if it doesn't exist
  let messageEl = document.getElementById("statusMessage");
  if (!messageEl) {
    messageEl = document.createElement("div");
    messageEl.id = "statusMessage";
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 5px;
      font-weight: bold;
      z-index: 1000;
      min-width: 200px;
      text-align: center;
    `;
    document.body.appendChild(messageEl);
  }
  
  // Style based on type
  const styles = {
    success: { backgroundColor: "#d4edda", color: "#155724", border: "1px solid #c3e6cb" },
    error: { backgroundColor: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb" },
    info: { backgroundColor: "#d1ecf1", color: "#0c5460", border: "1px solid #bee5eb" }
  };
  
  const style = styles[type] || styles.info;
  Object.assign(messageEl.style, style);
  
  messageEl.textContent = message;
  messageEl.style.display = "block";
  
  // Auto hide after 3 seconds
  setTimeout(() => {
    messageEl.style.display = "none";
  }, 3000);
}

// Initialize page
console.log("🚀 Initializing post details page...");
loadExperience();