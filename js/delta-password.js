(function () {
  const SOURCE_URL = 'https://www.ie123.com/y/tool/sanjiaozhou.html';
  const API_URL = '/api/delta-password.json';
  const PROXIES = [
    (url) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
    (url) => 'https://corsproxy.io/?' + encodeURIComponent(url),
  ];

  const root = document.getElementById('delta-password-root');
  if (!root) return;

  function fetchTimeout(url, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
  }

  function parseHtml(html) {
    const items = [];
    const cardRe = /<div class="password-card">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let m;
    while ((m = cardRe.exec(html)) !== null) {
      const block = m[1];
      const map = (block.match(/class="map-name"[^>]*>[\s\S]*?<\/i>\s*([^<]+)/) || [])[1];
      const password = (block.match(/class="password-code">(\d{4})/) || [])[1];
      const location = (block.match(/class="location-desc">[\s\S]*?<\/i>\s*([^<]+)/) || [])[1];
      if (!map || !password) continue;
      const images = [...block.matchAll(/<img src="([^"]+)"/g)].map((x) => x[1]);
      items.push({ map: map.trim(), password, location: (location || '').trim(), images });
    }
    const updateMatch = html.match(/最后更新[：:]\s*([^<\s][^<]*)/);
    const badgeMatch = html.match(/(\d{2}月\d{2}日)每日密码已更新/);
    return {
      source: SOURCE_URL,
      updatedAt: updateMatch ? updateMatch[1].trim() : '',
      dateLabel: badgeMatch ? badgeMatch[1] : '',
      items,
      fetchedAt: new Date().toISOString(),
    };
  }

  async function fetchViaProxy(url) {
    for (const build of PROXIES) {
      try {
        const res = await fetchTimeout(build(url), 12000);
        if (!res.ok) continue;
        const text = await res.text();
        if (text.includes('password-card')) return text;
      } catch (_) {}
    }
    return null;
  }

  async function fetchLive() {
    const html = await fetchViaProxy(SOURCE_URL);
    if (html) return parseHtml(html);
    const res = await fetchTimeout(API_URL + '?t=' + Date.now(), 10000);
    if (!res.ok) throw new Error('接口请求失败');
    return res.json();
  }

  function render(data) {
    const time = data.updatedAt || data.dateLabel || '未知';
    let html = '<div class="delta-pwd-meta">';
    html += '<p><strong>更新日期：</strong>' + time + ' · 密码每日凌晨刷新</p>';
    html += '<p class="delta-pwd-source">数据来源：<a href="' + SOURCE_URL + '" target="_blank" rel="noopener">ie123 三角洲密码查询</a>';
    html += ' <button type="button" class="delta-pwd-refresh" id="delta-pwd-refresh">刷新密码</button></p>';
    html += '</div>';

    html += '<table><thead><tr><th>地图</th><th>今日密码</th><th>位置简述</th></tr></thead><tbody>';
    data.items.forEach((item) => {
      html += '<tr><td>' + item.map + '</td><td><strong>' + item.password + '</strong></td><td>' + (item.location || '-') + '</td></tr>';
    });
    html += '</tbody></table>';

    html += '<h3 id="各地图密码门一览">各地图密码门一览</h3><div class="delta-pwd-grid">';
    data.items.forEach((item) => {
      html += '<div class="delta-pwd-card">';
      html += '<div class="delta-pwd-card-head"><span>' + item.map + '</span><strong>' + item.password + '</strong></div>';
      if (item.location) html += '<p class="delta-pwd-loc">' + item.location + '</p>';
      if (item.images && item.images.length) {
        html += '<div class="delta-pwd-imgs">';
        item.images.forEach((src) => {
          html += '<a href="' + src + '" target="_blank" rel="noopener"><img src="' + src + '" alt="' + item.map + '位置示意图" loading="lazy"></a>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    root.innerHTML = html;
    document.getElementById('delta-pwd-refresh')?.addEventListener('click', () => load(true));
  }

  function renderError(msg) {
    root.innerHTML = '<div class="delta-pwd-error"><p>⚠️ ' + msg + '</p>'
      + '<p>请稍后重试，或直接访问 <a href="' + SOURCE_URL + '" target="_blank" rel="noopener">ie123 密码查询工具</a></p>'
      + '<button type="button" class="delta-pwd-refresh" id="delta-pwd-refresh">重新加载</button></div>';
    document.getElementById('delta-pwd-refresh')?.addEventListener('click', () => load(true));
  }

  async function load(force) {
    root.innerHTML = '<div class="delta-pwd-loading">正在' + (force ? '刷新' : '加载') + '今日密码...</div>';
    try {
      let data;
      if (force) {
        const html = await fetchViaProxy(SOURCE_URL);
        data = html ? parseHtml(html) : await (await fetch(API_URL + '?t=' + Date.now())).json();
      } else {
        try {
          const res = await fetchTimeout(API_URL + '?t=' + Date.now(), 8000);
          data = await res.json();
          if (!data.items || !data.items.length) throw new Error('empty');
        } catch (_) {
          data = await fetchLive();
        }
      }
      if (!data.items || !data.items.length) throw new Error('暂无密码数据');
      render(data);
    } catch (e) {
      renderError('密码加载失败：' + (e.message || '网络错误'));
    }
  }

  if (!document.getElementById('delta-pwd-style')) {
    const style = document.createElement('style');
    style.id = 'delta-pwd-style';
    style.textContent = `
      .delta-pwd-meta{margin:12px 0 20px;padding:12px 16px;background:#f6f8fa;border-radius:8px;border-left:4px solid #e52521}
      .delta-pwd-source{font-size:13px;color:#666}
      .delta-pwd-refresh{margin-left:8px;padding:4px 12px;border:none;border-radius:4px;background:#e52521;color:#fff;cursor:pointer;font-size:12px}
      .delta-pwd-refresh:hover{opacity:.9}
      .delta-pwd-loading,.delta-pwd-error{padding:24px;text-align:center;color:#666}
      .delta-pwd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin:16px 0 24px}
      .delta-pwd-card{border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.04)}
      .delta-pwd-card-head{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);font-weight:600}
      .delta-pwd-card-head strong{font-size:22px;color:#0f3460;letter-spacing:3px;font-family:monospace}
      .delta-pwd-loc{padding:10px 16px;font-size:13px;color:#475569;line-height:1.6;margin:0}
      .delta-pwd-imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;padding:0 12px 12px}
      .delta-pwd-imgs img{width:100%;height:90px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;transition:transform .2s}
      .delta-pwd-imgs a:hover img{transform:scale(1.03)}
    `;
    document.head.appendChild(style);
  }

  load(false);
})();
