import en from '$lib/i18n/en.json';

/**
 * The tip link's share card, which `scripts/build.seo.mjs` reads straight out of
 * `en.json` and writes into `build/tip/index.html`.
 *
 * Tested here rather than through a component because no component renders it:
 * `routes/+layout.ts` sets `ssr = false`, so a `<svelte:head>` never reaches the
 * prerendered document and the card is injected at build time instead. That also
 * means nothing at runtime would ever reveal a mistake in it — the first reader
 * is a stranger seeing OISY for the first time, in someone else's chat app.
 */
describe('the tip share card copy', () => {
	const { title, description } = en.tip.share;

	it('carries no i18n placeholders', () => {
		// The trap this closes. Every other string in `en.json` uses `$oisy_short`
		// and friends, so reaching for one here is the natural thing to do — but
		// `build.seo.mjs` does no substitution, and `replaceOisyPlaceholders` is a
		// runtime helper that never runs for a prerendered document. A placeholder
		// would be written into the meta tag verbatim and shipped that way.
		expect(title).not.toMatch(/\$[a-z_]+/);
		expect(description).not.toMatch(/\$[a-z_]+/);
	});

	it('does not promise the tip is already the reader own', () => {
		// It used to say "only you can move it", which is not true when the card is
		// read: the claim code is a bearer credential, so before the claim whoever
		// holds the link can claim it. Beyond being wrong it pointed the wrong way —
		// a reader who believes it is already theirs has no reason to be careful
		// with the link, and forwarding it hands over the money.
		expect(description).not.toMatch(/only you/i);
	});

	it('says what OISY is, for a reader who has never heard of it', () => {
		// An unknown domain offering money is the shape of a scam, and the card is
		// the only place this reader meets OISY before deciding to open it.
		expect(description).toMatch(/browser/i);
	});
});
