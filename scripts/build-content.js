#!/usr/bin/env node
/**
 * Regenerates the content sections of index.html from Supabase.
 *
 * Supabase (the site_content table, served by the site-content edge function)
 * is the source of truth for resume content. This script fetches it and
 * rewrites the regions of index.html between <!-- content:X --> and
 * <!-- /content:X --> markers, so crawlers and no-JS visitors see the same
 * content as the live fetch renders.
 *
 * Usage: node scripts/build-content.js
 * Requires Node 18+ (global fetch).
 */

const fs = require('fs');
const path = require('path');

const CONTENT_URL = 'https://kguucauoxscxreaewiwv.supabase.co/functions/v1/site-content';
const INDEX_PATH = path.join(__dirname, '..', 'index.html');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;');
}
// About paragraphs: escape everything, then re-allow only the highlight span
// markup (mirrors highlightText() in index.html's runtime renderer).
function highlightText(s) {
  return esc(s)
    .replace(/&lt;span class="highlight"&gt;/g, '<span class="highlight">')
    .replace(/&lt;\/span&gt;/g, '</span>');
}

// ---------- Section templates (mirror the render logic in index.html's loadSiteContent) ----------

function renderHero(h) {
  return `
    <div class="hero-badge"><span class="pulse"></span> ${esc(h.badge)}</div>
    <h1>Hi, I'm <span class="gradient-text">${esc(h.name)}</span></h1>
    <p class="subtitle">${esc(h.subtitle)}</p>
    <p class="tagline">${esc(h.tagline)}</p>
    <div class="hero-cta">
      <a href="#projects" class="btn btn-primary">View My Work</a>
      <a href="#ask-me" class="btn btn-outline">Ask My AI About Me</a>
      <a href="${escAttr(h.resumePdf)}" target="_blank" class="btn btn-outline">Download Resume</a>
    </div>
    `;
}

function renderAbout(a) {
  const paragraphs = a.paragraphs.map(p => `      <p>${highlightText(p)}</p>`).join('\n');
  const details = a.details.map(d => `      <div class="detail-item">
        <span class="detail-label">${esc(d.label)}</span>
        <span class="detail-value">${esc(d.value)}</span>
      </div>`).join('\n');
  return `
  <div class="section-header fade-in">
    <div class="section-label">${esc(a.sectionLabel)}</div>
    <h2 class="section-title">${esc(a.sectionTitle)}</h2>
  </div>
  <div class="about-grid fade-in">
    <div class="about-text">
${paragraphs}
    </div>
    <div class="about-details">
${details}
    </div>
  </div>
  `;
}

function renderSkills(sk) {
  const categories = sk.categories.map(cat => `    <div class="skill-category">
      <div class="skill-category-header">
        <div class="skill-icon" style="background: ${cat.iconBg};">${cat.icon}</div>
        <div class="skill-category-title">${esc(cat.title)}</div>
      </div>
      <div class="skill-chips">
        ${(cat.chips || []).map(c => `<span class="skill-chip${cat.chipClass ? ' ' + cat.chipClass : ''}">${esc(c)}</span>`).join('\n        ')}
      </div>
    </div>`).join('\n');
  return `
  <div class="section-header fade-in">
    <div class="section-label">${esc(sk.sectionLabel)}</div>
    <h2 class="section-title">${esc(sk.sectionTitle)}</h2>
  </div>
  <div class="skills-grid fade-in">
${categories}
  </div>
  `;
}

function renderExperience(ex) {
  const items = ex.items.map(item => `    <div class="timeline-item">
      <div class="timeline-date">${esc(item.date)}</div>
      <div class="timeline-title">${esc(item.title)}</div>
      <div class="timeline-org">${esc(item.org)}</div>
      <div class="timeline-desc">
        ${esc(item.desc)}
      </div>
    </div>`).join('\n');
  return `
  <div class="section-header fade-in">
    <div class="section-label">${esc(ex.sectionLabel)}</div>
    <h2 class="section-title">${esc(ex.sectionTitle)}</h2>
  </div>
  <div class="timeline fade-in">
${items}
  </div>
  `;
}

function renderProjectMedia(media) {
  if (!media || !media.length) return '';
  const items = media.map((m, i) => {
    if (m.url.match(/\.(mp4|webm)$/i)) {
      return `<div class="project-media-item" onclick="event.stopPropagation(); openLightbox(${escAttr(JSON.stringify(media.map(x => x.url)))}, ${i})"><video src="${escAttr(m.url)}" muted loop playsinline onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0;"></video></div>`;
    } else if (m.url.match(/\.pdf$/i)) {
      return `<div class="project-media-item" onclick="event.stopPropagation(); window.open('${escAttr(m.url)}','_blank')"><div class="pdf-thumb">${esc(m.name || 'PDF')}</div></div>`;
    }
    const imgUrls = media.filter(x => !x.url.match(/\.pdf$/i)).map(x => x.url);
    return `<div class="project-media-item" onclick="event.stopPropagation(); openLightbox(${escAttr(JSON.stringify(imgUrls))}, ${imgUrls.indexOf(m.url)})"><img src="${escAttr(m.url)}" alt="${escAttr(m.name || '')}" loading="lazy"></div>`;
  }).join('\n            ');
  return `
          <div class="project-media-gallery">
            ${items}
          </div>`;
}

