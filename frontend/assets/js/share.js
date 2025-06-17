document.getElementById("experienceForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    company: document.getElementById("company").value.trim(),
    role: document.getElementById("role").value.trim(),
    difficulty: document.getElementById("difficulty").value,
    experience: document.getElementById("experience").value.trim(),
    tags: document.getElementById("tags").value.trim().split(',').map(t => t.trim()).filter(Boolean),
    resources: document.getElementById("resources").value.trim()
  };

  // Optional: simple client-side check
  if (!data.name || !data.company || !data.role || !data.difficulty || !data.experience) {
    document.getElementById("message").textContent = "Please fill in all required fields.";
    return;
  }

  try {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      document.getElementById("message").textContent = "✅ Your experience was shared successfully!";
      document.getElementById("experienceForm").reset();
    } else {
      throw new Error("Failed to submit");
    }
  } catch (err) {
    document.getElementById("message").textContent = "❌ Something went wrong. Try again later.";
  }
});
