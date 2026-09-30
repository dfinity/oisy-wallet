import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import * as trustLineTokensEnv from '$env/xrp-trust-line-tokens.env';
import { mockXrpAddress2, mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
import {
	enabledXrpTrustLineTokens,
	xrpTrustLineTokenKeys,
	xrpTrustLineTokens,
	xrpUnsavedTrustLineTokens
} from '$xrp/derived/xrp-trust-line-tokens.derived';
import { xrpCustomTokensStore } from '$xrp/stores/xrp-custom-tokens.store';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import { toXrpTrustLineToken } from '$xrp/utils/xrp-trust-line-tokens.utils';
import { get } from 'svelte/store';

describe('xrp-trust-line-tokens.derived', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		xrpTrustLinesStore.clear(XRP_TOKEN.id);
		xrpCustomTokensStore.reset();
	});

	const usdLine = { ...mockXrpTrustLine, currency: 'USD' };

	const usdToken = toXrpTrustLineToken({ identity: usdLine, network: XRP_MAINNET_NETWORK });

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

		describe('with backend entries', () => {
			it('hides a held token its entry disables, and carries the entry version', () => {
				xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [mockXrpTrustLine, usdLine] });
				xrpCustomTokensStore.set({
					tokens: [{ ...RLUSD_TOKEN, enabled: false, version: 3n }],
					certified: true
				});

				const [rlusd, usd] = get(xrpTrustLineTokens);

				expect(rlusd).toEqual({ ...RLUSD_TOKEN, enabled: false, version: 3n });
				expect(usd.enabled).toBeTruthy();
				expect(get(enabledXrpTrustLineTokens)).toEqual([usd]);
			});

			it('prices only the shown tokens', () => {
				xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [mockXrpTrustLine, usdLine] });
				xrpCustomTokensStore.set({
					tokens: [{ ...RLUSD_TOKEN, enabled: false }],
					certified: true
				});

				expect(get(xrpTrustLineTokenKeys)).toEqual([`USD.${RLUSD_TOKEN.issuer}`]);
			});

			it('ignores an entry whose line does not exist: the token is not added', () => {
				xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [] });
				xrpCustomTokensStore.set({ tokens: [{ ...usdToken, enabled: true }], certified: true });

				expect(get(xrpTrustLineTokens)).toEqual([]);
			});
		});

		describe('xrpUnsavedTrustLineTokens', () => {
			beforeEach(() => {
				xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [mockXrpTrustLine, usdLine] });
			});

			it('is empty before the backend list is loaded', () => {
				expect(get(xrpUnsavedTrustLineTokens)).toEqual([]);
			});

			it('is empty while the backend list is not certified', () => {
				xrpCustomTokensStore.set({ tokens: [], certified: false });

				expect(get(xrpUnsavedTrustLineTokens)).toEqual([]);
			});

			it('lists the held tokens a certified list has no entry for', () => {
				xrpCustomTokensStore.set({
					tokens: [{ ...RLUSD_TOKEN, enabled: false }],
					certified: true
				});

				expect(get(xrpUnsavedTrustLineTokens)).toEqual([{ ...usdToken, enabled: true }]);
			});

			it('counts an entry only for the same currency and issuer', () => {
				const otherIssuer = toXrpTrustLineToken({
					identity: { currency: 'USD', issuer: mockXrpAddress2 },
					network: XRP_MAINNET_NETWORK
				});

				xrpCustomTokensStore.set({ tokens: [{ ...otherIssuer, enabled: true }], certified: true });

				expect(get(xrpUnsavedTrustLineTokens).map(({ id }) => id)).toEqual([
					RLUSD_TOKEN.id,
					usdToken.id
				]);
			});
		});
	});
});
