const currentUser = localStorage.getItem("user");
if (!currentUser) {
  alert("Please login to view full experience.");
  window.location.href = "login.html";
}
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

    const post = await res.json();

    document.getElementById("roleCompany").textContent = `${post.role} @ ${post.company}`;
    document.getElementById("difficulty").textContent = post.difficulty;
    document.getElementById("tags").textContent = (post.tags || []).join(", ");
    document.getElementById("experienceText").textContent = post.experienceText;

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
  } catch (err) {
    document.body.innerHTML = `<p>❌ Failed to load experience: ${err.message}</p>`;
  }
}

loadExperience();
