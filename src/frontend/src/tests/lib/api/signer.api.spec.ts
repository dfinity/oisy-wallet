import { BTC_ECDSA_KEY_ID } from '$btc/constants/wallet-connect.constants';
import type {
	Network as BitcoinNetwork,
	EthSignTransactionRequest,
	SendBtcResponse,
	SignBtcResponse
} from '$declarations/signer/signer.did';
import { SOLANA_KEY_ID } from '$env/networks/networks.sol.env';
import {
	genericSignWithEcdsa,
	getBtcAddress,
	getBtcBalance,
	getEthAddress,
	getSchnorrPublicKey,
	sendBtc,
	signBtc,
	signMessage,
	signPrehash,
	signTransaction,
	signWithSchnorr
} from '$lib/api/signer.api';
import { SignerCanister } from '$lib/canisters/signer.canister';
import * as appConstants from '$lib/constants/app.constants';
import type {
	GenericSignWithEcdsaParams,
	GetSchnorrPublicKeyParams,
	SendBtcParams,
	SignWithSchnorrParams
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('signer.api', () => {
	const signerCanisterMock = mock<SignerCanister>();

	const mockSignerCanisterId = 'tdxud-2yaaa-aaaad-aadiq-cai';

	const baseParams = { identity: mockIdentity };

	const network: BitcoinNetwork = { testnet: null };

	const sendBtcParams: SendBtcParams = {
		feeSatoshis: [10n],
		network,
		utxosToSpend: [
			{
				height: 1000,
				value: 1n,
				outpoint: { txid: Uint8Array.from([1, 2, 3]), vout: 1 }
			}
		],
		outputs: [{ destination_address: 'test-address', sent_satoshis: 10n }]
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(SignerCanister, 'create').mockResolvedValue(signerCanisterMock);
		vi.spyOn(appConstants, 'SIGNER_CANISTER_ID', 'get').mockImplementation(
			() => mockSignerCanisterId
		);
	});

	// The api caches canister instances per principal, so a fresh identity is required to observe a
	// call to `SignerCanister.create`.
	describe('signerCanister', () => {
		it('should create the canister with the signer canister id', async () => {
			const identity = Ed25519KeyIdentity.generate();

			signerCanisterMock.getEthAddress.mockResolvedValue(mockEthAddress);

			await getEthAddress({ identity });

			expect(SignerCanister.create).toHaveBeenCalledExactlyOnceWith({
				identity,
				canisterId: Principal.fromText(mockSignerCanisterId)
			});
		});

		it('should reuse the cached canister for the same identity', async () => {
			const identity = Ed25519KeyIdentity.generate();

			signerCanisterMock.getEthAddress.mockResolvedValue(mockEthAddress);

			await getEthAddress({ identity });
			await getEthAddress({ identity });

			expect(SignerCanister.create).toHaveBeenCalledOnce();
		});
	});

	describe('getBtcAddress', () => {
		const mockParams: CanisterApiFunctionParams<{ network: BitcoinNetwork }> = {
			...baseParams,
			network
		};

		beforeEach(() => {
			signerCanisterMock.getBtcAddress.mockResolvedValue(mockBtcAddress);
		});

		it('should successfully call getBtcAddress endpoint', async () => {
			const result = await getBtcAddress(mockParams);

			expect(result).toEqual(mockBtcAddress);
			expect(signerCanisterMock.getBtcAddress).toHaveBeenCalledExactlyOnceWith({ network });
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(getBtcAddress({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if getBtcAddress throws', async () => {
			signerCanisterMock.getBtcAddress.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(getBtcAddress(mockParams)).rejects.toThrow();
		});
	});

	describe('getEthAddress', () => {
		const mockParams: CanisterApiFunctionParams = baseParams;

		beforeEach(() => {
			signerCanisterMock.getEthAddress.mockResolvedValue(mockEthAddress);
		});

		it('should successfully call getEthAddress endpoint', async () => {
			const result = await getEthAddress(mockParams);

			expect(result).toEqual(mockEthAddress);
			expect(signerCanisterMock.getEthAddress).toHaveBeenCalledExactlyOnceWith();
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(getEthAddress({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if getEthAddress throws', async () => {
			signerCanisterMock.getEthAddress.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(getEthAddress(mockParams)).rejects.toThrow();
		});
	});

	describe('getBtcBalance', () => {
		const mockParams: CanisterApiFunctionParams<{
			network: BitcoinNetwork;
			minConfirmations?: number;
		}> = {
			...baseParams,
			network,
			minConfirmations: 6
		};

		beforeEach(() => {
			signerCanisterMock.getBtcBalance.mockResolvedValue(123n);
		});

		it('should successfully call getBtcBalance endpoint', async () => {
			const result = await getBtcBalance(mockParams);

			expect(result).toEqual(123n);
			expect(signerCanisterMock.getBtcBalance).toHaveBeenCalledExactlyOnceWith({
				network,
				minConfirmations: 6
			});
		});

		it('should forward an undefined minConfirmations', async () => {
			await getBtcBalance({ ...baseParams, network });

			expect(signerCanisterMock.getBtcBalance).toHaveBeenCalledExactlyOnceWith({
				network,
				minConfirmations: undefined
			});
		});

		it('should create the canister with the provided canister id', async () => {
			const identity = Ed25519KeyIdentity.generate();
			const canisterId = 'aaaaa-aa';

			await getBtcBalance({ identity, network, canisterId });

			expect(SignerCanister.create).toHaveBeenCalledExactlyOnceWith({
				identity,
				canisterId: Principal.fromText(canisterId)
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(getBtcBalance({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if getBtcBalance throws', async () => {
			signerCanisterMock.getBtcBalance.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(getBtcBalance(mockParams)).rejects.toThrow();
		});
	});

	describe('signTransaction', () => {
		const transaction: EthSignTransactionRequest = {
			to: 'to',
			gas: 1n,
			value: 2n,
			max_priority_fee_per_gas: 1n,
			data: [],
			max_fee_per_gas: 5n,
			chain_id: 10n,
			nonce: 10n
		};

		const mockParams: CanisterApiFunctionParams<{ transaction: EthSignTransactionRequest }> = {
			...baseParams,
			transaction
		};

		beforeEach(() => {
			signerCanisterMock.signTransaction.mockResolvedValue('signed-transaction');
		});

		it('should successfully call signTransaction endpoint', async () => {
			const result = await signTransaction(mockParams);

			expect(result).toBe('signed-transaction');
			expect(signerCanisterMock.signTransaction).toHaveBeenCalledExactlyOnceWith({ transaction });
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(signTransaction({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if signTransaction throws', async () => {
			signerCanisterMock.signTransaction.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(signTransaction(mockParams)).rejects.toThrow();
		});
	});

	describe('signBtc', () => {
		const mockParams: CanisterApiFunctionParams<SendBtcParams> = {
			...baseParams,
			...sendBtcParams
		};

		const mockResponse: SignBtcResponse = {
			txid: 'txid',
			signed_transaction_hex: 'signed-transaction-hex'
		};

		beforeEach(() => {
			signerCanisterMock.signBtc.mockResolvedValue(mockResponse);
		});

		it('should successfully call signBtc endpoint', async () => {
			const result = await signBtc(mockParams);

			expect(result).toEqual(mockResponse);
			expect(signerCanisterMock.signBtc).toHaveBeenCalledExactlyOnceWith(sendBtcParams);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(signBtc({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if signBtc throws', async () => {
			signerCanisterMock.signBtc.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(signBtc(mockParams)).rejects.toThrow();
		});
	});

	describe('signMessage', () => {
		const mockParams: CanisterApiFunctionParams<{ message: string }> = {
			...baseParams,
			message: 'message'
		};

		beforeEach(() => {
			signerCanisterMock.personalSign.mockResolvedValue('signed-message');
		});

		it('should successfully call personalSign endpoint', async () => {
			const result = await signMessage(mockParams);

			expect(result).toBe('signed-message');
			expect(signerCanisterMock.personalSign).toHaveBeenCalledExactlyOnceWith({
				message: 'message'
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(signMessage({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if personalSign throws', async () => {
			signerCanisterMock.personalSign.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(signMessage(mockParams)).rejects.toThrow();
		});
	});

	describe('signPrehash', () => {
		const mockParams: CanisterApiFunctionParams<{ hash: string }> = {
			...baseParams,
			hash: 'hash'
		};

		beforeEach(() => {
			signerCanisterMock.signPrehash.mockResolvedValue('signed-prehash');
		});

		it('should successfully call signPrehash endpoint', async () => {
			const result = await signPrehash(mockParams);

			expect(result).toBe('signed-prehash');
			expect(signerCanisterMock.signPrehash).toHaveBeenCalledExactlyOnceWith({ hash: 'hash' });
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(signPrehash({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if signPrehash throws', async () => {
			signerCanisterMock.signPrehash.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(signPrehash(mockParams)).rejects.toThrow();
		});
	});

	describe('sendBtc', () => {
		const mockParams: CanisterApiFunctionParams<SendBtcParams> = {
			...baseParams,
			...sendBtcParams
		};

		const mockResponse: SendBtcResponse = { txid: 'txid' };

		beforeEach(() => {
			signerCanisterMock.sendBtc.mockResolvedValue(mockResponse);
		});

		it('should successfully call sendBtc endpoint', async () => {
			const result = await sendBtc(mockParams);

			expect(result).toEqual(mockResponse);
			expect(signerCanisterMock.sendBtc).toHaveBeenCalledExactlyOnceWith(sendBtcParams);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(sendBtc({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if sendBtc throws', async () => {
			signerCanisterMock.sendBtc.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(sendBtc(mockParams)).rejects.toThrow();
		});
	});

	describe('getSchnorrPublicKey', () => {
		const rest: GetSchnorrPublicKeyParams = {
			derivationPath: ['test'],
			keyId: SOLANA_KEY_ID
		};

		const mockParams: CanisterApiFunctionParams<GetSchnorrPublicKeyParams> = {
			...baseParams,
			...rest
		};

		const mockResponse = Uint8Array.from([1, 2, 3]);

		beforeEach(() => {
			signerCanisterMock.getSchnorrPublicKey.mockResolvedValue(mockResponse);
		});

		it('should successfully call getSchnorrPublicKey endpoint', async () => {
			const result = await getSchnorrPublicKey(mockParams);

			expect(result).toEqual(mockResponse);
			expect(signerCanisterMock.getSchnorrPublicKey).toHaveBeenCalledExactlyOnceWith(rest);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(getSchnorrPublicKey({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if getSchnorrPublicKey throws', async () => {
			signerCanisterMock.getSchnorrPublicKey.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(getSchnorrPublicKey(mockParams)).rejects.toThrow();
		});
	});

	describe('signWithSchnorr', () => {
		const rest: SignWithSchnorrParams = {
			derivationPath: ['test'],
			keyId: SOLANA_KEY_ID,
			message: Uint8Array.from([4, 5, 6])
		};

		const mockParams: CanisterApiFunctionParams<SignWithSchnorrParams> = {
			...baseParams,
			...rest
		};

		const mockResponse = Uint8Array.from([1, 2, 3]);

		beforeEach(() => {
			signerCanisterMock.signWithSchnorr.mockResolvedValue(mockResponse);
		});

		it('should successfully call signWithSchnorr endpoint', async () => {
			const result = await signWithSchnorr(mockParams);

			expect(result).toEqual(mockResponse);
			expect(signerCanisterMock.signWithSchnorr).toHaveBeenCalledExactlyOnceWith(rest);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(signWithSchnorr({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if signWithSchnorr throws', async () => {
			signerCanisterMock.signWithSchnorr.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(signWithSchnorr(mockParams)).rejects.toThrow();
		});
	});

	describe('genericSignWithEcdsa', () => {
		const rest: GenericSignWithEcdsaParams = {
			derivationPath: ['test'],
			keyId: BTC_ECDSA_KEY_ID,
			messageHash: Uint8Array.from([7, 8, 9])
		};

		const mockParams: CanisterApiFunctionParams<GenericSignWithEcdsaParams> = {
			...baseParams,
			...rest
		};

		const mockResponse = Uint8Array.from([1, 2, 3]);

		beforeEach(() => {
			signerCanisterMock.genericSignWithEcdsa.mockResolvedValue(mockResponse);
		});

		it('should successfully call genericSignWithEcdsa endpoint', async () => {
			const result = await genericSignWithEcdsa(mockParams);

			expect(result).toEqual(mockResponse);
			expect(signerCanisterMock.genericSignWithEcdsa).toHaveBeenCalledExactlyOnceWith(rest);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(genericSignWithEcdsa({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if genericSignWithEcdsa throws', async () => {
			signerCanisterMock.genericSignWithEcdsa.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(genericSignWithEcdsa(mockParams)).rejects.toThrow();
		});
	});
});
