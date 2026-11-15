# GRAIL LOCATER ✠

Black-and-silver, gothic-inspired vintage and archive fashion search.

## Current status

- **Frontend:** Responsive, in-page product cards for photos, title, price, size when supplied, listing location and marketplace.
- **eBay:** Real eBay Browse API connector implemented in a Cloudflare Pages Function at `functions/api/search.js`. **Not active until you add approved production credentials.**
- **Vinted, Grailed, Depop, Etsy, Vestiaire Collective, Kleinanzeigen, Sellraze, SellSpy:** Not connected. The UI marks these as unavailable instead of showing fake listings.
- All result links open the original seller listing for checkout. GRAIL LOCATER does not handle purchases.

## Deploy to Cloudflare Pages

1. Sign in to Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Connect GitHub and select `808zsomle/Grail-locator`.
3. Deploy settings: **Framework preset: None**, **Build command: blank**, **Build output directory: `.`**.
4. Deploy once. Your website will appear under an available `*.pages.dev` address. The exact name is chosen by Cloudflare.
5. In the Cloudflare Pages project, go to **Settings → Variables and Secrets** (wording may differ). Create these **encrypted secrets** for Production:
   - `EBAY_CLIENT_ID` = eBay **production** App ID / Client ID
   - `EBAY_CLIENT_SECRET` = eBay **production** Cert ID / Client Secret
6. Redeploy the project after adding secrets. **Never put API secrets into GitHub files or client-side JavaScript.**
7. Search for an item. Real listings appear inside the site **only if eBay grants API access**. The official Browse API may require production access approval.

## Development notes

- The frontend calls `/api/search?q=...` on its own domain; the Cloudflare Pages Function handles OAuth and server-to-server eBay search. This avoids putting the eBay secret in the browser.
- The API fetches from `EBAY_GB` for initial English-language results. Future work: a regional marketplace selector, more approved providers, favorites, currency handling, pagination, caching and anti-abuse controls.
- **Sizes:** eBay item summary results often omit structured sizes; the server checks available aspects and title text. Missing sizes are labeled as unspecified.
- **Prices:** Listings may use different currencies. Sorting compares numeric values without FX conversion; cross-currency sorting must be implemented before additional regional sources are added.
- **No fake data.** The interface reports unavailable providers honestly.
- **Access and costs:** Cloudflare free tiers have limits, and eBay API permissions and quotas apply. Marketplace data providers may charge fees.

This is an independent search tool and is not affiliated with Chrome Hearts or the marketplaces.
