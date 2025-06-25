document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  try {
    const res = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role })
    });

    const result = await res.json();

    if (res.ok) {
      document.getElementById("message").textContent = "✅ Registered successfully!";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      document.getElementById("message").textContent = result.message || "Registration failed.";
    }
  } catch (err) {
    document.getElementById("message").textContent = "❌ Error during registration.";
    console.error(err); // optional, to see detailed error
  }
});
