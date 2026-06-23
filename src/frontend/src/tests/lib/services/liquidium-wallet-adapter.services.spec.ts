import * as signerApi from '$lib/api/signer.api';
import { liquidiumWalletAdapter } from '$lib/services/liquidium-wallet-adapter.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Chain, type SignMessageRequest } from '@liquidium/client';

vi.mock('$lib/api/signer.api', () => ({
	signMessage: vi.fn()
}));

describe('liquidium-wallet-adapter.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const baseRequest: Omit<SignMessageRequest, 'chain'> = {
		message: 'sign me',
		actionType: 'create-account',
		transferMode: 'native'
	};

	describe('signMessage', () => {
		it('delegates an ETH message to the signer api with the identity', async () => {
			const signature = '0xsignature';
			vi.mocked(signerApi.signMessage).mockResolvedValue(signature);

			const adapter = liquidiumWalletAdapter({ identity: mockIdentity });

			const result = await adapter.signMessage?.({ ...baseRequest, chain: Chain.ETH });

			expect(result).toBe(signature);
			expect(signerApi.signMessage).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				message: baseRequest.message
			});
		});

		it('throws for a non-ETH chain (no BIP-322 signing path)', async () => {
			const adapter = liquidiumWalletAdapter({ identity: mockIdentity });

			await expect(adapter.signMessage?.({ ...baseRequest, chain: Chain.BTC })).rejects.toThrow(
				'unsupported chain'
			);
			expect(signerApi.signMessage).not.toHaveBeenCalled();
		});
	});
});
