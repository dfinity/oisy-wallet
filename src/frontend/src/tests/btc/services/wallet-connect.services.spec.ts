import { getAccountAddresses } from '$btc/services/wallet-connect.services';
import type { OptionBtcAddress } from '$btc/types/address';
import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import * as signerEnv from '$env/signer.env';
import * as signerConstants from '$lib/constants/signer.constants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import * as toastsStore from '$lib/stores/toasts.store';
import type { NetworkId } from '$lib/types/network';
import type { SignerMasterPubKeys } from '$lib/types/signer';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import type { MockInstance } from 'vitest';

const BIP122_MAINNET_CHAIN_ID = 'bip122:000000000019d6689c085ae165831e93';

describe('btc wallet-connect.services', () => {
	describe('getAccountAddresses', () => {
		const mockMasterPubKey: NonNullable<SignerMasterPubKeys['key_1']> = {
			ecdsa: {
				secp256k1: {
					pubkey: '02f9ac345f6be6db51e1c5612cddb59e72c3d0d493c994d12035cf13257e3b1fa7'
				}
			},
			schnorr: {
				ed25519: { pubkey: '6c0824beb37621bcca6eecc237ed1bc4e64c9c59dcb85344aa7f9cc8278ee31f' }
			}
		};

		const mockListener = {
			pair: vi.fn(),
			approveSession: vi.fn(),
			rejectSession: vi.fn(),
			attachHandlers: vi.fn(),
			detachHandlers: vi.fn(),
			rejectRequest: vi.fn(),
			getActiveSessions: vi.fn(),
			approveRequest: vi.fn(),
			disconnect: vi.fn()
		} as WalletConnectListener;

		const mockRequest = {
			id: 123,
			topic: 'test-topic',
			params: {
				chainId: BIP122_MAINNET_CHAIN_ID,
				request: { method: 'getAccountAddresses', params: {} }
			}
		} as unknown as WalletKitTypes.SessionRequest;

		const addresses = new Map<NetworkId, OptionBtcAddress>([
			[BTC_MAINNET_NETWORK_ID, mockBtcAddress],
			[BTC_TESTNET_NETWORK_ID, undefined]
		]);

		let spyToastsError: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(signerConstants, 'SIGNER_MASTER_PUB_KEY', 'get').mockReturnValue(mockMasterPubKey);
			vi.spyOn(signerEnv, 'SIGNER_CANISTER_DERIVATION_PATH', 'get').mockReturnValue([
				0, 0, 0, 0, 0, 96, 0, 209, 1, 1
			]);

			spyToastsError = vi.spyOn(toastsStore, 'toastsError');
		});

		it('approves the request with the account address payload for the request chain', async () => {
			const result = await getAccountAddresses({
				listener: mockListener,
				request: mockRequest,
				identity: mockIdentity,
				addresses
			});

			expect(result).toEqual({ success: true });

			expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
				id: mockRequest.id,
				topic: mockRequest.topic,
				message: [
					{
						address: mockBtcAddress,
						publicKey: expect.any(String),
						path: "m/84'/0'/0'/0/0",
						intention: 'payment'
					}
				]
			});

			expect(mockListener.rejectRequest).not.toHaveBeenCalled();
		});

		it('rejects when the requested chain has no loaded address', async () => {
			const result = await getAccountAddresses({
				listener: mockListener,
				request: {
					...mockRequest,
					params: {
						...mockRequest.params,
						chainId: 'bip122:000000000933ea01ad0ee984209779ba'
					}
				} as unknown as WalletKitTypes.SessionRequest,
				identity: mockIdentity,
				addresses
			});

			expect(result).toEqual({ success: false });

			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				id: mockRequest.id,
				topic: mockRequest.topic,
				error: UNEXPECTED_ERROR
			});

			expect(mockListener.approveRequest).not.toHaveBeenCalled();

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.wallet_not_initialized }
			});
		});

		it('rejects when the identity is nullish', async () => {
			const result = await getAccountAddresses({
				listener: mockListener,
				request: mockRequest,
				identity: null,
				addresses
			});

			expect(result).toEqual({ success: false });

			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				id: mockRequest.id,
				topic: mockRequest.topic,
				error: UNEXPECTED_ERROR
			});

			expect(mockListener.approveRequest).not.toHaveBeenCalled();

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.auth.error.no_internet_identity }
			});
		});
	});
});
