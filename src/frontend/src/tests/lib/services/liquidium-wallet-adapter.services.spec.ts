import * as signerApi from '$lib/api/signer.api';
import { liquidiumWalletAdapter } from '$lib/services/liquidium-wallet-adapter.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Chain, type SignMessageRequest } from '@liquidium/client';
import { hexlify, toUtf8Bytes } from 'ethers/utils';

vi.mock('$lib/api/signer.api', () => ({
	signMessage: vi.fn()
}));

describe('liquidium-wallet-adapter.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const baseRequest: Omit<SignMessageRequest, 'chain'> = {
		message: 'sign me',
		actionType: 'create-account'
	};

	describe('signMessage', () => {
		it('hex-encodes the ETH message and delegates to the signer api with the identity', async () => {
			const signature = '0xsignature';
			vi.mocked(signerApi.signMessage).mockResolvedValue(signature);

			const adapter = liquidiumWalletAdapter({ identity: mockIdentity });

			const result = await adapter.signMessage?.({ ...baseRequest, chain: Chain.ETH });

			expect(result).toBe(signature);
			// `eth_personal_sign` expects hex; the plain UTF-8 message is encoded to
			// `0x`-prefixed hex of its bytes.
			expect(signerApi.signMessage).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				message: hexlify(toUtf8Bytes(baseRequest.message))
			});
			expect(hexlify(toUtf8Bytes(baseRequest.message))).toBe('0x7369676e206d65');
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
