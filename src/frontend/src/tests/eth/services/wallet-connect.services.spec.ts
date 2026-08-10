import {
	SESSION_REQUEST_ETH_SIGN,
	SESSION_REQUEST_ETH_SIGN_LEGACY,
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN
} from '$eth/constants/wallet-connect.constants';
import { signMessage } from '$eth/services/wallet-connect.services';
import type { WalletConnectEthSignTypedDataV4 } from '$eth/types/wallet-connect';
import { signMessage as signMessageApi, signPrehash } from '$lib/api/signer.api';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { authStore } from '$lib/stores/auth.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { WalletKitTypes } from '@reown/walletkit';

vi.mock('$lib/api/signer.api', () => ({
	signPrehash: vi.fn(),
	signMessage: vi.fn()
}));

const HOLDER = '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a';
const SPENDER = '0xcA11bde05977b3631167028862bE2a173976CA11';
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';

const daiPermitJson = (allowed: unknown): string => {
	const typedData: WalletConnectEthSignTypedDataV4 = {
		domain: { name: 'Dai Stablecoin', version: '1', chainId: '1', verifyingContract: DAI },
		types: {
			EIP712Domain: [
				{ name: 'name', type: 'string' },
				{ name: 'version', type: 'string' },
				{ name: 'chainId', type: 'uint256' },
				{ name: 'verifyingContract', type: 'address' }
			],
			Permit: [
				{ name: 'holder', type: 'address' },
				{ name: 'spender', type: 'address' },
				{ name: 'nonce', type: 'uint256' },
				{ name: 'expiry', type: 'uint256' },
				{ name: 'allowed', type: 'bool' }
			]
		},
		primaryType: 'Permit',
		message: { holder: HOLDER, spender: SPENDER, nonce: '0', expiry: '1893456000', allowed }
	};
	return JSON.stringify(typedData);
};

describe('eth wallet-connect.services', () => {
	describe('signMessage', () => {
		const mockListener = {
			rejectRequest: vi.fn(),
			approveRequest: vi.fn()
		} as unknown as WalletConnectListener;

		const buildRequest = ({
			method,
			params
		}: {
			method: string;
			params: string[];
		}): WalletKitTypes.SessionRequest =>
			({
				id: 1,
				topic: 'mock-topic',
				params: { request: { method, params } }
			}) as unknown as WalletKitTypes.SessionRequest;

		const buildParams = (request: WalletKitTypes.SessionRequest) => ({
			request,
			listener: mockListener,
			modalNext: vi.fn(),
			progress: vi.fn()
		});

		beforeEach(() => {
			vi.clearAllMocks();
			authStore.setForTesting(mockIdentity);
			vi.mocked(signPrehash).mockResolvedValue('0xPREHASH_SIGNATURE');
			vi.mocked(signMessageApi).mockResolvedValue('0xRAW_SIGNATURE');
		});

		it('signs a valid typed-data permit via signPrehash and approves', async () => {
			const request = buildRequest({
				method: SESSION_REQUEST_ETH_SIGN_V4,
				params: [HOLDER, daiPermitJson(true)]
			});

			const result = await signMessage(buildParams(request));

			expect(result).toStrictEqual({ success: true });
			expect(signPrehash).toHaveBeenCalledOnce();
			expect(signMessageApi).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
				id: request.id,
				topic: request.topic,
				message: '0xPREHASH_SIGNATURE'
			});
			expect(mockListener.rejectRequest).not.toHaveBeenCalled();
		});

		it('rejects a type-invalid typed-data permit and never signs', async () => {
			// `allowed` is the string "false": ethers would coerce it to the boolean
			// true, so the request must be rejected, not signed or downgraded.
			const request = buildRequest({
				method: SESSION_REQUEST_ETH_SIGN_V4,
				params: [HOLDER, daiPermitJson('false')]
			});

			const result = await signMessage(buildParams(request));

			expect(result.success).toBeFalsy();
			expect(signPrehash).not.toHaveBeenCalled();
			expect(signMessageApi).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: request.topic,
				id: request.id,
				error: UNEXPECTED_ERROR
			});
		});

		it('rejects a v4 request that fails to hash for a non-validation reason', async () => {
			// Malformed JSON makes the typed-data hash throw a non-validation error; a
			// v4 request must still be rejected, never downgraded to raw signing.
			const request = buildRequest({
				method: SESSION_REQUEST_ETH_SIGN_V4,
				params: [HOLDER, '{ not valid json ']
			});

			const result = await signMessage(buildParams(request));

			expect(result.success).toBeFalsy();
			expect(signPrehash).not.toHaveBeenCalled();
			expect(signMessageApi).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: request.topic,
				id: request.id,
				error: UNEXPECTED_ERROR
			});
		});

		it('signs a valid typed-data permit via signPrehash for the legacy typed-data method', async () => {
			const request = buildRequest({
				method: SESSION_REQUEST_ETH_SIGN_LEGACY,
				params: [HOLDER, daiPermitJson(true)]
			});

			const result = await signMessage(buildParams(request));

			expect(result).toStrictEqual({ success: true });
			expect(signPrehash).toHaveBeenCalledOnce();
			expect(signMessageApi).not.toHaveBeenCalled();
		});

		it('signs a plain (non-typed-data) message as a raw message', async () => {
			const message = '0x48656c6c6f'; // "Hello"
			const request = buildRequest({
				method: SESSION_REQUEST_PERSONAL_SIGN,
				params: [message, HOLDER]
			});

			const result = await signMessage(buildParams(request));

			expect(result).toStrictEqual({ success: true });
			expect(signPrehash).not.toHaveBeenCalled();
			expect(signMessageApi).toHaveBeenCalledOnce();
			expect(vi.mocked(signMessageApi).mock.calls[0][0]).toMatchObject({ message });
			expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
				id: request.id,
				topic: request.topic,
				message: '0xRAW_SIGNATURE'
			});
		});

		it.each([SESSION_REQUEST_PERSONAL_SIGN, SESSION_REQUEST_ETH_SIGN])(
			'signs a valid typed-data permit sent through %s as a raw message, never as EIP-712',
			async (method) => {
				// A dApp can dress an executable EIP-712 authorization as a plain message
				// request. It is approved as a plain message, so it must be signed as one.
				const message = daiPermitJson(true);
				const request = buildRequest({ method, params: [message, HOLDER] });

				const result = await signMessage(buildParams(request));

				expect(result).toStrictEqual({ success: true });
				expect(signPrehash).not.toHaveBeenCalled();
				expect(signMessageApi).toHaveBeenCalledOnce();
				expect(vi.mocked(signMessageApi).mock.calls[0][0]).toMatchObject({ message });
				expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
					id: request.id,
					topic: request.topic,
					message: '0xRAW_SIGNATURE'
				});
			}
		);
	});
});
