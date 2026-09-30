import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { mockRlusdCurrencyCode, mockRlusdIssuer, mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';
import { toXrpTrustLineToken } from '$xrp/utils/xrp-trust-line-tokens.utils';

describe('xrp-trust-line-tokens.utils', () => {
	describe('toXrpTrustLineToken', () => {
		const network = XRP_MAINNET_NETWORK;

		it('is the listed token when OISY lists the currency and the issuer', () => {
			expect(toXrpTrustLineToken({ identity: mockXrpTrustLine, network })).toEqual({
				...RLUSD_TOKEN,
				enabled: true
			});
		});

		it('is named after the currency code otherwise', () => {
			const token = toXrpTrustLineToken({
				identity: { ...mockXrpTrustLine, currency: 'USD' },
				network
			});

			expect(token).toEqual(
				expect.objectContaining({
					standard: { code: 'xrp-trust-line' },
					category: 'custom',
					name: 'USD',
					symbol: 'USD',
					decimals: 18,
					currency: 'USD',
					issuer: mockRlusdIssuer,
					network,
					enabled: true
				})
			);
			expect(token.id.description).toBe(`USD.${mockRlusdIssuer}`);
		});

		it('keeps one id per token across reads, so balances stay attached to it', () => {
			const line = { ...mockXrpTrustLine, currency: 'EUR' };
			const nextRead: XrpTrustLine = { ...line, balance: '5' };

			expect(toXrpTrustLineToken({ identity: line, network }).id).toBe(
				toXrpTrustLineToken({ identity: nextRead, network }).id
			);
		});

		it('gives a line and a backend entry of the same token one id, so they are matched', () => {
			const line = { ...mockXrpTrustLine, currency: 'GBP' };

			expect(toXrpTrustLineToken({ identity: line, network }).id).toBe(
				toXrpTrustLineToken({ identity: { currency: 'GBP', issuer: line.issuer }, network }).id
			);
		});

		it('gives the same code from another issuer its own token, not RLUSD', () => {
			const token = toXrpTrustLineToken({
				identity: {
					...mockXrpTrustLine,
					currency: mockRlusdCurrencyCode,
					issuer: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'
				},
				network
			});

			expect(token.id).not.toBe(RLUSD_TOKEN.id);
			expect(token.symbol).toBe('RLUSD');
			expect(token.category).toBe('custom');
		});
	});
});
