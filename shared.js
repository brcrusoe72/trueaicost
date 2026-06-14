/* TrueAICost.com — Shared JS */

// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav ul');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
});

// Utility: format currency
function fmtCurrency(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

// Utility: format number
function fmtNum(n) {
  return n.toLocaleString();
}

// Shared nav HTML
function getNav(activePage) {
  const pages = [
    ['index.html', 'Home'],
    ['calculator.html', 'Calculator'],
    ['benchmarks.html', 'Benchmarks'],
    ['vendors.html', 'Vendors'],
    ['roi.html', 'ROI Check'],
    ['resources.html', 'Resources'],
    ['blog.html', 'Blog'],
    ['about.html', 'About'],
  ];
  const links = pages.map(([href, label]) =>
    `<li><a href="${href}" class="${activePage === href ? 'active' : ''}">${label}</a></li>`
  ).join('');
  return `<nav class="site-nav"><div class="container"><a href="index.html" class="logo">True<span>AI</span>Cost</a><button class="nav-toggle" aria-label="Menu">☰</button><ul>${links}</ul></div></nav>`;
}

// Shared footer HTML
function getFooter() {
  return `<footer class="site-footer"><div class="container"><div class="footer-grid"><div class="footer-col"><h4>TrueAICost.com</h4><p>An open, opinionated model for the true 3-year cost of an AI project. No vendor pays for placement; no platform earns a commission when you click; nothing here is for sale. The math is fully open — <a href="https://github.com/brcrusoe72/trueaicost" style="color:inherit;text-decoration:underline;">read or fork it</a>.</p></div><div class="footer-col"><h4>Tools</h4><ul><li><a href="calculator.html">Cost Calculator</a></li><li><a href="benchmarks.html">Industry Benchmarks</a></li><li><a href="vendors.html">Vendor Comparison</a></li><li><a href="roi.html">ROI Reality Check</a></li></ul></div><div class="footer-col"><h4>Resources</h4><ul><li><a href="resources.html">Resource Hub</a></li><li><a href="resources.html#checklist">Vendor Checklist</a></li><li><a href="resources.html#reading">Reading List</a></li><li><a href="methodology.html">Methodology</a></li></ul></div><div class="footer-col"><h4>About</h4><ul><li><a href="about.html">About</a></li><li><a href="https://github.com/brcrusoe72/trueaicost">Source on GitHub</a></li><li><a href="https://linkedin.com/in/briancrusoe">Brian Crusoe</a></li><li><a href="methodology.html">How it works</a></li></ul></div></div><div class="footer-bottom">© ${new Date().getFullYear()} TrueAICost — built by Brian Crusoe. Cost ranges are documented heuristics calibrated to published research (RAND, S&P Global, Gartner, McKinsey, Stanford HAI), openly labeled where they're judgment calls. <a href="methodology.html">Methodology</a></div></div></footer>`;
}

// Inject nav and footer
document.addEventListener('DOMContentLoaded', () => {
  const page = location.pathname.split('/').pop() || 'index.html';
  const navEl = document.getElementById('site-nav');
  const footEl = document.getElementById('site-footer');
  if (navEl) navEl.outerHTML = getNav(page);
  if (footEl) footEl.outerHTML = getFooter();
});
