const currentUser = localStorage.getItem("user");
if (!currentUser) {
  alert("You must be logged in to share your experience.");
  window.location.href = "login.html";
}

document.getElementById("experienceForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    company: document.getElementById("company").value.trim(),
    role: document.getElementById("role").value.trim(),
    difficulty: document.getElementById("difficulty").value,
    experienceText: document.getElementById("experience").value.trim(),
    tags: document.getElementById("tags").value.trim().split(',').map(t => t.trim()).filter(Boolean),
    resources: document.getElementById("resources").value.trim().split(',').map(r => r.trim()).filter(Boolean)
  };

  if (!data.name || !data.company || !data.role || !data.difficulty || !data.experienceText) {
    document.getElementById("message").textContent = "Please fill in all required fields.";
    return;
  }

  try {
    const res = await fetch("https://hirestory-1.onrender.com/api/experience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      document.getElementById("message").textContent = "✅ Your experience was shared successfully!";
      setTimeout(() => {
        window.location.href = "view.html";
      }, 1500);
      document.getElementById("experienceForm").reset();
    } else {
      throw new Error("Failed to submit");
    }
  } catch (err) {
    console.error(err);
    document.getElementById("message").textContent = "❌ Something went wrong. Try again later.";
  }
});
