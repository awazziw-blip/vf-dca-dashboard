/* Display-only Remaster review feed. This never changes production actuals. */
let reviewUpdates = [];

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

    const grid = reviewNode('div', 'review-grid');
    for (const [label, amount] of [
      ['งบประมาณ', update.budget],
      ['ยอดซื้อตามแผน', update.planned_buy_total],
      ['งบเหลือตามแผน', update.planned_cash_buffer]
    ]) {
      const cell = reviewNode('div');
      cell.append(reviewNode('span', '', label), reviewNode('b', '', money(amount)));
      grid.append(cell);
    }
    card.append(grid);

    const orders = reviewNode('div', 'review-orders');
    for (const order of update.planned_orders || []) {
      orders.append(reviewNode('div', 'review-order', `${order.ticker} ${num(order.quantity)} × ${price(order.reference_price)} = ${money(order.planned_amount)}`));
    }
    if (orders.childElementCount) card.append(orders);
    card.append(reviewNode('div', 'review-warning', update.actual_execution_status === 'NOT_REPORTED'
      ? 'ยังไม่มีผลซื้อจริง — รายการข้างบนเป็นแผนประมาณการ'
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

  const source = reviewNode('div', 'review-source-note',
    `ข้อมูลแผงด้านล่างมาจากรอบที่บันทึกในฐานข้อมูล: ${portfolio(selected)?.latest_cycle_id || '—'} · แยกจากอัปเดตแผนข้างบน`);
  source.id = 'review-source-note';
  hero.before(source);
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
