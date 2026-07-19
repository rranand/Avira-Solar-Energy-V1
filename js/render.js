
import blogPostJSON from '../assests/blog_post.json' with { type: 'json' };
import projectsJSON from '../assests/projects.json' with { type: 'json' };
import residentialTypesJSON from '../assests/residential_types.json' with { type: 'json' };

/* ===========================================================
   RESIDENTIAL TYPES — On-Grid / Off-Grid / Hybrid
=========================================================== */

const RESIDENTIAL_TYPES = residentialTypesJSON;

function openResidentialType(key) {
    const t = RESIDENTIAL_TYPES[key];
    if (!t) return;
    document.getElementById('typeModalBody').innerHTML = `
    <button class="close" onclick="closeTypeModal()">×</button>
    <div class="type-hero">
      <img src="${t.image}" alt="${t.title}">
      <div class="tag">${t.tag}</div>
    </div>
    <div class="type-body">
      <h3>${t.title}</h3>
      <p>${t.description}</p>
      <ul>${t.points.map(p => `<li>${p}</li>`).join('')}</ul>
      <div class="type-lead">
        <h4>Want a quote for ${t.title}?</h4>
        <form onsubmit="submitTypeLead(event, '${t.title}')">
          <div class="field"><label>Name</label><input required id="typeLeadName" type="text" minlength="3" maxlength="50" placeholder="Your name"></div>
          <div class="field"><label>Mobile Number</label><input required id="typeLeadPhone" type="tel" inputmode="numeric" pattern="[6-9][0-9]{9}" maxlength="10" title="Enter a valid 10-digit Indian mobile number" placeholder="Mobile number"></div>
          <div class="field"><label>Address</label><input required id="typeLeadAddress" type="text" minlength="2" maxlength="150" placeholder="Your address / city"></div>
          <button class="calc-submit" type="submit">Send My Details →</button>
        </form>
      </div>
      <p style="margin-top:18px; text-align:center; font-size:13.5px;">
        <a href="#" onclick="closeTypeModal(); openBlogPost(2); return false;" style="color:var(--blue); font-weight:600;">📖 Read our full On-Grid vs Off-Grid vs Hybrid comparison guide →</a>
      </p>
    </div>
  `;
    document.getElementById('typeModalOverlay').classList.add('show');
}

window.openResidentialType = openResidentialType;

/* ===========================================================
   PROJECTS 
=========================================================== */

function getProjects() {
    return projectsJSON;
}

function renderProjects() {
    const query = (document.getElementById('projectSearch')?.value || '').toLowerCase();
    const list = getProjects().filter(p =>
        p.name.toLowerCase().includes(query) || p.location.toLowerCase().includes(query)
    );
    const grid = document.getElementById('projectGrid');
    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = `<div class="project-empty">No projects found matching "${query}".</div>`;
        return;
    }

    grid.innerHTML = list.map(p => {
        let mediaHtml = '';
        if (p.type === 'youtube') {
            mediaHtml = `<iframe src="https://www.youtube.com/embed/${p.youtubeId}" allowfullscreen></iframe>`;
        } else if (p.type === 'video') {
            mediaHtml = `<video src="${p.image}" controls></video>`;
        } else if (p.type === 'reel') {
            const platformLabel = p.reelPlatform === 'instagram' ? 'Instagram Reel' : 'Facebook Reel';
            const bgColor = p.reelPlatform === 'instagram' ? 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' : '#1877F2';
            mediaHtml = `<a href="${p.reelUrl}" target="_blank" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; background:${bgColor}; color:#fff; text-decoration:none; gap:8px;"><span style="font-size:28px;">▶</span><span style="font-size:13px; font-weight:600;">View ${platformLabel}</span></a>`;
        } else {
            mediaHtml = `<div class="media" style="background-image:url('${p.image}')"></div>`;
        }
        return `
      <div class="project-card reveal visible">
        ${p.type === 'youtube' || p.type === 'video' || p.type === 'reel' ? `<div class="media">${mediaHtml}</div>` : mediaHtml}
        <div class="body">
          <h4>${p.name}</h4>
          <div class="loc">📍 ${p.location}</div>
        </div>
      </div>`;
    }).join('');
}

window.renderProjects = renderProjects;

/* ===========================================================
   BLOG 
=========================================================== */

function getBlogPosts() {
    return blogPostJSON;
}

function renderBlog() {
    const grid = document.getElementById('blogGrid');
    if (!grid) return;
    const posts = getBlogPosts();
    grid.innerHTML = posts.map((p, i) => `
      <div class="blog-card reveal visible" onclick="openBlogPost(${i})">
        <div class="img" style="background-image:url('${p.image}')"></div>
        <div class="body">
          <div class="cat">${p.category}</div>
          <h4>${p.title}</h4>
          <p>${p.excerpt}</p>
        </div>
      </div>
    `).join('');
}

function openBlogPost(index) {
    const p = getBlogPosts()[index];
    document.getElementById('blogModalBody').innerHTML = `
      <button class="close" onclick="closeBlogModal()">×</button>
      <div class="type-hero"><img src="${p.image}" alt="${p.title}"><div class="tag">${p.category}</div></div>
      <div class="type-body">
        <h3>${p.title}</h3>
        <p style="white-space:pre-line;">${p.content}</p>
      </div>
    `;
    document.getElementById('blogModalOverlay').classList.add('show');
}

window.openBlogPost = openBlogPost;

// ---------- Initial render on page load ----------

window.addEventListener('load', () => {
    renderProjects();
    renderBlog();
});