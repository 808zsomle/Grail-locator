// Cloudflare Pages Function: GET /api/search
// Secrets (Pages > Settings > Variables and Secrets): EBAY_CLIENT_ID, EBAY_CLIENT_SECRET
// Query: q, site, min, max, cond (new|used), country (2-letter), sort (newest|low|high), offset
const SITES = { EBAY_GB: "GBP", EBAY_US: "USD", EBAY_DE: "EUR", EBAY_FR: "EUR", EBAY_IT: "EUR", EBAY_ES: "EUR", EBAY_AU: "AUD", EBAY_CA: "CAD" };
const SORTS = { newest: "newlyListed", low: "price", high: "-price" };
const COND = { new: "NEW", used: "USED" };
const LIMIT = 24;
let tokenCache = { token: null, expiry: 0 };

function json(data, status = 200, cache = "no-store") {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache },
  });
}

async function tokenFor(env) {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiry > now + 60000) return tokenCache.token;
  const resp = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(env.EBAY_CLIENT_ID + ":" + env.EBAY_CLIENT_SECRET),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }).toString(),
  });
  if (!resp.ok) throw new Error("eBay authentication failed (" + resp.status + "). Check production credentials and API approval.");
  const r = await resp.json();
  if (!r.access_token) throw new Error("eBay did not return an access token.");
  tokenCache = { token: r.access_token, expiry: now + (Number(r.expires_in) || 7000) * 1000 };
  return r.access_token;
}

function sizeFrom(item) {
  const aspects = item.localizedAspects || item.itemSpecifics || [];
  const a = Array.isArray(aspects) ? aspects.find((x) => /^(size|waist size|tagged size|jeans size)$/i.test(x.name || "")) : null;
  if (a) { const v = a.value || a.values?.[0]; if (v) return String(v); }
  const m = String(item.title || "").match(/\b(?:size\s*)?(?:W\d{2}(?:\s*L\d{2})?|\d{2}\s*[xX]\s*\d{2}|(?:XXS|XS|S|M|L|XL|XXL|XXXL))\b/i);
  return m ? m[0].replace(/^size\s*/i, "") : "";
}

function num(v) { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : null; }

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const q = (u.searchParams.get("q") || "").trim();
  if (q.length < 2 || q.length > 120) return json({ error: "Enter a search between 2 and 120 characters." }, 400);
  if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET)
    return json({ error: "eBay is not connected yet. Add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET as Cloudflare Pages secrets. No sample listings are shown." }, 503);

  const site = SITES[u.searchParams.get("site")] ? u.searchParams.get("site") : "EBAY_GB";
  const currency = SITES[site];
  const offset = Math.min(Math.max(parseInt(u.searchParams.get("offset") || "0", 10) || 0, 0), 9900);

  const filters = [];
  const min = num(u.searchParams.get("min")), max = num(u.searchParams.get("max"));
  if (min !== null || max !== null) filters.push("price:[" + (min ?? "") + ".." + (max ?? "") + "]", "priceCurrency:" + currency);
  const cond = COND[u.searchParams.get("cond")];
  if (cond) filters.push("conditions:{" + cond + "}");
  const country = (u.searchParams.get("country") || "").toUpperCase();
  if (/^[A-Z]{2}$/.test(country)) filters.push("itemLocationCountry:" + country);

  const params = new URLSearchParams({ q, limit: String(LIMIT), offset: String(offset) });
  if (filters.length) params.set("filter", filters.join(","));
  const sort = SORTS[u.searchParams.get("sort")];
  if (sort) params.set("sort", sort);

  try {
    const token = await tokenFor(env);
    const r = await fetch("https://api.ebay.com/buy/browse/v1/item_summary/search?" + params, {
      headers: { Authorization: "Bearer " + token, "X-EBAY-C-MARKETPLACE-ID": site, Accept: "application/json" },
    });
    if (!r.ok) {
      const msg = r.status === 403 ? "eBay denied access. Production API approval may be required."
        : r.status === 429 ? "eBay rate limit reached. Try again shortly."
        : r.status === 400 ? "eBay rejected one of the filters. Adjust the filters and try again."
        : "eBay request failed (" + r.status + ").";
      return json({ error: msg }, 502);
    }
    const body = await r.json();
    const items = (body.itemSummaries || []).filter((i) => i.itemWebUrl && i.title).map((i) => ({
      id: "ebay:" + i.itemId,
      marketplace: "eBay",
      title: i.title,
      image: i.image?.imageUrl || i.thumbnailImages?.[0]?.imageUrl || "",
      price: i.price?.value ? Number(i.price.value) : null,
      currency: i.price?.currency || currency,
      size: sizeFrom(i),
      condition: i.condition || "",
      location: [i.itemLocation?.city, i.itemLocation?.stateOrProvince, i.itemLocation?.country].filter(Boolean).join(", "),
      created: i.itemCreationDate || "",
      url: i.itemWebUrl,
    }));
    const total = Number(body.total) || 0;
    const nextOffset = offset + LIMIT < Math.min(total, 10000) ? offset + LIMIT : null;
    return json(
      { items, total, next: nextOffset, currency, sources: ["eBay"],
        message: "Live eBay listings (" + site.replace("EBAY_", "") + ", " + currency + "). Other marketplaces are not connected. Size is shown only when listed or found in the title." },
      200,
      "public, max-age=60"
    );
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected search failure." }, 502);
  }
}
