(function () {
  const API_URL = '/api/lottery-info.json';
  const TYPES = {
    ssq: { name: '双色球', red: 6 },
    fcsd: { name: '福彩3D' },
    qlc: { name: '七乐彩', red: 7 },
    klb: { name: '快乐8' },
  };
  const NUM_KEYS = [
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen', 'twenty',
  ];

  const root = document.getElementById('lottery-info-root');
  if (!root) return;

  let currentType = 'ssq';
  let cache = null;

  function fetchTimeout(url, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
  }

  function extractNumbers(item) {
    return NUM_KEYS
      .map((k) => item[k])
      .filter((v) => v !== undefined && v !== null && v !== '')
      .map((v) => String(v).padStart(2, '0'));
  }

  function renderBalls(nums, type) {
    const cfg = TYPES[type];
    let html = '<div class="lottery-balls">';
    nums.forEach((n, i) => {
      let cls = 'ball';
      if (type === 'ssq') cls += i < 6 ? ' red' : ' blue';
      else if (type === 'qlc') cls += i < 7 ? ' red' : ' gold';
      else if (type === 'fcsd') cls += ' purple';
      else cls += ' orange';
      html += '<span class="' + cls + '">' + n + '</span>';
    });
    html += '</div>';
    return html;
  }

  function renderPanel(data) {
    const item = data.last || (data.list && data.list[0]);
    if (!item) return '<p class="lottery-empty">暂无开奖数据</p>';

    const nums = extractNumbers(item);
    let html = '<div class="lottery-latest">';
    html += '<div class="lottery-latest-head"><span>第 <strong>' + item.code + '</strong> 期</span>';
    html += '<span>' + item.day + ' 开奖</span></div>';
    html += renderBalls(nums, data.type);
    if (item.next_code) {
      html += '<p class="lottery-next">下期 <strong>' + item.next_code + '</strong> · 预计 ' + (item.next_open_time || '待定') + ' 开奖</p>';
    }
    html += '</div>';

    if (data.list && data.list.length) {
      html += '<table class="lottery-table"><thead><tr><th>期号</th><th>开奖日期</th><th>开奖号码</th></tr></thead><tbody>';
      data.list.forEach((row) => {
        html += '<tr><td>' + row.code + '</td><td>' + row.day + '</td><td>' + extractNumbers(row).join(' ') + '</td></tr>';
      });
      html += '</tbody></table>';
    }
    return html;
  }

  function render() {
    if (!cache) return;
    const data = cache.data.find((d) => d.type === currentType);
    let html = '<div class="lottery-meta">';
    html += '<p>数据来源：<a href="http://api.huiniao.top/" target="_blank" rel="noopener">汇鸟彩票 API</a>';
    html += ' · 更新于 ' + (cache.fetchedAt || '').replace('T', ' ').slice(0, 19);
    html += ' <button type="button" class="lottery-refresh" id="lottery-refresh">刷新</button></p></div>';

    html += '<div class="lottery-tabs">';
    Object.keys(TYPES).forEach((key) => {
      html += '<button type="button" class="lottery-tab' + (key === currentType ? ' active' : '') + '" data-type="' + key + '">' + TYPES[key].name + '</button>';
    });
    html += '</div>';

    html += '<div class="lottery-content">' + (data ? renderPanel(data) : '<p class="lottery-empty">加载失败</p>') + '</div>';
    root.innerHTML = html;

    root.querySelectorAll('.lottery-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentType = btn.dataset.type;
        render();
      });
    });
    document.getElementById('lottery-refresh')?.addEventListener('click', () => load(true));
  }

  async function load(force) {
    root.innerHTML = '<div class="lottery-loading">正在' + (force ? '刷新' : '加载') + '开奖数据...</div>';
    try {
      const res = await fetchTimeout(API_URL + '?t=' + Date.now(), 12000);
      if (!res.ok) throw new Error('请求失败');
      cache = await res.json();
      if (!cache.data || !cache.data.length) throw new Error('暂无数据');
      render();
    } catch (e) {
      root.innerHTML = '<div class="lottery-error"><p>⚠️ 加载失败：' + (e.message || '网络错误') + '</p>'
        + '<p>请稍后重试，或访问 <a href="https://www.cwl.gov.cn/" target="_blank" rel="noopener">中国福利彩票官网</a></p>'
        + '<button type="button" class="lottery-refresh" id="lottery-refresh">重新加载</button></div>';
      document.getElementById('lottery-refresh')?.addEventListener('click', () => load(true));
    }
  }

  if (!document.getElementById('lottery-style')) {
    const style = document.createElement('style');
    style.id = 'lottery-style';
    style.textContent = `
      .lottery-meta{margin:12px 0;padding:12px 16px;background:#f6f8fa;border-radius:8px;border-left:4px solid #e52521;font-size:13px}
      .lottery-refresh{margin-left:8px;padding:4px 12px;border:none;border-radius:4px;background:#e52521;color:#fff;cursor:pointer;font-size:12px}
      .lottery-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
      .lottery-tab{padding:8px 18px;border:1px solid #ddd;border-radius:20px;background:#fff;cursor:pointer;font-size:14px}
      .lottery-tab.active{background:#e52521;color:#fff;border-color:#e52521}
      .lottery-latest{padding:20px;background:linear-gradient(135deg,#fff5f5,#fff);border-radius:12px;border:1px solid #fdd;margin-bottom:20px}
      .lottery-latest-head{display:flex;justify-content:space-between;margin-bottom:14px;font-size:14px;color:#666}
      .lottery-balls{display:flex;flex-wrap:wrap;gap:8px}
      .ball{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;font-weight:bold;font-size:14px;color:#fff}
      .ball.red{background:linear-gradient(135deg,#ff4444,#cc0000)}
      .ball.blue{background:linear-gradient(135deg,#4488ff,#0044cc)}
      .ball.gold{background:linear-gradient(135deg,#ffaa00,#cc7700)}
      .ball.purple{background:linear-gradient(135deg,#aa44ff,#6600cc)}
      .ball.orange{background:linear-gradient(135deg,#ff8844,#cc4400)}
      .lottery-next{margin-top:14px;font-size:13px;color:#888}
      .lottery-table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
      .lottery-table th,.lottery-table td{padding:10px 12px;border-bottom:1px solid #eee;text-align:left}
      .lottery-table th{background:#f9f9f9;font-weight:600}
      .lottery-loading,.lottery-error,.lottery-empty{padding:24px;text-align:center;color:#666}
    `;
    document.head.appendChild(style);
  }

  load(false);
})();
