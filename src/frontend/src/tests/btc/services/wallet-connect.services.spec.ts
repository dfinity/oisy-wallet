import { SESSION_REQUEST_BTC_SIGN_MESSAGE } from '$btc/constants/wallet-connect.constants';
import {
	decodeMessage,
	decodePsbt,
	getAccountAddresses,
	sign,
	signPsbt
} from '$btc/services/wallet-connect.services';
import type { OptionBtcAddress } from '$btc/types/address';
import * as btcWalletConnectUtils from '$btc/utils/wallet-connect.utils';
import { BIP122_CHAINS } from '$env/bip122-chains.env';
import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import * as signerEnv from '$env/signer.env';
import * as signerApi from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import * as signerConstants from '$lib/constants/signer.constants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { ProgressStepsSign } from '$lib/enums/progress-steps';
import * as toastsStore from '$lib/stores/toasts.store';
import type { NetworkId } from '$lib/types/network';
import type { SignerMasterPubKeys } from '$lib/types/signer';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { signAsync as signSecp256k1Async } from '@noble/secp256k1';
import type { WalletKitTypes } from '@reown/walletkit';
import { networks, payments, Psbt } from 'bitcoinjs-lib';
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
			disconnectSession: vi.fn(),
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

		it('advertises the testnet derivation path for a testnet chain request', async () => {
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
				addresses: new Map<NetworkId, OptionBtcAddress>([[BTC_TESTNET_NETWORK_ID, mockBtcAddress]])
			});

			expect(result).toEqual({ success: true });

			expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
				id: mockRequest.id,
				topic: mockRequest.topic,
				message: [
					{
						address: mockBtcAddress,
						publicKey: expect.any(String),
						path: "m/84'/1'/0'/0/0",
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

	const network = networks.testnet;

	// Deterministic compressed secp256k1 public key (generator point G) — only used to derive a valid
	// P2WPKH address/script for the test fixtures; no signing happens here.
	const pubkey = Buffer.from(
		'0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
		'hex'
	);

	const { address: walletAddress, output: walletScript } = payments.p2wpkh({ pubkey, network });

	const externalScript = payments.p2wpkh({
		pubkey: Buffer.from(
			'03d01115d548e7561b15c38f004d734633687cf4419620095bc5b0f47070afe85a',
			'hex'
		),
		network
	}).output;

	const testnetChainId = Object.keys(BIP122_CHAINS).find(
		(key) => BIP122_CHAINS[key].networkId === BTC_TESTNET_NETWORK_ID
	);
	// Fail loudly here rather than silently testing the "missing chainId" path if BIP122_CHAINS changes.
	assertNonNullish(testnetChainId);

	const buildPsbt = (): string => {
		const psbt = new Psbt({ network });

		psbt.addInput({
			hash: '0000000000000000000000000000000000000000000000000000000000000001',
			index: 0,
			witnessUtxo: { script: walletScript as Buffer, value: 100_000 }
		});

		// External recipient
		psbt.addOutput({ script: externalScript as Buffer, value: 70_000 });
		// Change back to the wallet
		psbt.addOutput({ script: walletScript as Buffer, value: 28_000 });

		return psbt.toBase64();
	};

	const buildRequest = (params: Record<string, unknown>): WalletKitTypes.SessionRequest =>
		({
			params: {
				chainId: testnetChainId,
				request: { method: 'signPsbt', params }
			}
		}) as unknown as WalletKitTypes.SessionRequest;

	it('decodes inputs, outputs, total spend and fee', () => {
		const request = buildRequest({ psbt: buildPsbt(), broadcast: false });

		const decoded = decodePsbt({ request, address: walletAddress });

		expect(decoded.inputs).toHaveLength(1);
		expect(decoded.inputs[0].address).toBe(walletAddress);
		expect(decoded.inputs[0].value).toBe(100_000n);
		expect(decoded.inputs[0].signedByWallet).toBeTruthy();

		expect(decoded.outputs).toHaveLength(2);
		expect(decoded.outputs[0].value).toBe(70_000n);
		expect(decoded.outputs[1].value).toBe(28_000n);

		expect(decoded.totalSignedInputs).toBe(100_000n);
		// 100_000 - (70_000 + 28_000)
		expect(decoded.fee).toBe(2_000n);
		expect(decoded.broadcast).toBeFalsy();
	});

	it('flags an input as not owned when it does not match the wallet address', () => {
		const request = buildRequest({ psbt: buildPsbt(), broadcast: false });

		const decoded = decodePsbt({ request, address: 'tb1qsomeoneelseaddressxxxxxxxxxxxxxxxxxxxx' });

		expect(decoded.inputs[0].signedByWallet).toBeFalsy();
		expect(decoded.totalSignedInputs).toBe(ZERO);
	});

	it('represents an input without witnessUtxo as an unknown value (not zero)', () => {
		// A legacy (non-SegWit) input carries a full previous transaction instead of a `witnessUtxo`,
		// so the decoder cannot read its value and must surface it as unknown.
		const prevTx = new Psbt({ network });
		prevTx.addInput({
			hash: '0000000000000000000000000000000000000000000000000000000000000002',
			index: 0,
			witnessUtxo: { script: walletScript as Buffer, value: 50_000 }
		});
		prevTx.addOutput({ script: walletScript as Buffer, value: 50_000 });

		const psbt = new Psbt({ network });
		psbt.addInput({
			hash: '0000000000000000000000000000000000000000000000000000000000000002',
			index: 0,
			nonWitnessUtxo: Buffer.from(prevTx.data.globalMap.unsignedTx.toBuffer())
		});
		psbt.addOutput({ script: externalScript as Buffer, value: 40_000 });

		const request = buildRequest({ psbt: psbt.toBase64(), broadcast: false });

		const decoded = decodePsbt({ request, address: walletAddress });

		expect(decoded.inputs[0].value).toBeUndefined();
		expect(decoded.totalSignedInputs).toBe(ZERO);
		expect(decoded.fee).toBeUndefined();
	});

	it('reports the broadcast flag and defaults it to false', () => {
		const request = buildRequest({ psbt: buildPsbt() });

		expect(decodePsbt({ request, address: walletAddress }).broadcast).toBeFalsy();

		const broadcastRequest = buildRequest({ psbt: buildPsbt(), broadcast: true });

		expect(
			decodePsbt({ request: broadcastRequest, address: walletAddress }).broadcast
		).toBeTruthy();
	});

	it('throws when the PSBT is missing', () => {
		const request = buildRequest({ broadcast: false });

		expect(() => decodePsbt({ request, address: walletAddress })).toThrow();
	});

	it('throws when the PSBT cannot be parsed', () => {
		const request = buildRequest({ psbt: 'not-a-valid-psbt', broadcast: false });

		expect(() => decodePsbt({ request, address: walletAddress })).toThrow();
	});

	describe('signPsbt', () => {
		// Private key 1 — its compressed public key is the secp256k1 generator point G. Using a known
		// private key lets the signer mock produce a real signature bitcoinjs-lib can validate.
		const privateKey = Uint8Array.from([...Array(31).fill(0), 1]);
		const signerPubkey = Buffer.from(
			'0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			'hex'
		);

		const mainnetChainId = Object.keys(BIP122_CHAINS).find(
			(key) => BIP122_CHAINS[key].networkId === BTC_MAINNET_NETWORK_ID
		);
		const testnetSignChainId = Object.keys(BIP122_CHAINS).find(
			(key) => BIP122_CHAINS[key].networkId === BTC_TESTNET_NETWORK_ID
		);
		// Fail loudly here rather than silently testing the "missing chainId" path if BIP122_CHAINS changes.
		assertNonNullish(mainnetChainId);
		assertNonNullish(testnetSignChainId);

		const buildSignRequest = ({
			chainId,
			params
		}: {
			chainId: string | undefined;
			params: Record<string, unknown>;
		}): WalletKitTypes.SessionRequest =>
			({
				id: 456,
				topic: 'sign-topic',
				params: {
					chainId,
					request: { method: 'signPsbt', params }
				}
			}) as unknown as WalletKitTypes.SessionRequest;

		const buildOwnedPsbt = (psbtNetwork: typeof networks.bitcoin): string => {
			const { output: ownScript } = payments.p2wpkh({ pubkey: signerPubkey, network: psbtNetwork });

			const psbt = new Psbt({ network: psbtNetwork });
			psbt.addInput({
				hash: '0000000000000000000000000000000000000000000000000000000000000001',
				index: 0,
				witnessUtxo: { script: ownScript as Buffer, value: 100_000 }
			});
			psbt.addOutput({ script: ownScript as Buffer, value: 90_000 });

			return psbt.toBase64();
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
			disconnectSession: vi.fn(),
			disconnect: vi.fn()
		} as WalletConnectListener;

		const modalNext = vi.fn();
		const progress = vi.fn();

		let spyToastsError: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			vi.spyOn(btcWalletConnectUtils, 'deriveBtcPublicKey').mockReturnValue(
				Uint8Array.from(signerPubkey)
			);

			vi.spyOn(signerApi, 'signBtcPrehash').mockImplementation(async ({ hash }) =>
				(await signSecp256k1Async(Uint8Array.from(hash), privateKey)).toCompactRawBytes()
			);
		});

		it('rejects a signPsbt request on a non-mainnet (testnet) chain without signing', async () => {
			const { address: testnetAddress } = payments.p2wpkh({
				pubkey: signerPubkey,
				network: networks.testnet
			});

			const result = await signPsbt({
				listener: mockListener,
				request: buildSignRequest({
					chainId: testnetSignChainId,
					params: { psbt: buildOwnedPsbt(networks.testnet), broadcast: false }
				}),
				address: testnetAddress,
				modalNext,
				progress,
				identity: mockIdentity
			});

			expect(result).toEqual({ success: false });

			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				id: 456,
				topic: 'sign-topic',
				error: UNEXPECTED_ERROR
			});

			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(signerApi.signBtcPrehash).not.toHaveBeenCalled();
			expect(modalNext).not.toHaveBeenCalled();

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.btc_non_mainnet_sign_not_supported }
			});
		});

		it('signs and approves an owned-input request on BTC mainnet', async () => {
			const { address: mainnetAddress } = payments.p2wpkh({
				pubkey: signerPubkey,
				network: networks.bitcoin
			});

			const result = await signPsbt({
				listener: mockListener,
				request: buildSignRequest({
					chainId: mainnetChainId,
					params: { psbt: buildOwnedPsbt(networks.bitcoin), broadcast: false }
				}),
				address: mainnetAddress,
				modalNext,
				progress,
				identity: mockIdentity
			});

			expect(result).toEqual({ success: true });

			expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
				id: 456,
				topic: 'sign-topic',
				message: { psbt: expect.any(String) }
			});

			expect(mockListener.rejectRequest).not.toHaveBeenCalled();
			expect(signerApi.signBtcPrehash).toHaveBeenCalledOnce();
			expect(progress).toHaveBeenCalledWith(ProgressStepsSign.DONE);
		});
	});

	describe('decodeMessage', () => {
		const mockMessage = 'hello';

		const createMockRequest = ({
			params = { message: mockMessage }
		}: {
			params?: Record<string, unknown>;
		} = {}): WalletKitTypes.SessionRequest =>
			({
				id: 123,
				topic: 'mock-topic',
				params: {
					request: {
						method: SESSION_REQUEST_BTC_SIGN_MESSAGE,
						params
					}
				}
			}) as WalletKitTypes.SessionRequest;

		it('should extract the signMessage payload', () => {
			expect(decodeMessage(createMockRequest())).toBe(mockMessage);
		});

		it('should fall back to an empty message when the parameter is missing', () => {
			expect(decodeMessage(createMockRequest({ params: {} }))).toBe('');
		});
	});

	describe('sign', () => {
		const mockMessage = 'hello';
		const mockSignature = 'mock-base64-signature';
		const mockRawSignature = new Uint8Array(64).fill(1);
		const mockPublicKey = new Uint8Array(33).fill(2);

		const mockListener = {
			pair: vi.fn(),
			approveSession: vi.fn(),
			rejectSession: vi.fn(),
			attachHandlers: vi.fn(),
			detachHandlers: vi.fn(),
			rejectRequest: vi.fn(),
			getActiveSessions: vi.fn(),
			approveRequest: vi.fn(),
			disconnectSession: vi.fn(),
			disconnect: vi.fn()
		} as WalletConnectListener;

		let spyToastsShow: MockInstance;
		let spyToastsError: MockInstance;

		const createMockRequest = ({
			params = { message: mockMessage }
		}: {
			params?: Record<string, unknown>;
		} = {}): WalletKitTypes.SessionRequest =>
			({
				id: 123,
				topic: 'mock-topic',
				params: {
					request: {
						method: SESSION_REQUEST_BTC_SIGN_MESSAGE,
						params
					}
				}
			}) as WalletKitTypes.SessionRequest;

		const createMockParams = (request = createMockRequest()) => ({
			address: mockBtcAddress,
			modalNext: vi.fn(),
			progress: vi.fn(),
			identity: mockIdentity,
			request,
			listener: mockListener
		});

		beforeEach(() => {
			vi.restoreAllMocks();
			vi.clearAllMocks();

			vi.spyOn(signerApi, 'signBtcPrehash').mockResolvedValue(mockRawSignature);
			vi.spyOn(btcWalletConnectUtils, 'deriveBtcPublicKey').mockReturnValue(mockPublicKey);
			vi.spyOn(btcWalletConnectUtils, 'encodeRecoverableSignature').mockReturnValue(mockSignature);

			spyToastsShow = vi.spyOn(toastsStore, 'toastsShow').mockImplementation(() => Symbol('toast'));
			spyToastsError = vi
				.spyOn(toastsStore, 'toastsError')
				.mockImplementation(() => Symbol('toast'));
		});

		it('should reject the request when the BTC address is nullish', async () => {
			const params = createMockParams();

			const result = await sign({ ...params, address: null });

			expect(result).toEqual({ success: false });
			expect(signerApi.signBtcPrehash).not.toHaveBeenCalled();
			expect(params.modalNext).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: params.request.topic,
				id: params.request.id,
				error: UNEXPECTED_ERROR
			});
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.wallet_connect.error.wallet_not_initialized }
			});
		});

		it('should reject the request when the message parameter is missing', async () => {
			const params = createMockParams(createMockRequest({ params: {} }));

			const result = await sign(params);

			expect(result).toEqual({ success: false });
			expect(signerApi.signBtcPrehash).not.toHaveBeenCalled();
			expect(params.modalNext).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: params.request.topic,
				id: params.request.id,
				error: UNEXPECTED_ERROR
			});
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.wallet_connect.error.unknown_parameter }
			});
		});

		it('should reject the request when the identity is nullish', async () => {
			const params = createMockParams();

			const result = await sign({ ...params, identity: null });

			expect(result).toEqual({ success: false });
			expect(signerApi.signBtcPrehash).not.toHaveBeenCalled();
			expect(params.modalNext).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: params.request.topic,
				id: params.request.id,
				error: UNEXPECTED_ERROR
			});
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.auth.error.no_internet_identity }
			});
		});

		it('should approve the request with a BTC recoverable signature and address', async () => {
			const params = createMockParams();
			const messageHash = btcWalletConnectUtils.bitcoinSignedMessageHash(mockMessage);

			const result = await sign(params);

			expect(result).toStrictEqual({ success: true });
			expect(signerApi.signBtcPrehash).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				hash: messageHash
			});
			expect(btcWalletConnectUtils.deriveBtcPublicKey).toHaveBeenCalledExactlyOnceWith({
				principal: mockIdentity.getPrincipal()
			});
			expect(btcWalletConnectUtils.encodeRecoverableSignature).toHaveBeenCalledExactlyOnceWith({
				signature: mockRawSignature,
				messageHash,
				publicKey: mockPublicKey
			});
			expect(params.modalNext).toHaveBeenCalledOnce();
			expect(params.progress).toHaveBeenCalledTimes(3);
			expect(params.progress).toHaveBeenNthCalledWith(1, ProgressStepsSign.SIGN);
			expect(params.progress).toHaveBeenNthCalledWith(2, ProgressStepsSign.APPROVE_WALLET_CONNECT);
			expect(params.progress).toHaveBeenNthCalledWith(3, ProgressStepsSign.DONE);
			expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
				topic: params.request.topic,
				id: params.request.id,
				message: { signature: mockSignature, address: mockBtcAddress }
			});
			expect(mockListener.rejectRequest).not.toHaveBeenCalled();
			expect(spyToastsShow).toHaveBeenCalledExactlyOnceWith({
				text: replacePlaceholders(en.wallet_connect.info.transaction_executed, {
					$method: SESSION_REQUEST_BTC_SIGN_MESSAGE
				}),
				level: 'info',
				duration: 2000
			});
			expect(spyToastsError).not.toHaveBeenCalled();
		});

		it('should reject the request when signing fails', async () => {
			const params = createMockParams();
			const mockError = new Error('mock-sign-error');

			vi.mocked(signerApi.signBtcPrehash).mockRejectedValueOnce(mockError);

			const result = await sign(params);

			expect(result).toStrictEqual({ success: false, err: mockError });
			expect(params.modalNext).toHaveBeenCalledOnce();
			expect(params.progress).toHaveBeenCalledExactlyOnceWith(ProgressStepsSign.SIGN);
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: params.request.topic,
				id: params.request.id,
				error: UNEXPECTED_ERROR
			});
			expect(spyToastsShow).not.toHaveBeenCalled();
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.wallet_connect.error.unexpected_processing_request },
				err: mockError
			});
		});
	});
});
