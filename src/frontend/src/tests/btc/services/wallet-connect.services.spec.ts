import {
	BTC_ECDSA_DERIVATION_PATH,
	BTC_ECDSA_KEY_ID
} from '$btc/constants/wallet-connect.constants';
import { decodePsbt, getAccountAddresses, signPsbt } from '$btc/services/wallet-connect.services';
import type { OptionBtcAddress } from '$btc/types/address';
import type * as WalletConnectUtilsModule from '$btc/utils/wallet-connect.utils';
import * as walletConnectUtils from '$btc/utils/wallet-connect.utils';
import { BIP122_CHAINS } from '$env/bip122-chains.env';
import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import * as signerEnv from '$env/signer.env';
import { genericSignWithEcdsa } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import * as signerConstants from '$lib/constants/signer.constants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { ProgressStepsSign } from '$lib/enums/progress-steps';
import * as toastsStore from '$lib/stores/toasts.store';
import type { NetworkId } from '$lib/types/network';
import type { SignerMasterPubKeys } from '$lib/types/signer';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { etc, sign as signSecp256k1 } from '@noble/secp256k1';
import type { WalletKitTypes } from '@reown/walletkit';
import { networks, payments, Psbt } from 'bitcoinjs-lib';
import type { MockInstance } from 'vitest';

vi.mock('$lib/api/signer.api', () => ({
	genericSignWithEcdsa: vi.fn()
}));

