# VF-DCA Remaster Review Update — draft

This draft adds a separate, display-only review feed to the existing Board.

- `index.html`: loads `review-updates.css` and `review-updates.js` after the original dashboard script.
- `review-updates.js`: shows the latest review for each portfolio above the existing production cycle; a missing feed does not break the existing dashboard.
- `review-updates.css`: layout and status badge.
- `data/review-updates.json`: P003 example from the ESTIMATE report dated 2026-10-02. It contains planned orders only, with `actual_execution_status=NOT_REPORTED`.

`data/dashboard.json`, the production Sheet, Apps Script, and historical execution records remain unchanged. The new feed is a separate source for the review section. To publish new reviews, append an entry with a unique `(portfolio_id, review_ref)` and check `budget = planned_buy_total + planned_cash_buffer` and planned order totals. A no-buy review has an empty `planned_orders` list and `planned_buy_total=0`.

This draft is not deployed. The repository is public; publishing the P003 feed discloses the portfolio's planned orders. The private report URL is intentionally omitted from the feed.
