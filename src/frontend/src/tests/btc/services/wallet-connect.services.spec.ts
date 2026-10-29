import { SESSION_REQUEST_BTC_SIGN_MESSAGE } from '$btc/constants/wallet-connect.constants';
import {
	decodeMessage,
	decodePsbt,
	getAccountAddresses,
	loadPsbtWalletUtxos,
	sign,
	signPsbt
} from '$btc/services/wallet-connect.services';
import type { OptionBtcAddress } from '$btc/types/address';
import * as btcWalletConnectUtils from '$btc/utils/wallet-connect.utils';
import { BIP122_CHAINS } from '$env/bip122-chains.env';
import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import * as signerEnv from '$env/signer.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import { txidStringToUint8Array } from '$icp/utils/btc.utils';
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
import { assertNonNullish, toNullable } from '@dfinity/utils';
import type { BitcoinDid } from '@icp-sdk/canisters/ckbtc';
import { signAsync as signSecp256k1Async } from '@noble/secp256k1';
import type { WalletKitTypes } from '@reown/walletkit';
import { networks, payments, Psbt, Transaction } from 'bitcoinjs-lib';
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
			approvedNamespaces: vi.fn(),
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

	// A previous transaction paying `value` to `script`, so an input can carry the `nonWitnessUtxo`
	// bitcoinjs-lib actually builds the sighash from, with a matching prevout hash.
	const buildPrevTx = ({ script, value }: { script: Buffer; value: number }): Transaction => {
		const tx = new Transaction();
		tx.addInput(Buffer.alloc(32, 1), 0);
		tx.addOutput(script, value);

		return tx;
	};

	const buildPsbtWithBothUtxos = ({
		witnessUtxo,
		nonWitnessUtxo
	}: {
		witnessUtxo: { script: Buffer; value: number };
		nonWitnessUtxo: { script: Buffer; value: number };
	}): string => {
		const prevTx = buildPrevTx(nonWitnessUtxo);

		const psbt = new Psbt({ network });
		psbt.addInput({
			hash: prevTx.getId(),
			index: 0,
			nonWitnessUtxo: prevTx.toBuffer(),
			witnessUtxo
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

	const FIRST_TXID = '0000000000000000000000000000000000000000000000000000000000000001';

	// A UTXO of the wallet as the Bitcoin canister lists it: the txid in binary byte order.
	const walletUtxo = ({
		txid,
		vout = 0,
		value
	}: {
		txid: string;
		vout?: number;
		value: bigint;
	}): BitcoinDid.utxo => ({
		outpoint: { txid: txidStringToUint8Array(txid), vout },
		value,
		height: 1
	});

	it('decodes inputs, outputs, total spend and fee', () => {
		const request = buildRequest({ psbt: buildPsbt(), broadcast: false });

		const decoded = decodePsbt({
			request,
			address: walletAddress,
			walletUtxos: [walletUtxo({ txid: FIRST_TXID, value: 100_000n })]
		});

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
		expect(decoded.ambiguous).toBeFalsy();
		expect(decoded.unverified).toBeFalsy();
	});

	it('decodes an input stating the same previous output in witnessUtxo and nonWitnessUtxo', () => {
		const request = buildRequest({
			psbt: buildPsbtWithBothUtxos({
				witnessUtxo: { script: walletScript as Buffer, value: 100_000 },
				nonWitnessUtxo: { script: walletScript as Buffer, value: 100_000 }
			}),
			broadcast: false
		});

		const decoded = decodePsbt({ request, address: walletAddress, walletUtxos: [] });

		expect(decoded.ambiguous).toBeFalsy();
		expect(decoded.inputs[0].address).toBe(walletAddress);
		expect(decoded.inputs[0].value).toBe(100_000n);
		expect(decoded.inputs[0].signedByWallet).toBeTruthy();
		expect(decoded.totalSignedInputs).toBe(100_000n);
		expect(decoded.fee).toBe(2_000n);
	});

	it('shows no figure for an input whose witnessUtxo and nonWitnessUtxo values disagree', () => {
		// bitcoinjs-lib signs the `nonWitnessUtxo` value; a review reading `witnessUtxo` would price
		// the request at 10_000 while the signature commits to 100_000.
		const request = buildRequest({
			psbt: buildPsbtWithBothUtxos({
				witnessUtxo: { script: walletScript as Buffer, value: 10_000 },
				nonWitnessUtxo: { script: walletScript as Buffer, value: 100_000 }
			}),
			broadcast: false
		});

		const decoded = decodePsbt({ request, address: walletAddress, walletUtxos: [] });

		expect(decoded.ambiguous).toBeTruthy();
		expect(decoded.inputs[0].value).toBeUndefined();
		expect(decoded.inputs[0].address).toBeUndefined();
		expect(decoded.inputs[0].signedByWallet).toBeFalsy();
		expect(decoded.totalSignedInputs).toBe(ZERO);
		expect(decoded.fee).toBeUndefined();
	});

	it('shows no figure for an input whose witnessUtxo and nonWitnessUtxo scripts disagree', () => {
		const request = buildRequest({
			psbt: buildPsbtWithBothUtxos({
				witnessUtxo: { script: walletScript as Buffer, value: 100_000 },
				nonWitnessUtxo: { script: externalScript as Buffer, value: 100_000 }
			}),
			broadcast: false
		});

		const decoded = decodePsbt({ request, address: walletAddress, walletUtxos: [] });

		expect(decoded.ambiguous).toBeTruthy();
		expect(decoded.inputs[0].value).toBeUndefined();
		expect(decoded.totalSignedInputs).toBe(ZERO);
		expect(decoded.fee).toBeUndefined();
	});

	it('withholds the total and the fee when only a second input contradicts itself', () => {
		// A single lying input distorts the total and the fee too, so no figure may be shown.
		const honestPrevTx = buildPrevTx({ script: walletScript as Buffer, value: 100_000 });
		const lyingPrevTx = buildPrevTx({ script: walletScript as Buffer, value: 900_000 });

		const psbt = new Psbt({ network });
		psbt.addInput({
			hash: honestPrevTx.getId(),
			index: 0,
			witnessUtxo: { script: walletScript as Buffer, value: 100_000 }
		});
		psbt.addInput({
			hash: lyingPrevTx.getId(),
			index: 0,
			nonWitnessUtxo: lyingPrevTx.toBuffer(),
			witnessUtxo: { script: walletScript as Buffer, value: 1_000 }
		});
		psbt.addOutput({ script: externalScript as Buffer, value: 100_000 });

		const request = buildRequest({ psbt: psbt.toBase64(), broadcast: false });

		const decoded = decodePsbt({ request, address: walletAddress, walletUtxos: [] });

		expect(decoded.ambiguous).toBeTruthy();
		expect(decoded.inputs[1].value).toBeUndefined();
		expect(decoded.fee).toBeUndefined();
	});

	it('flags an input as not owned when it does not match the wallet address', () => {
		const request = buildRequest({ psbt: buildPsbt(), broadcast: false });

		const decoded = decodePsbt({
			request,
			address: 'tb1qsomeoneelseaddressxxxxxxxxxxxxxxxxxxxx',
			walletUtxos: []
		});

		expect(decoded.inputs[0].signedByWallet).toBeFalsy();
		expect(decoded.totalSignedInputs).toBe(ZERO);
	});

	it('prices an input carrying only a nonWitnessUtxo from that previous transaction', () => {
		const prevTx = buildPrevTx({ script: walletScript as Buffer, value: 50_000 });

		const psbt = new Psbt({ network });
		psbt.addInput({ hash: prevTx.getId(), index: 0, nonWitnessUtxo: prevTx.toBuffer() });
		psbt.addOutput({ script: externalScript as Buffer, value: 40_000 });

		const request = buildRequest({ psbt: psbt.toBase64(), broadcast: false });

		const decoded = decodePsbt({ request, address: walletAddress, walletUtxos: [] });

		expect(decoded.inputs[0].value).toBe(50_000n);
		expect(decoded.inputs[0].signedByWallet).toBeTruthy();
		expect(decoded.totalSignedInputs).toBe(50_000n);
		expect(decoded.fee).toBe(10_000n);
		expect(decoded.ambiguous).toBeFalsy();
		expect(decoded.unverified).toBeFalsy();
	});

	it('flags an input stating no previous output as unverified, with an unknown value (not zero)', () => {
		const psbt = new Psbt({ network });
		psbt.addInput({
			hash: '0000000000000000000000000000000000000000000000000000000000000002',
			index: 0
		});
		psbt.addOutput({ script: externalScript as Buffer, value: 40_000 });

		const request = buildRequest({ psbt: psbt.toBase64(), broadcast: false });

		const decoded = decodePsbt({ request, address: walletAddress, walletUtxos: [] });

		expect(decoded.inputs[0].value).toBeUndefined();
		expect(decoded.inputs[0].address).toBeUndefined();
		expect(decoded.totalSignedInputs).toBe(ZERO);
		expect(decoded.fee).toBeUndefined();
		expect(decoded.ambiguous).toBeFalsy();
		expect(decoded.unverified).toBeTruthy();
	});

	it('shows no figure for an input whose nonWitnessUtxo is not the transaction its outpoint names', () => {
		const prevTx = buildPrevTx({ script: walletScript as Buffer, value: 50_000 });

		const psbt = new Psbt({ network });
		psbt.addInput({
			hash: '0000000000000000000000000000000000000000000000000000000000000002',
			index: 0,
			nonWitnessUtxo: prevTx.toBuffer(),
			witnessUtxo: { script: walletScript as Buffer, value: 50_000 }
		});
		psbt.addOutput({ script: externalScript as Buffer, value: 40_000 });

		const request = buildRequest({ psbt: psbt.toBase64(), broadcast: false });

		const decoded = decodePsbt({ request, address: walletAddress, walletUtxos: [] });

		expect(decoded.ambiguous).toBeTruthy();
		expect(decoded.inputs[0].value).toBeUndefined();
		expect(decoded.fee).toBeUndefined();
	});

	it('flags an input of the wallet that only its witnessUtxo prices as unverified', () => {
		const request = buildRequest({ psbt: buildPsbt(), broadcast: false });

		const decoded = decodePsbt({ request, address: walletAddress, walletUtxos: [] });

		expect(decoded.unverified).toBeTruthy();
		expect(decoded.ambiguous).toBeFalsy();
		expect(decoded.inputs[0].signedByWallet).toBeTruthy();
		expect(decoded.inputs[0].value).toBeUndefined();
		expect(decoded.totalSignedInputs).toBe(ZERO);
		expect(decoded.fee).toBeUndefined();
	});

	it('flags an input as unverified when the wallet UTXO it names has another index', () => {
		const request = buildRequest({ psbt: buildPsbt(), broadcast: false });

		const decoded = decodePsbt({
			request,
			address: walletAddress,
			walletUtxos: [walletUtxo({ txid: FIRST_TXID, vout: 1, value: 100_000n })]
		});

		expect(decoded.unverified).toBeTruthy();
	});

	it('shows no figure for an input stating another value for one of the wallet UTXOs', () => {
		const request = buildRequest({ psbt: buildPsbt(), broadcast: false });

		const decoded = decodePsbt({
			request,
			address: walletAddress,
			walletUtxos: [walletUtxo({ txid: FIRST_TXID, value: 900_000n })]
		});

		expect(decoded.ambiguous).toBeTruthy();
		expect(decoded.inputs[0].value).toBeUndefined();
		expect(decoded.totalSignedInputs).toBe(ZERO);
		expect(decoded.fee).toBeUndefined();
	});

	it('shows no figure for an input stating another address for one of the wallet UTXOs', () => {
		const psbt = new Psbt({ network });
		psbt.addInput({
			hash: FIRST_TXID,
			index: 0,
			witnessUtxo: { script: externalScript as Buffer, value: 100_000 }
		});
		psbt.addOutput({ script: externalScript as Buffer, value: 90_000 });

		const request = buildRequest({ psbt: psbt.toBase64(), broadcast: false });

		const decoded = decodePsbt({
			request,
			address: walletAddress,
			walletUtxos: [walletUtxo({ txid: FIRST_TXID, value: 100_000n })]
		});

		expect(decoded.ambiguous).toBeTruthy();
		expect(decoded.fee).toBeUndefined();
	});

	it('recognises an input spending a wallet UTXO by its outpoint when it states no previous output', () => {
		const psbt = new Psbt({ network });
		psbt.addInput({ hash: FIRST_TXID, index: 0 });
		psbt.addOutput({ script: externalScript as Buffer, value: 90_000 });

		const request = buildRequest({ psbt: psbt.toBase64(), broadcast: false });

		const decoded = decodePsbt({
			request,
			address: walletAddress,
			walletUtxos: [walletUtxo({ txid: FIRST_TXID, value: 100_000n })]
		});

		expect(decoded.inputs[0]).toStrictEqual({
			address: walletAddress,
			value: 100_000n,
			signedByWallet: true
		});
		expect(decoded.totalSignedInputs).toBe(100_000n);
		expect(decoded.fee).toBe(10_000n);
		expect(decoded.ambiguous).toBeFalsy();
		expect(decoded.unverified).toBeFalsy();
	});

	it('flags an input of another address that only its witnessUtxo prices as unverified', () => {
		const psbt = new Psbt({ network });
		psbt.addInput({
			hash: FIRST_TXID,
			index: 0,
			witnessUtxo: { script: walletScript as Buffer, value: 100_000 }
		});
		psbt.addInput({
			hash: '0000000000000000000000000000000000000000000000000000000000000002',
			index: 0,
			witnessUtxo: { script: externalScript as Buffer, value: 500_000 }
		});
		psbt.addOutput({ script: externalScript as Buffer, value: 590_000 });

		const request = buildRequest({ psbt: psbt.toBase64(), broadcast: false });

		const decoded = decodePsbt({
			request,
			address: walletAddress,
			walletUtxos: [walletUtxo({ txid: FIRST_TXID, value: 100_000n })]
		});

		expect(decoded.inputs[1].value).toBeUndefined();
		expect(decoded.inputs[1].signedByWallet).toBeFalsy();
		expect(decoded.totalSignedInputs).toBe(100_000n);
		expect(decoded.fee).toBeUndefined();
		expect(decoded.ambiguous).toBeFalsy();
		expect(decoded.unverified).toBeTruthy();
	});

	it('flags each of two requests that state one wallet output outside the UTXO set with another script as unverified', () => {
		// Outputs not yet in a block are absent from the UTXO set: whichever of the two the request
		// proves, the other must be proven too, whatever script it states.
		const first = buildPrevTx({ script: walletScript as Buffer, value: 100_000_000 });
		const second = new Transaction();
		second.addInput(Buffer.alloc(32, 2), 0);
		second.addOutput(walletScript as Buffer, 100_000_000);

		const buildProving = (proven: Transaction): string => {
			const psbt = new Psbt({ network });

			for (const prevTx of [first, second]) {
				psbt.addInput({
					hash: prevTx.getId(),
					index: 0,
					...(prevTx === proven
						? {
								nonWitnessUtxo: prevTx.toBuffer(),
								witnessUtxo: { script: walletScript as Buffer, value: 100_000_000 }
							}
						: { witnessUtxo: { script: externalScript as Buffer, value: 1 } })
				});
			}

			psbt.addOutput({ script: walletScript as Buffer, value: 99_990_000 });

			return psbt.toBase64();
		};

		for (const proven of [first, second]) {
			const decoded = decodePsbt({
				request: buildRequest({ psbt: buildProving(proven), broadcast: false }),
				address: walletAddress,
				walletUtxos: []
			});

			expect(decoded.unverified).toBeTruthy();
			expect(decoded.fee).toBeUndefined();
		}
	});

	it('shows no figure for either of two requests that each state one input of the wallet below its value', () => {
		// The same transaction, sent twice, each time truthful about a different input: each signature
		// would commit only to the input it signs, so both requests must be refused.
		const SECOND_TXID = '0000000000000000000000000000000000000000000000000000000000000002';

		const walletUtxos = [
			walletUtxo({ txid: FIRST_TXID, value: 100_000_000n }),
			walletUtxo({ txid: SECOND_TXID, value: 100_000_000n })
		];

		const buildStatingValues = ([first, second]: [number, number]): string => {
			const psbt = new Psbt({ network });
			psbt.addInput({
				hash: FIRST_TXID,
				index: 0,
				witnessUtxo: { script: walletScript as Buffer, value: first }
			});
			psbt.addInput({
				hash: SECOND_TXID,
				index: 0,
				witnessUtxo: { script: walletScript as Buffer, value: second }
			});
			psbt.addOutput({ script: walletScript as Buffer, value: 99_990_000 });

			return psbt.toBase64();
		};

		for (const values of [
			[100_000_000, 1],
			[1, 100_000_000]
		] as [number, number][]) {
			const decoded = decodePsbt({
				request: buildRequest({ psbt: buildStatingValues(values), broadcast: false }),
				address: walletAddress,
				walletUtxos
			});

			expect(decoded.ambiguous).toBeTruthy();
			expect(decoded.fee).toBeUndefined();
		}
	});

	describe('loadPsbtWalletUtxos', () => {
		const mainnetChainId = Object.keys(BIP122_CHAINS).find(
			(key) => BIP122_CHAINS[key].networkId === BTC_MAINNET_NETWORK_ID
		);
		assertNonNullish(mainnetChainId);

		const buildChainRequest = (chainId: string): WalletKitTypes.SessionRequest =>
			({
				params: { chainId, request: { method: 'signPsbt', params: {} } }
			}) as unknown as WalletKitTypes.SessionRequest;

		const page = ({
			utxos,
			nextPage
		}: {
			utxos: BitcoinDid.utxo[];
			nextPage?: Uint8Array;
		}): BitcoinDid.get_utxos_response => ({
			utxos,
			next_page: toNullable(nextPage),
			tip_height: 100,
			tip_block_hash: new Uint8Array()
		});

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('reads every page of the wallet UTXO set on mainnet', async () => {
			const first = walletUtxo({ txid: FIRST_TXID, value: 1_000n });
			const second = walletUtxo({ txid: FIRST_TXID, vout: 1, value: 2_000n });
			const nextPage = Uint8Array.from([7]);

			const spy = vi
				.spyOn(bitcoinApi, 'getUtxosQuery')
				.mockResolvedValueOnce(page({ utxos: [first], nextPage }))
				.mockResolvedValueOnce(page({ utxos: [second] }));

			await expect(
				loadPsbtWalletUtxos({
					request: buildChainRequest(mainnetChainId),
					address: mockBtcAddress,
					identity: mockIdentity
				})
			).resolves.toStrictEqual([first, second]);

			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ address: mockBtcAddress, network: 'mainnet', page: undefined })
			);
			expect(spy).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ address: mockBtcAddress, network: 'mainnet', page: nextPage })
			);
		});

		it('reads nothing for a request on another network', async () => {
			const spy = vi.spyOn(bitcoinApi, 'getUtxosQuery');

			await expect(
				loadPsbtWalletUtxos({
					request: buildChainRequest(testnetChainId),
					address: mockBtcAddress,
					identity: mockIdentity
				})
			).resolves.toStrictEqual([]);

			expect(spy).not.toHaveBeenCalled();
		});

		it('reads nothing without a wallet address', async () => {
			const spy = vi.spyOn(bitcoinApi, 'getUtxosQuery');

			await expect(
				loadPsbtWalletUtxos({
					request: buildChainRequest(mainnetChainId),
					address: undefined,
					identity: mockIdentity
				})
			).resolves.toStrictEqual([]);

			expect(spy).not.toHaveBeenCalled();
		});
	});

	it('reports the broadcast flag and defaults it to false', () => {
		const request = buildRequest({ psbt: buildPsbt() });

		expect(decodePsbt({ request, address: walletAddress, walletUtxos: [] }).broadcast).toBeFalsy();

		const broadcastRequest = buildRequest({ psbt: buildPsbt(), broadcast: true });

		expect(
			decodePsbt({ request: broadcastRequest, address: walletAddress, walletUtxos: [] }).broadcast
		).toBeTruthy();
	});

	it('throws when the PSBT is missing', () => {
		const request = buildRequest({ broadcast: false });

		expect(() => decodePsbt({ request, address: walletAddress, walletUtxos: [] })).toThrow();
	});

	it('throws when the PSBT cannot be parsed', () => {
		const request = buildRequest({ psbt: 'not-a-valid-psbt', broadcast: false });

		expect(() => decodePsbt({ request, address: walletAddress, walletUtxos: [] })).toThrow();
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

		const buildOwnedPsbtWithBothUtxos = ({ witnessValue }: { witnessValue: number }): string => {
			const { output: ownScript } = payments.p2wpkh({
				pubkey: signerPubkey,
				network: networks.bitcoin
			});

			const prevTx = new Transaction();
			prevTx.addInput(Buffer.alloc(32, 1), 0);
			prevTx.addOutput(ownScript as Buffer, 100_000);

			const psbt = new Psbt({ network: networks.bitcoin });
			psbt.addInput({
				hash: prevTx.getId(),
				index: 0,
				nonWitnessUtxo: prevTx.toBuffer(),
				witnessUtxo: { script: ownScript as Buffer, value: witnessValue }
			});
			psbt.addOutput({ script: ownScript as Buffer, value: 90_000 });

			return psbt.toBase64();
		};

		const mockListener = {
			pair: vi.fn(),
			approveSession: vi.fn(),
			approvedNamespaces: vi.fn(),
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

		const mockWalletUtxos = (utxos: BitcoinDid.utxo[]): MockInstance =>
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
				utxos,
				next_page: [],
				tip_height: 100,
				tip_block_hash: new Uint8Array()
			});

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

			mockWalletUtxos([walletUtxo({ txid: FIRST_TXID, value: 100_000n })]);
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

		it('signs a request whose witnessUtxo and nonWitnessUtxo state the same previous output', async () => {
			const { address: mainnetAddress } = payments.p2wpkh({
				pubkey: signerPubkey,
				network: networks.bitcoin
			});

			const result = await signPsbt({
				listener: mockListener,
				request: buildSignRequest({
					chainId: mainnetChainId,
					params: {
						psbt: buildOwnedPsbtWithBothUtxos({ witnessValue: 100_000 }),
						broadcast: false
					}
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
		});

		it('rejects a request whose witnessUtxo and nonWitnessUtxo disagree without signing', async () => {
			const { address: mainnetAddress } = payments.p2wpkh({
				pubkey: signerPubkey,
				network: networks.bitcoin
			});

			// The review would price this at 10_000 while the signature would commit to the 100_000 the
			// `nonWitnessUtxo` states.
			const result = await signPsbt({
				listener: mockListener,
				request: buildSignRequest({
					chainId: mainnetChainId,
					params: {
						psbt: buildOwnedPsbtWithBothUtxos({ witnessValue: 10_000 }),
						broadcast: false
					}
				}),
				address: mainnetAddress,
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

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.btc_psbt_input_ambiguous }
			});
		});

		it('reads the wallet UTXO set again when signing', async () => {
			const spy = mockWalletUtxos([walletUtxo({ txid: FIRST_TXID, value: 100_000n })]);

			const { address: mainnetAddress } = payments.p2wpkh({
				pubkey: signerPubkey,
				network: networks.bitcoin
			});

			await signPsbt({
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

			expect(spy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ address: mainnetAddress, network: 'mainnet' })
			);
		});

		it('rejects a request whose wallet input is in neither the UTXO set nor a previous transaction', async () => {
			mockWalletUtxos([]);

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

			expect(result).toEqual({ success: false });

			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				id: 456,
				topic: 'sign-topic',
				error: UNEXPECTED_ERROR
			});

			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(signerApi.signBtcPrehash).not.toHaveBeenCalled();

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.btc_psbt_input_unverified }
			});
		});

		it('rejects a request stating another value for a wallet UTXO without signing', async () => {
			mockWalletUtxos([walletUtxo({ txid: FIRST_TXID, value: 900_000n })]);

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

			expect(result).toEqual({ success: false });

			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(signerApi.signBtcPrehash).not.toHaveBeenCalled();

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.btc_psbt_input_ambiguous }
			});
		});

		it('signs a request whose previous transactions prove every input when the UTXO lookup fails', async () => {
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockRejectedValue(new Error('unavailable'));

			const { address: mainnetAddress } = payments.p2wpkh({
				pubkey: signerPubkey,
				network: networks.bitcoin
			});

			const result = await signPsbt({
				listener: mockListener,
				request: buildSignRequest({
					chainId: mainnetChainId,
					params: {
						psbt: buildOwnedPsbtWithBothUtxos({ witnessValue: 100_000 }),
						broadcast: false
					}
				}),
				address: mainnetAddress,
				modalNext,
				progress,
				identity: mockIdentity
			});

			expect(result).toEqual({ success: true });

			expect(mockListener.approveRequest).toHaveBeenCalledOnce();
			expect(mockListener.rejectRequest).not.toHaveBeenCalled();
			expect(signerApi.signBtcPrehash).toHaveBeenCalledOnce();
		});

		it('declines an input its previous transaction does not prove as unverified when the UTXO lookup fails', async () => {
			vi.spyOn(bitcoinApi, 'getUtxosQuery').mockRejectedValue(new Error('unavailable'));

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

			expect(result).toEqual({ success: false });

			expect(mockListener.approveRequest).not.toHaveBeenCalled();
			expect(signerApi.signBtcPrehash).not.toHaveBeenCalled();

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: en.wallet_connect.error.btc_psbt_input_unverified }
			});
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
			approvedNamespaces: vi.fn(),
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
