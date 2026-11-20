import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import * as saveCustomTokensServices from '$lib/services/save-custom-tokens.services';
import * as consoleUtils from '$lib/utils/console.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockXrpAddress2 } from '$tests/mocks/xrp.mock';
import { saveUnsavedXrpTrustLineTokens } from '$xrp/services/xrp-trust-line-tokens.services';
import { toXrpTrustLineToken } from '$xrp/utils/xrp-trust-line-tokens.utils';

vi.mock('$lib/services/save-custom-tokens.services', () => ({
	saveCustomTokens: vi.fn()
}));

describe('xrp-trust-line-tokens.services', () => {
	// Each held line is tried once per session, so every case uses tokens of its own.
	const tokenOf = (currency: string) =>
		toXrpTrustLineToken({
			identity: { currency, issuer: mockXrpAddress2 },
			network: XRP_MAINNET_NETWORK
		});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(saveCustomTokensServices.saveCustomTokens).mockResolvedValue(undefined);
	});

	describe('saveUnsavedXrpTrustLineTokens', () => {
		it('saves each token enabled, by its currency and issuer only', async () => {
			await saveUnsavedXrpTrustLineTokens({
				identity: mockIdentity,
				tokens: [tokenOf('AAA'), tokenOf('BBB')]
			});

			expect(saveCustomTokensServices.saveCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					{
						currency: 'AAA',
						issuer: mockXrpAddress2,
						networkKey: 'XrpTrustLineMainnet',
						enabled: true
					},
					{
						currency: 'BBB',
						issuer: mockXrpAddress2,
						networkKey: 'XrpTrustLineMainnet',
						enabled: true
					}
				]
			});
		});

		it('tries a token once per session', async () => {
			const token = tokenOf('CCC');

			await saveUnsavedXrpTrustLineTokens({ identity: mockIdentity, tokens: [token] });
			await saveUnsavedXrpTrustLineTokens({ identity: mockIdentity, tokens: [token] });

			expect(saveCustomTokensServices.saveCustomTokens).toHaveBeenCalledOnce();
		});

		it('does not retry a token whose save failed, and does not throw', async () => {
			vi.mocked(saveCustomTokensServices.saveCustomTokens).mockRejectedValue(new Error('fail'));
			const consoleSpy = vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});
			const token = tokenOf('DDD');

			await expect(
				saveUnsavedXrpTrustLineTokens({ identity: mockIdentity, tokens: [token] })
			).resolves.toBeUndefined();

			await saveUnsavedXrpTrustLineTokens({ identity: mockIdentity, tokens: [token] });

			expect(saveCustomTokensServices.saveCustomTokens).toHaveBeenCalledOnce();
			expect(consoleSpy).toHaveBeenCalledOnce();
		});

		it('saves nothing for no tokens', async () => {
			await saveUnsavedXrpTrustLineTokens({ identity: mockIdentity, tokens: [] });

			expect(saveCustomTokensServices.saveCustomTokens).not.toHaveBeenCalled();
		});
	});
});
