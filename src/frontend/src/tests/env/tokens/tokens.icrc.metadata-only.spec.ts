import { additionalIcrcTokens } from '$env/tokens/tokens.icrc.env';

/**
 * The 1Sec-bridged USDC/USDT on ICP are curated metadata only: they must stay
 * flagged `metadataOnly` so they are not surfaced to new users (not shown in the
 * manage list, not enabled by default, not offered as swap destinations) while
 * still enriching a manual import. Pinned here so an accidental un-demotion trips
 * an assertion.
 */
describe('1Sec ICRC stablecoins on ICP are metadata-only', () => {
	it.each([
		{ symbol: 'USDC', ledgerCanisterId: '53nhb-haaaa-aaaar-qbn5q-cai' },
		{ symbol: 'USDT', ledgerCanisterId: 'ij33n-oiaaa-aaaar-qbooa-cai' }
	])('$symbol is flagged metadataOnly', ({ symbol, ledgerCanisterId }) => {
		const token = additionalIcrcTokens[symbol];

		expect(token?.ledgerCanisterId).toBe(ledgerCanisterId);
		// Strict boolean check: a non-boolean truthy value must not satisfy the pin.
		expect(token?.metadataOnly === true).toBeTruthy();
	});
});
