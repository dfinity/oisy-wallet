// Prerendered on purpose, and it is the only reason this route exists.
//
// A link preview is fetched by a crawler that does not run JavaScript and never
// sends the fragment, so the card it shows comes from whatever HTML the server
// returns for the path alone. This app is served by a static asset canister,
// which returns a prerendered document for an exact path and falls back to the
// root `index.html` for anything else — verified against the deployed canister:
// `/terms-of-use` returns its own document, `/terms-of-use/anything` does not.
//
// So `/tip/<id>` could never carry a card of its own, and tip links showed the
// generic wallet one. `/tip` is a fixed path, so it can. Both the id and the
// claim code ride in the fragment instead, where no server sees either.
export const prerender = true;
