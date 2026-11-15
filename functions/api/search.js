// Cloudflare Pages Function: /api/search
// Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in Pages > Settings > Variables and Secrets.
// Production eBay Browse API access may require approval from eBay.
let tokenCache={token:null,expiry:0};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*"}})}
async function tokenFor(env){
 const now=Date.now();if(tokenCache.token&&tokenCache.expiry>now+60000)return tokenCache.token;
 const encoded=btoa(env.EBAY_CLIENT_ID+":"+env.EBAY_CLIENT_SECRET);
 const body=new URLSearchParams({grant_type:"client_credentials",scope:"https://api.ebay.com/oauth/api_scope"});
 const resp=await fetch("https://api.ebay.com/identity/v1/oauth2/token",{method:"POST",headers:{"Authorization":"Basic "+encoded,"Content-Type":"application/x-www-form-urlencoded"},body:body.toString()});
 if(!resp.ok)throw new Error("eBay authentication failed ("+resp.status+"). Check production credentials and API permissions.");
 const result=await resp.json();if(!result.access_token)throw new Error("eBay did not return an access token.");
 tokenCache={token:result.access_token,expiry:now+(Number(result.expires_in)||7000)*1000};return result.access_token;
}
function sizeFrom(item){
 const aspects=item.localizedAspects||item.itemSpecifics||[];
 const aspect=Array.isArray(aspects)?aspects.find(a=>/^(size|waist size|tagged size|jeans size)$/i.test(a.name||"")):null;
 if(aspect){const v=aspect.value||aspect.values?.[0];if(v)return String(v);}
 const title=String(item.title||"");const match=title.match(/\b(?:size\s*)?(?:W\d{2}(?:\s*L\d{2})?|\d{2}\s*[xX]\s*\d{2}|(?:XS|S|M|L|XL|XXL))\b/i);return match?match[0]:"";
}
export async function onRequestGet({request,env}){
 const url=new URL(request.url),q=(url.searchParams.get("q")||"").trim();
 if(q.length<2||q.length>120)return json({error:"Please enter a search between 2 and 120 characters."},400);
 if(!env.EBAY_CLIENT_ID||!env.EBAY_CLIENT_SECRET)return json({error:"The eBay connection isn't configured yet. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in Cloudflare Pages secrets. No sample listings are being displayed."},503);
 try{
  const accessToken=await tokenFor(env);
  const params=new URLSearchParams({q,limit:"48"});
  const response=await fetch("https://api.ebay.com/buy/browse/v1/item_summary/search?"+params,{headers:{"Authorization":"Bearer "+accessToken,"X-EBAY-C-MARKETPLACE-ID":"EBAY_GB","Accept":"application/json"}});
  if(!response.ok){const msg=response.status===403?"eBay Browse API access was denied. Production API approval may be required.":response.status===429?"eBay rate limit reached. Try again later.":"eBay request failed ("+response.status+").";return json({error:msg},502)}
  const body=await response.json();
  const listings=(body.itemSummaries||[]).filter(i=>i.itemWebUrl&&i.title).map(i=>({
   marketplace:"eBay",title:i.title,
   image:i.image?.imageUrl||i.thumbnailImages?.[0]?.imageUrl||"",
   price:Number(i.price?.value)||0,
   price_display:i.price?.value?i.price.value+" "+(i.price.currency||""):"Price unavailable",
   size:sizeFrom(i),
   location:[i.itemLocation?.city,i.itemLocation?.stateOrProvince,i.itemLocation?.country].filter(Boolean).join(", ")||"Not specified",
   url:i.itemWebUrl
  }));
  return json({items:listings,message:"Showing real eBay Browse API listings. Other marketplaces are not yet connected. Size is shown only when available or inferred from listing titles.",sources:["eBay"]});
 }catch(e){return json({error:e instanceof Error?e.message:"Unexpected search failure."},502)}
}
