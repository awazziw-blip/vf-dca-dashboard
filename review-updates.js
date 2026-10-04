/* Display-only Remaster review feed. This never changes production actuals. */
let reviewUpdates = [];
const reviewMoney = value => Number.isFinite(value)
  ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value)
  : 'ไม่ระบุ';
const reviewFundMoney = value => Number.isFinite(value)
  ? new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' บาท'
  : 'ไม่ระบุ';

function reviewNode(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = String(value);
  return node;
}

function renderReviewUpdate() {
  const hero = document.querySelector('.main .hero');
  if (!hero) return;
  document.getElementById('review-update')?.remove();
  document.getElementById('review-source-note')?.remove();

  const update = reviewUpdates
    .filter(x => x.portfolio_id === selected)
    .sort((a, b) => a.data_as_of.localeCompare(b.data_as_of) || a.review_ref.localeCompare(b.review_ref))
    .at(-1);

  if (update) {
    const card = reviewNode('section', 'card review-update');
    card.id = 'review-update';
    const head = reviewNode('div', 'review-head');
    const left = reviewNode('div');
    left.append(reviewNode('h2', '', 'อัปเดตแผนรอบล่าสุด'));
    left.append(reviewNode('div', 'muted', `ข้อมูล ณ ${update.data_as_of} · ${update.review_ref}`));
    head.append(left, reviewNode('span', 'review-badge', `${update.report_status} · ${update.decision}`));
    card.append(head);

    const isFund = /^P00[45]$/.test(update.portfolio_id);
    const grid = reviewNode('div', 'review-grid');
    for (const [label, amount] of [
      [isFund ? 'เงินใหม่รอบนี้' : 'งบประมาณ', update.budget],
      [isFund ? 'เงินใหม่ตามแผน' : 'ยอดซื้อตามแผน', update.planned_buy_total],
      [isFund ? 'เงินใหม่ที่ยังไม่จัดสรร' : 'งบเหลือตามแผน', update.planned_cash_buffer]
    ]) {
      const cell = reviewNode('div');
      cell.append(reviewNode('span', '', label), reviewNode('b', '', isFund ? reviewFundMoney(amount) : reviewMoney(amount)));
      grid.append(cell);
    }
    card.append(grid);

    const orders = reviewNode('div', 'review-orders');
    for (const order of update.planned_orders || []) {
      if (isFund) {
        const parts = [];
        if (Number.isFinite(order.contribution_amount)) parts.push(`เงินใหม่ ${reviewFundMoney(order.contribution_amount)}`);
        if (Number.isFinite(order.switch_in_amount)) parts.push(`สับเปลี่ยนเข้า ${reviewFundMoney(order.switch_in_amount)}`);
        if (Number.isFinite(order.switch_out_amount)) parts.push(`สับเปลี่ยนออก ${reviewFundMoney(order.switch_out_amount)}`);
        if (!parts.length && Number.isFinite(order.planned_amount)) parts.push(`ตามแผน ${reviewFundMoney(order.planned_amount)}`);
        if (order.nav_status) parts.push(`NAV ${order.nav_status}`);
        orders.append(reviewNode('div', 'review-order', `${order.fund_code || order.ticker || 'กองทุน'} · ${parts.join(' · ') || 'ยอดเงินรอยืนยัน'}`));
      } else {
        orders.append(reviewNode('div', 'review-order', `${order.ticker} ${num(order.quantity)} × ${price(order.reference_price)} = ${reviewMoney(order.planned_amount)}`));
      }
    }
    if (orders.childElementCount) card.append(orders);
    else card.append(reviewNode('div', 'review-order', 'ไม่มีรายการซื้อในแผนรอบนี้'));
    card.append(reviewNode('div', 'review-warning', update.actual_execution_status === 'NOT_REPORTED' || update.actual_execution_status === 'NOT_TRACKED_IN_REMASTER'
      ? 'รายการข้างบนเป็นแผน ไม่ใช่ผลซื้อจริง · รอบถัดไปใช้รูปพอร์ตใหม่'
      : `สถานะผลซื้อจริง: ${update.actual_execution_status}`));
    if (update.note) card.append(reviewNode('p', 'muted', update.note));
    if (typeof update.report_url === 'string' && update.report_url.startsWith('https://docs.google.com/document/d/')) {
      const link = reviewNode('a', '', 'อ่านรายงาน');
      link.href = update.report_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      card.append(link);
    }
    hero.before(card);
  }

  if (update) {
    const source = reviewNode('div', 'review-source-note',
      `ข้อมูลพอร์ตด้านล่างเป็นประวัติระบบเดิมรอบ ${portfolio(selected)?.latest_cycle_id || '—'} ไม่ใช่ผลซื้อของแผนวันที่ ${update.data_as_of}`);
    source.id = 'review-source-note';
    hero.before(source);
    hero.remove();
  }
}

const renderProductionDashboard = render;
render = function () {
  renderProductionDashboard();
  renderReviewUpdate();
};

fetch('./data/review-updates.json', { cache: 'no-store' })
  .then(response => { if (!response.ok) throw Error(`HTTP ${response.status}`); return response.json(); })
  .then(feed => {
    if (feed?.schema_version !== 'rem-review-v1' || !Array.isArray(feed.updates)) throw Error('Invalid review feed');
    reviewUpdates = feed.updates;
    if (D) renderReviewUpdate();
  })
  .catch(error => {
    console.warn('Review updates unavailable; production dashboard remains available.', error);
    if (D) renderReviewUpdate();
  });
