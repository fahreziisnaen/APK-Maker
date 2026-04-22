const express = require('express');
const { logger } = require('../utils/logger');

const router = express.Router();

const PRIVATE_IP_RE = /^(localhost$|127\.|0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|fc00:|fd)/i;

// GET /api/proxy?url=https://example.com
router.get('/', async (req, res) => {
  const { url } = req.query;

  let target;
  try {
    target = new URL(url);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') throw new Error();
  } catch {
    return res.status(400).send('<p>Invalid URL</p>');
  }

  if (PRIVATE_IP_RE.test(target.hostname)) {
    return res.status(403).send('<p>Forbidden</p>');
  }

  try {
    const response = await fetch(target.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id,en-US;q=0.7,en;q=0.3',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.status(415).send('<p style="font-family:sans-serif;padding:20px">Halaman ini tidak dapat dipratinjau.</p>');
    }

    let html = await response.text();

    // Base href from final URL so relative paths resolve correctly
    const finalUrl = new URL(response.url || target.toString());
    const pathDir = finalUrl.pathname.endsWith('/')
      ? finalUrl.pathname
      : finalUrl.pathname.replace(/\/[^/]*$/, '/');
    const baseHref = `${finalUrl.protocol}//${finalUrl.host}${pathDir}`;

    // Strip CSP meta tags (they block inline scripts/styles from the original page)
    html = html.replace(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');

    // Inject at top of <head>:
    // 1. <base href> — relative URLs resolve to origin
    // 2. Anti-framebusting
    // 3. Hide scrollbars
    // 4. Intercept link clicks → route through proxy so navigation keeps working
    const injection =
      `<base href="${baseHref}">` +
      `<style>` +
      `::-webkit-scrollbar{display:none}` +
      `html,body{scrollbar-width:none;-ms-overflow-style:none}` +
      `</style>` +
      `<script>(function(){` +
      `try{` +
      `Object.defineProperty(window,'top',{get:function(){return window.self;}});` +
      `Object.defineProperty(window,'parent',{get:function(){return window.self;}});` +
      `}catch(e){}` +
      `document.addEventListener('click',function(e){` +
      `var a=e.target.closest('a');` +
      `if(!a||!a.href)return;` +
      `var url=a.href;` +
      `if(!url.startsWith('http://')&&!url.startsWith('https://'))return;` +
      `if(a.target==="_blank")return;` +
      `e.preventDefault();e.stopPropagation();` +
      `window.location.href='/api/proxy?url='+encodeURIComponent(url);` +
      `},true);` +
      `})();</script>`;

    html = /<head[^>]*>/i.test(html)
      ? html.replace(/<head[^>]*>/i, (m) => m + injection)
      : injection + html;

    // Override headers — strip restrictive ones added by Helmet or the origin
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (err) {
    logger.warn('Preview proxy failed', { url, error: err.message });
    const isTimeout = err.name === 'TimeoutError' || err.message.includes('timeout');
    res.status(502).send(
      `<div style="font-family:sans-serif;padding:24px;text-align:center;color:#555">` +
      `<p style="font-size:18px;margin-bottom:8px">&#128247; Gagal memuat pratinjau</p>` +
      `<p style="font-size:13px">${isTimeout ? 'Waktu habis saat memuat situs.' : 'Situs tidak dapat dijangkau.'}</p>` +
      `</div>`
    );
  }
});

module.exports = router;
