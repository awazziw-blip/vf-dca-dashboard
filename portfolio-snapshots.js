/* Display-only image snapshots; observed holdings are never interpreted as trades. */
let portfolioSnapshots = [];
const snapshotMoney = v => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' บาท';
const snapshotUnits = v => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 6 }).format(v);

function validSnapshot(s) {
  if (!/^P00[1-5]$/.test(s?.portfolio_id || '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(s?.data_as_of || '') ||
      typeof s.snapshot_ref !== 'string' || !s.snapshot_ref ||
      !Array.isArray(s.holdings) || !s.holdings.length ||
      !Number.isFinite(s.total_market_value) || s.total_market_value < 0) return false;
  const tickers = new Set();
  let total = 0;
  let targets = 0;
  for (const h of s.holdings) {
    if (typeof h.ticker !== 'string' || !/^[A-Z0-9]+$/.test(h.ticker) || tickers.has(h.ticker) ||
        !Number.isFinite(h.quantity) || h.quantity < 0 ||
        !Number.isFinite(h.unit_price) || h.unit_price < 0 ||
        !Number.isFinite(h.target_weight) || h.target_weight < 0 || h.target_weight > 1 ||
        !Number.isFinite(h.calculated_market_value) ||
        Math.abs(Math.round(h.quantity * h.unit_price * 100) / 100 - h.calculated_market_value) > 0.011) return false;
    tickers.add(h.ticker);
    total += h.calculated_market_value;
    targets += h.target_weight;
  }
  return Math.abs(Math.round(total * 100) / 100 - s.total_market_value) <= 0.011 && Math.abs(targets - 1) < 0.0001;
}

function snapshotNode(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = String(value);
  return node;
}

function latestSnapshot(id) {
  return portfolioSnapshots.filter(s => s.portfolio_id === id)
    .sort((a, b) => a.data_as_of.localeCompare(b.data_as_of) || a.snapshot_ref.localeCompare(b.snapshot_ref)).at(-1);
}

function renderPortfolioSnapshot() {
  const hero = document.querySelector('.main .hero');
  if (!hero) return;
  document.getElementById('portfolio-snapshot')?.remove();

  for (const button of document.querySelectorAll('.pbtn')) {
    const id = button.querySelector('.pid')?.textContent;
    const s = latestSnapshot(id);
    if (!s) continue;
    button.querySelector('.pvalue').textContent = snapshotMoney(s.total_market_value);
    button.querySelector('.cycle').textContent = `รูปพอร์ต ณ ${s.data_as_of}`;
  }

  const s = latestSnapshot(selected);
  if (!s) return;
  const kpi = document.querySelector('.compact-kpis .kpi:first-child');
  if (kpi) {
    kpi.querySelector('.label').textContent = `มูลค่าจากรูป ณ ${s.data_as_of}`;
    kpi.querySelector('.value').textContent = snapshotMoney(s.total_market_value);
  }

  const card = snapshotNode('section', 'card snapshot-update');
  card.id = 'portfolio-snapshot';
  const head = snapshotNode('div', 'snapshot-head');
  const title = snapshotNode('div');
  title.append(snapshotNode('h2', '', 'ยอดถือครองจากรูปพอร์ตล่าสุด'));
  title.append(snapshotNode('div', 'muted', `ข้อมูล ณ ${s.data_as_of} · ${s.snapshot_ref}`));
  head.append(title, snapshotNode('span', 'snapshot-badge', 'SNAPSHOT · ไม่ใช่รายการซื้อขาย'));
  card.append(head);
  const total = snapshotNode('div', 'snapshot-total', snapshotMoney(s.total_market_value));
  total.append(snapshotNode('small', '', 'รวมมูลค่าคำนวณจากจำนวนหน่วย × ราคา/NAV ในรูป'));
  card.append(total);

  const wrap = snapshotNode('div', 'snapshot-table-wrap');
  const table = snapshotNode('table', 'snapshot-table');
  const thead = snapshotNode('thead');
  const trHead = snapshotNode('tr');
  for (const label of ['สินทรัพย์', 'จำนวนหน่วย', 'ราคา/NAV', 'มูลค่า', 'สัดส่วน', 'เป้าหมาย']) trHead.append(snapshotNode('th', '', label));
  thead.append(trHead);
  table.append(thead);
  const tbody = snapshotNode('tbody');
  for (const h of s.holdings) {
    const tr = snapshotNode('tr');
    for (const value of [h.ticker, snapshotUnits(h.quantity), price(h.unit_price), snapshotMoney(h.calculated_market_value),
      (s.total_market_value ? h.calculated_market_value / s.total_market_value * 100 : 0).toFixed(2) + '%', (h.target_weight * 100).toFixed(2) + '%']) tr.append(snapshotNode('td', '', value));
    tbody.append(tr);
  }
  table.append(tbody);
  wrap.append(table);
  card.append(wrap);
  card.append(snapshotNode('p', 'snapshot-foot', `${s.source || 'PORTFOLIO_IMAGE'} · ${s.note || 'ส่วนต่างจากรูปก่อนหน้าไม่ใช่หลักฐานธุรกรรม'} · แผนรอบก่อนเป็นประวัติแยกต่างหาก`));
  (document.getElementById('review-update') || document.getElementById('review-source-note') || hero).before(card);
}

const renderWithReview = render;
render = function () {
  renderWithReview();
  renderPortfolioSnapshot();
};

fetch('./data/portfolio-snapshots.json', { cache: 'no-store' })
  .then(response => { if (!response.ok) throw Error(`HTTP ${response.status}`); return response.json(); })
  .then(feed => {
    if (feed?.schema_version !== 'rem-snapshot-v1' || !Array.isArray(feed.snapshots)) throw Error('Invalid snapshot feed');
    portfolioSnapshots = feed.snapshots.filter(validSnapshot);
    const refs = new Set();
    portfolioSnapshots = portfolioSnapshots.filter(s => {
      const key = `${s.portfolio_id}/${s.snapshot_ref}`;
      if (refs.has(key)) return false;
      refs.add(key);
      return true;
    });
    if (portfolioSnapshots.length !== feed.snapshots.length) console.warn('Some portfolio snapshots failed validation and were omitted.');
    if (D) render();
  })
  .catch(error => console.warn('Portfolio snapshots unavailable; existing Board remains available.', error));
