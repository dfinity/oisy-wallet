import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import * as trustLineTokensEnv from '$env/xrp-trust-line-tokens.env';
import { mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
import {
	xrpTrustLineTokenKeys,
	xrpTrustLineTokens
} from '$xrp/derived/xrp-trust-line-tokens.derived';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import { get } from 'svelte/store';

describe('xrp-trust-line-tokens.derived', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		xrpTrustLinesStore.clear(XRP_TOKEN.id);
	});

	it('runs against the native XRP token being enabled', () => {
		// The premise of every case below: lines hang off the native token's account.
		expect(get(enabledXrpTokens).map(({ id }) => id)).toContain(XRP_TOKEN.id);
	});

	it('lists nothing while trust-line tokens are off, whatever the ledger holds', () => {
		xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [mockXrpTrustLine] });

		expect(get(xrpTrustLineTokens)).toEqual([]);
	});

	describe('when trust-line tokens are on', () => {
		beforeEach(() => {
			vi.spyOn(trustLineTokensEnv, 'XRP_TRUST_LINE_TOKENS_ENABLED', 'get').mockReturnValue(true);
		});

		it('lists nothing before the lines are read', () => {
			expect(get(xrpTrustLineTokens)).toEqual([]);
		});

		it('lists one enabled token per line', () => {
			xrpTrustLinesStore.set({
				tokenId: XRP_TOKEN.id,
				lines: [mockXrpTrustLine, { ...mockXrpTrustLine, currency: 'USD' }]
			});

			const tokens = get(xrpTrustLineTokens);

			expect(tokens.map(({ symbol }) => symbol)).toEqual(['RLUSD', 'USD']);
			expect(tokens[0]).toEqual({ ...RLUSD_TOKEN, enabled: true });
			expect(tokens.every(({ enabled }) => enabled)).toBeTruthy();
		});

		it('prices each held token under its currency and issuer', () => {
			xrpTrustLinesStore.set({
				tokenId: XRP_TOKEN.id,
				lines: [mockXrpTrustLine, { ...mockXrpTrustLine, currency: 'USD' }]
			});

			expect(get(xrpTrustLineTokenKeys)).toEqual([
				`${RLUSD_TOKEN.currency}.${RLUSD_TOKEN.issuer}`,
				`USD.${RLUSD_TOKEN.issuer}`
			]);
		});

		it('drops a token once its line is gone', () => {
			xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [mockXrpTrustLine] });
			xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [] });

			expect(get(xrpTrustLineTokens)).toEqual([]);
		});
	});
});
