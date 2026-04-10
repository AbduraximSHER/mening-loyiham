/**
 * lang-toggle.js — Bilingual EN/UZ toggle
 * Adds a persistent language toggle to any page.
 * Uses CSS class switching via data-lang attribute on <html>.
 * Persists choice in localStorage.
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'em_lang';
  const DEFAULT_LANG = 'en';

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  }

  function setLang(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Update toggle buttons if they exist
    document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  // Apply saved language immediately
  setLang(getLang());

  // Inject toggle into the page if not already present
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lang-toggle-injected')) return;

    // Find a suitable place: .web-tools, .nav-right, .auth-container, or create floating
    const target = document.querySelector('.web-tools') 
      || document.querySelector('.nav-right')
      || document.querySelector('#auth-container');

    if (target) {
      const toggle = document.createElement('div');
      toggle.id = 'lang-toggle-injected';
      toggle.style.cssText = 'display:inline-flex;background:rgba(232,87,58,0.06);border-radius:8px;overflow:hidden;border:1px solid transparent;margin-right:8px;flex-shrink:0;';
      toggle.innerHTML = `
        <button class="lang-toggle-btn ${getLang()==='en'?'active':''}" data-lang="en" style="padding:4px 10px;font-size:0.75rem;font-weight:700;border:none;background:transparent;color:#636E72;cursor:pointer;font-family:inherit;transition:all 0.2s;letter-spacing:0.5px;border-radius:6px;">EN</button>
        <button class="lang-toggle-btn ${getLang()==='uz'?'active':''}" data-lang="uz" style="padding:4px 10px;font-size:0.75rem;font-weight:700;border:none;background:transparent;color:#636E72;cursor:pointer;font-family:inherit;transition:all 0.2s;letter-spacing:0.5px;border-radius:6px;">UZ</button>
      `;

      // Style active state
      const style = document.createElement('style');
      style.textContent = '.lang-toggle-btn.active{background:#E8573A !important;color:white !important;border-radius:6px;}';
      document.head.appendChild(style);

      toggle.querySelectorAll('.lang-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => setLang(btn.dataset.lang));
      });

      target.insertBefore(toggle, target.firstChild);
    }
  });

  // Expose globally
  window.setLang = setLang;
  window.getLang = getLang;
})();
