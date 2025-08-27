document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const result = await res.json();

    if (res.ok) {
      localStorage.setItem("user", JSON.stringify(result.user));
      window.location.href = "index.html";
    } else {
      document.getElementById("message").textContent = result.message || "Login failed.";
    }
  } catch (err) {
    document.getElementById("message").textContent = "Error logging in.";
  }
});
