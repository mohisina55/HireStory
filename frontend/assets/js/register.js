document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  // Password validation
  const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;
  if (!passwordRegex.test(password)) {
    document.getElementById("message").textContent = "Password must be at least 6 characters long and include at least one number and one special character.";
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role })
    });

    const result = await res.json();

    if (res.ok) {
      document.getElementById("message").textContent = "Registration successful. Redirecting...";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } else {
      document.getElementById("message").textContent = result.message || "Registration failed.";
    }
  } catch (err) {
    document.getElementById("message").textContent = "Error registering.";
  }
});
