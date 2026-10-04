# VF-DCA Remaster Portfolio Snapshot

`data/portfolio-snapshots.json` is a display-only feed for observed holdings from a user-submitted portfolio image. The newest `data_as_of` per portfolio appears above the historical production cycle. The portfolio selector and value KPI use that same snapshot value. The old production decision and execution sections remain historical.

The public feed starts empty. A P003 2026-10-02 fixture was used for local arithmetic checks, but is not published by this change. `total_market_value` is the sum of `quantity × unit_price` rounded to satang. No planned order is added to the holdings.

For each new image and portfolio ID:

1. Read the holdings and date through the existing Spark pre-audit process; resolve unclear rows before public publication. GPT audits the new snapshot and plan under 001–003.
2. Append one snapshot keyed by `(portfolio_id, snapshot_ref)`. Include the confirmed active holdings, units, price/NAV, target weights, calculated market values and total. Keep older snapshots as history. Never derive actual buys, sells, prices or fees from the difference between images.
3. Validate unique tickers, nonnegative numbers, row arithmetic and total reconciliation. Verify the public feed contains only data approved for this public Board.
4. Publish the feed separately from the production `data/dashboard.json`, then check the live Board for the selected portfolio, as-of date, total and each holding. A feed failure leaves the historical Board and Review Update usable.

This front-end checks arithmetic but cannot verify that an image was read correctly or that the active whitelist is complete. Those checks belong to pre-audit before the feed is published. The main production hero and decision cards are labeled as historical by the Review Update; they must not be read as trades from this snapshot.