vi.mock('$btc/utils/wallet-connect.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof WalletConnectUtilsModule>();

	return {
		...actual,
		deriveBtcPublicKey: vi.fn(actual.deriveBtcPublicKey)
	};
});

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

	const buildTwoInputPsbt = (): string => {
		const psbt = new Psbt({ network });

		psbt.addInput({
			hash: '0000000000000000000000000000000000000000000000000000000000000001',
			index: 0,
			witnessUtxo: { script: walletScript as Buffer, value: 100_000 }
		});
		psbt.addInput({
			hash: '0000000000000000000000000000000000000000000000000000000000000002',
			index: 0,
			witnessUtxo: { script: externalScript as Buffer, value: 50_000 }
		});
		psbt.addOutput({ script: externalScript as Buffer, value: 148_000 });

		return psbt.toBase64();
	};

	const buildNonSegwitPsbt = (): string => {
		const prevTx = new Psbt({ network });
		prevTx.addInput({
			hash: '0000000000000000000000000000000000000000000000000000000000000003',
			index: 0,
			witnessUtxo: { script: walletScript as Buffer, value: 50_000 }
		});
		prevTx.addOutput({ script: walletScript as Buffer, value: 50_000 });

		const psbt = new Psbt({ network });
		psbt.addInput({
			hash: '0000000000000000000000000000000000000000000000000000000000000003',
			index: 0,
			nonWitnessUtxo: Buffer.from(prevTx.data.globalMap.unsignedTx.toBuffer())
		});
		psbt.addOutput({ script: externalScript as Buffer, value: 40_000 });

		return psbt.toBase64();
	};

	const buildRequest = (params: Record<string, unknown>): WalletKitTypes.SessionRequest =>
		({
			id: 123,
			topic: 'test-topic',
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
		const privateKey = Uint8Array.from(
			Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex')
		);
		const previousHmacSha256Sync = etc.hmacSha256Sync;

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

		let modalNext: () => void;
		let progress: (step: ProgressStepsSign) => void;
		let spyToastsError: MockInstance;

		const sign = async ({
			request = buildRequest({ psbt: buildPsbt(), broadcast: false }),
			address = walletAddress,
			identity = mockIdentity
		}: {
			request?: WalletKitTypes.SessionRequest;
			address?: OptionBtcAddress;
			identity?: typeof mockIdentity | null;
		} = {}) =>
			await signPsbt({
				listener: mockListener,
				request,
				address,
				modalNext,
				progress,
				identity
			});

		beforeAll(() => {
			// `@noble/secp256k1` v2 needs an explicit sync HMAC implementation to sign.
			// eslint-disable-next-line local-rules/prefer-object-params -- external callback signature
			etc.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]) =>
				hmac(sha256, key, etc.concatBytes(...messages));
		});

		beforeEach(() => {
			vi.clearAllMocks();

			modalNext = vi.fn<() => void>();
			progress = vi.fn<(step: ProgressStepsSign) => void>();
			spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			vi.mocked(walletConnectUtils.deriveBtcPublicKey).mockReturnValue(pubkey);
			vi.mocked(genericSignWithEcdsa).mockImplementation(({ messageHash }) =>
				Promise.resolve(signSecp256k1(messageHash, privateKey).toCompactRawBytes())
			);
		});

		afterAll(() => {
			etc.hmacSha256Sync = previousHmacSha256Sync;
		});

		it('signs only the selected wallet-owned PSBT input and approves the updated PSBT', async () => {
			const request = buildRequest({
				psbt: buildTwoInputPsbt(),
				signInputs: [{ address: walletAddress, index: 0 }],
				broadcast: false
			});

			const result = await sign({ request });

			expect(result).toEqual({ success: true });
			expect(modalNext).toHaveBeenCalledOnce();
			expect(progress).toHaveBeenNthCalledWith(1, ProgressStepsSign.SIGN);
			expect(progress).toHaveBeenNthCalledWith(2, ProgressStepsSign.APPROVE_WALLET_CONNECT);
			expect(progress).toHaveBeenNthCalledWith(3, ProgressStepsSign.DONE);

			expect(genericSignWithEcdsa).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				derivationPath: BTC_ECDSA_DERIVATION_PATH,
				keyId: BTC_ECDSA_KEY_ID,
				messageHash: expect.any(Uint8Array)
			});
			const [[{ messageHash }]] = vi.mocked(genericSignWithEcdsa).mock.calls;

			expect(messageHash).toHaveLength(32);

			expect(mockListener.rejectRequest).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).toHaveBeenCalledExactlyOnceWith({
				id: request.id,
				topic: request.topic,
				message: { psbt: expect.any(String) }
			});

			const [{ message }] = vi.mocked(mockListener.approveRequest).mock.calls[0];
			const signedPsbt = Psbt.fromBase64((message as { psbt: string }).psbt, { network });

			expect(signedPsbt.data.inputs[0].partialSig).toEqual([
				{ pubkey, signature: expect.any(Buffer) }
			]);
			expect(signedPsbt.data.inputs[1].partialSig).toBeUndefined();
		});

		it('rejects PSBT broadcast requests without signing', async () => {
			const request = buildRequest({ psbt: buildPsbt(), broadcast: true });

			const result = await sign({ request });

			expect(result).toEqual({ success: false });
			expect(modalNext).not.toHaveBeenCalled();
			expect(progress).not.toHaveBeenCalled();
			expect(genericSignWithEcdsa).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				id: request.id,
				topic: request.topic,
				error: UNEXPECTED_ERROR
			});
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.btc_broadcast_not_supported }
			});
		});

		it('rejects non-owned PSBT inputs without signing', async () => {
			const request = buildRequest({
				psbt: buildTwoInputPsbt(),
				signInputs: [{ address: walletAddress, index: 1 }],
				broadcast: false
			});

			const result = await sign({ request });

			expect(result).toEqual({ success: false });
			expect(genericSignWithEcdsa).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				id: request.id,
				topic: request.topic,
				error: UNEXPECTED_ERROR
			});
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.btc_psbt_input_not_owned }
			});
		});

		it('rejects non-SegWit PSBT inputs without signing', async () => {
			const request = buildRequest({ psbt: buildNonSegwitPsbt(), broadcast: false });

			const result = await sign({ request });

			expect(result).toEqual({ success: false });
			expect(genericSignWithEcdsa).not.toHaveBeenCalled();
			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				id: request.id,
				topic: request.topic,
				error: UNEXPECTED_ERROR
			});
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.btc_psbt_input_not_segwit }
			});
		});
	});
});
