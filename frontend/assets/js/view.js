let allPosts = [];

// Load all posts on page load
async function loadPosts() {
  try {
    const res = await fetch('https://hirestory-1.onrender.com/api/experience');
    allPosts = await res.json();
    populateFilters(allPosts);
    renderPosts(allPosts);
  } catch (err) {
    console.error('❌ Error fetching posts:', err);
  }
}

// Filter and render posts
function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const company = document.getElementById('companyFilter').value;
  const role = document.getElementById('roleFilter').value;
  const difficulty = document.getElementById('difficultyFilter').value;

  const filtered = allPosts.filter(post => {
    const matchSearch = post.company.toLowerCase().includes(search) ||
                        post.role.toLowerCase().includes(search) ||
                        (post.tags || []).some(tag => tag.toLowerCase().includes(search));
    
    const matchCompany = company === 'All' || post.company === company;
    const matchRole = role === 'All' || post.role === role;
    const matchDifficulty = difficulty === 'All' || post.difficulty === difficulty;

    return matchSearch && matchCompany && matchRole && matchDifficulty;
  });

  renderPosts(filtered);
}

// 🔒 Check if user is logged in
function isUserLoggedIn() {
  return !!localStorage.getItem("user");
}

// ✅ Corrected renderPosts() function
function renderPosts(posts) {
  const container = document.getElementById('postsContainer');
  container.innerHTML = '';

  if (posts.length === 0) {
    container.innerHTML = '<p>No matching posts found.</p>';
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'post-card';

    card.innerHTML = `
      <h3>${post.role} @ ${post.company}</h3>
      <p><strong>Difficulty:</strong> ${post.difficulty}</p>
      <p><strong>Tags:</strong> ${(post.tags || []).join(', ')}</p>
      <p><strong>Experience:</strong> ${post.experienceText?.substring(0, 150)}...</p>
      <details>
        <summary>Resources</summary>
        <ul>
          ${(post.resources || []).map(r => `<li><a href="${r}" target="_blank">${r}</a></li>`).join('')}
        </ul>
      </details>
    `;

    if (isUserLoggedIn()) {
      const readMore = document.createElement("a");
      readMore.href = `post-details.html?id=${post._id}`;
      readMore.textContent = "Read More";
      readMore.className = "read-more-btn";
      card.appendChild(readMore);
    } else {
      const loginNotice = document.createElement("p");
      loginNotice.innerHTML = "<em>🔒 Login to view full experience.</em>";
      card.appendChild(loginNotice);
    }

    container.appendChild(card);
  });
}

// Populate dropdowns with unique values
function populateFilters(posts) {
  const companySet = new Set();
  const roleSet = new Set();

  posts.forEach(post => {
    companySet.add(post.company);
    roleSet.add(post.role);
  });

  const companyFilter = document.getElementById('companyFilter');
  const roleFilter = document.getElementById('roleFilter');

  companyFilter.innerHTML = '<option value="All">All Companies</option>';
  roleFilter.innerHTML = '<option value="All">All Roles</option>';

  companySet.forEach(company => {
    const option = document.createElement('option');
    option.value = company;
    option.textContent = company;
    companyFilter.appendChild(option);
  });

  roleSet.forEach(role => {
    const option = document.createElement('option');
    option.value = role;
    option.textContent = role;
    roleFilter.appendChild(option);
  });
}

// Logout function
function logout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('companyFilter').addEventListener('change', applyFilters);
document.getElementById('roleFilter').addEventListener('change', applyFilters);
document.getElementById('difficultyFilter').addEventListener('change', applyFilters);

// Initialize
loadPosts();
