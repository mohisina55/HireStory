let allPosts = [];

// Load all posts on page load
async function loadPosts() {
  try {
    const res = await fetch('/api/posts'); // adjust this URL as per backend
    allPosts = await res.json();
    populateFilters(allPosts);
    renderPosts(allPosts);
  } catch (err) {
    console.error('Error fetching posts:', err);
  }
}

// Filter and render posts
function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const company = document.getElementById('companyFilter').value;
  const role = document.getElementById('roleFilter').value;
  const difficulty = document.getElementById('difficultyFilter').value;

  const filtered = allPosts.filter(post => {
    const matchSearch = post.company.toLowerCase().includes(search) || post.role.toLowerCase().includes(search);
    const matchCompany = company === 'All' || post.company === company;
    const matchRole = role === 'All' || post.role === role;
    const matchDifficulty = difficulty === 'All' || post.difficulty === difficulty;

    return matchSearch && matchCompany && matchRole && matchDifficulty;
  });

  renderPosts(filtered);
}

// Render post cards
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
      <h3>${post.company}</h3>
      <p><strong>Role:</strong> ${post.role}</p>
      <p><strong>Difficulty:</strong> ${post.difficulty}</p>
      <p>${post.experience.substring(0, 150)}...</p>
      <a href="post-details.html?id=${post._id}">Read More</a>
    `;
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

// Event listeners
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('companyFilter').addEventListener('change', applyFilters);
document.getElementById('roleFilter').addEventListener('change', applyFilters);
document.getElementById('difficultyFilter').addEventListener('change', applyFilters);

// Initialize
loadPosts();
