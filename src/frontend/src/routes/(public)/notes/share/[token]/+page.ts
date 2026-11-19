// The share token is opaque and per-link, so this route cannot be prerendered
// (the root layout enables prerender by default). It is served via the SPA
// fallback and rendered client-side, where the fragment key is available.
export const prerender = false;