function renderProjects(pr) {
  const cards = pr.items.map(p => {
    const tags = p.tags.map(t => `<span class="project-tag${t.color ? ' ' + t.color : ''}">${esc(t.text)}</span>`).join('\n          ');
    const details = p.details.map(d => `            <li>${esc(d)}</li>`).join('\n');
    const links = (p.links && p.links.length)
      ? `
          <div class="project-links">
            ${p.links.map(l => `<a href="${escAttr(l.href)}" target="_blank" class="project-link" onclick="event.stopPropagation()">${esc(l.label)} &#8599;</a>`).join('\n            ')}
          </div>`
      : '';
    return `    <div class="project-card" onclick="toggleProject(this)">
      <div class="project-banner"><div class="project-banner-bg ${p.bannerClass}">${p.emoji}</div></div>
      <div class="project-body">
        <div class="project-tags">
          ${tags}
        </div>
        <h3 class="project-title">${esc(p.title)}</h3>
        <p class="project-desc">${esc(p.desc)}</p>
        <div class="project-expand-content">
          <ul>
${details}
          </ul>${renderProjectMedia(p.media)}
        </div>
        <div class="project-footer">
          <button class="project-expand-btn">+ Expand details</button>${links}
        </div>
      </div>
    </div>`;
  }).join('\n');
  return `
  <div class="section-header fade-in">
    <div class="section-label">${esc(pr.sectionLabel)}</div>
    <h2 class="section-title">${esc(pr.sectionTitle)}</h2>
    <p class="section-subtitle">Click any project to expand details</p>
  </div>
  <div class="projects-grid fade-in">
${cards}
  </div>
  `;
}

function renderEducation(ed, additional) {
  const coursework = ed.coursework.map(c => `          <span class="course-item">${esc(c)}</span>`).join('\n');
  const additionalCards = (additional || []).map(a => `      <div class="additional-card">
        <div class="additional-icon">${a.icon}</div>
        <div class="additional-name">${esc(a.name)}</div>
        <div class="additional-detail">${esc(a.detail)}</div>
      </div>`).join('\n');
  return `
  <div class="section-header fade-in">
    <div class="section-label">${esc(ed.sectionLabel)}</div>
    <h2 class="section-title">${esc(ed.sectionTitle)}</h2>
  </div>
  <div class="fade-in">
    <div class="education-card">
      <div class="education-logo">${esc(ed.logoText)}</div>
      <div class="education-info">
        <h3>${esc(ed.degree)}</h3>
        <div class="school">${esc(ed.school)}</div>
        <div class="details">
          <strong>Expected:</strong> ${esc(ed.expected)}<br>
          <strong>Activities:</strong> ${esc(ed.activities)}
        </div>
        <button class="coursework-toggle" onclick="this.nextElementSibling.classList.toggle('open'); this.textContent = this.nextElementSibling.classList.contains('open') ? '- Hide coursework' : '+ Show relevant coursework'">+ Show relevant coursework</button>
        <div class="coursework-list">
${coursework}
        </div>
      </div>
    </div>

    <div class="additional-grid" style="margin-top: 2rem;">
${additionalCards}
    </div>
  </div>
  `;
}

function renderContact(ct) {
  const items = ct.items.map(c => `    <a href="${escAttr(c.href)}"${c.href.startsWith('http') ? ' target="_blank"' : ''} class="contact-card">
      <div class="contact-icon">${c.icon}</div>
      <div class="contact-label">${esc(c.label)}</div>
      <div class="contact-value">${esc(c.value)}</div>
    </a>`).join('\n');
  return `
  <div class="section-header fade-in">
    <div class="section-label">${esc(ct.sectionLabel)}</div>
    <h2 class="section-title">${esc(ct.sectionTitle)}</h2>
    <p class="section-subtitle">${esc(ct.sectionSubtitle)}</p>
  </div>
  <div class="contact-grid fade-in">
${items}
  </div>
  `;
}

// ---------- Region replacement ----------

function replaceRegion(html, name, content) {
  const start = `<!-- content:${name} -->`;
  const end = `<!-- /content:${name} -->`;
  const startIdx = html.indexOf(start);
  const endIdx = html.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Markers for region "${name}" not found in index.html`);
  }
  return html.slice(0, startIdx + start.length) + content + html.slice(endIdx);
}

async function main() {
  console.log(`Fetching content from ${CONTENT_URL} ...`);
  const res = await fetch(CONTENT_URL);
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
  const data = await res.json();

  const required = ['header', 'about', 'skills', 'experience', 'projects', 'education', 'additional', 'contact'];
  const missing = required.filter(k => !data[k]);
  if (missing.length) {
    throw new Error(`Supabase content is missing keys: ${missing.join(', ')}. Refusing to regenerate — seed the missing sections first.`);
  }

  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  const before = html;

  html = replaceRegion(html, 'hero', renderHero(data.header));
  html = replaceRegion(html, 'about', renderAbout(data.about));
  html = replaceRegion(html, 'skills', renderSkills(data.skills));
  html = replaceRegion(html, 'experience', renderExperience(data.experience));
  html = replaceRegion(html, 'projects', renderProjects(data.projects));
  html = replaceRegion(html, 'education', renderEducation(data.education, data.additional));
  html = replaceRegion(html, 'contact', renderContact(data.contact));

  if (html === before) {
    console.log('index.html is already up to date.');
  } else {
    fs.writeFileSync(INDEX_PATH, html);
    console.log('index.html regenerated. Review with `git diff`, then commit and push.');
  }
}

main().catch(err => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
