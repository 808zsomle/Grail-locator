# GRAIL LOCATER ✠

Black-and-silver, gothic-inspired vintage and archive fashion search. Results appear inside the site; links go to the original listing.

## What works

- **Frontend (`public/index.html`):** responsive, in-page listing cards (photo, title, price in original currency, size when listed, condition, location, marketplace), filters (eBay site/currency, min/max price, condition, item country, size, brand), sorting (best match, newest, price), "load more" pagination, favourites and saved searches (stored in the browser's localStorage), duplicate removal (same title, price and currency).
- **eBay (`functions/api/search.js`):** real Browse API connector with token caching. **Inactive until you add production credentials.**

## What is not done

- Vinted, Grailed, Depop, Etsy, Vestiaire Collective, Kleinanzeigen, Sellraze, SellSpy: **not connected**. None has a public search API that I could confirm; Etsy needs app approval. The UI says so.
- Size and brand filters only apply to listings already loaded. eBay's search summaries often omit size, so size is read from item specifics or the title when possible.
- Favourites and saved searches live in one browser only. Accounts and alerts are Phase 3.
- Currency: each search is for one eBay site, so prices are in one currency and price sorting is correct. No conversion between currencies is done.

## Deploy (Cloudflare Pages)

1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → `808zsomle/Grail-locator`.
2. Framework preset **None**, build command **blank**, build output directory **`public`**. The `functions/` folder at the repo root is picked up automatically.
3. Settings → Variables and Secrets → add encrypted **Production** secrets `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` (eBay production App ID and Cert ID).
4. Redeploy. Never put keys in repo files or frontend code.

eBay production keys require handling eBay's marketplace account deletion notification (or applying for an exemption) before they are enabled. Check developer.ebay.com.

Independent tool, not affiliated with Chrome Hearts or any marketplace.
