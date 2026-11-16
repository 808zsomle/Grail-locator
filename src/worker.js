import { onRequestGet } from "../functions/api/search.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/search") {
      if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
      return onRequestGet({ request, env });
    }
    return env.ASSETS.fetch(request);
  },
};
