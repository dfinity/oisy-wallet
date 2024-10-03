import type {
	_SERVICE as BackendService,
	CustomToken,
	IcrcToken,
	UserProfile,
	UserToken
} from '$declarations/backend/backend.did';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import type { AddUserCredentialParams, BtcSelectUserUtxosFeeParams } from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { type ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';
import { describe } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { btcAddress } from '../../mocks/btc.mock';
import { mockIdentity, mockPrincipal } from '../../mocks/identity.mock';

vi.mock(import('$lib/constants/app.constants'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		LOCAL: false
	};
});

describe('backend.canister', () => {
	const createBackendCanister = async ({
		serviceOverride
	}: Pick<CreateCanisterOptions<BackendService>, 'serviceOverride'>): Promise<BackendCanister> =>
		BackendCanister.create({
			canisterId: Principal.fromText('tdxud-2yaaa-aaaad-aadiq-cai'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});
	const service = mock<ActorSubclass<BackendService>>();
	const mockResponseError = new Error('Test response error');
	const queryParams = {
		certified: false
	};

	const addUserCredentialParams = {
		credentialJwt: 'test-credential-jwt',
		issuerCanisterId: mockPrincipal,
		currentUserVersion: 0n,
		credentialSpec: {
			arguments: [],
			credential_type: ''
		}
	} as AddUserCredentialParams;
	const addUserCredentialEndpointParams = {
		credential_jwt: addUserCredentialParams.credentialJwt,
		issuer_canister_id: addUserCredentialParams.issuerCanisterId,
		current_user_version: toNullable(addUserCredentialParams.currentUserVersion),
		credential_spec: addUserCredentialParams.credentialSpec
	};

	const btcAddPendingTransactionParams = {
		txId: [1, 2, 3],
		network: { testnet: null },
		address: btcAddress,
		utxos: [
			{
				height: 1000,
				value: 1n,
				outpoint: {
					txid: [1, 2, 3],
					vout: 1
				}
			}
		]
	};
	const btcAddPendingTransactionEndpointParams = {
		txid: btcAddPendingTransactionParams.txId,
		network: btcAddPendingTransactionParams.network,
		address: btcAddPendingTransactionParams.address,
		utxos: btcAddPendingTransactionParams.utxos
	};

	const btcGetPendingTransactionParams = {
		network: btcAddPendingTransactionParams.network,
		address: btcAddPendingTransactionParams.address
	};

	const btcSelectUserUtxosFeeParams = {
		network: btcAddPendingTransactionParams.network,
		minConfirmations: [100],
		amountSatoshis: 100n,
		sourceAddress: btcAddress
	} as BtcSelectUserUtxosFeeParams;
	const btcSelectUserUtxosFeeEndpointParams = {
		network: btcSelectUserUtxosFeeParams.network,
		min_confirmations: btcSelectUserUtxosFeeParams.minConfirmations,
		amount_satoshis: btcSelectUserUtxosFeeParams.amountSatoshis,
		source_address: btcSelectUserUtxosFeeParams.sourceAddress
	};

	const mockedUserProfile = {
		credentials: [
			{
				issuer: 'test-issuer',
				verified_date_timestamp: [],
				credential_type: { ProofOfUniqueness: null }
			}
		],
		version: [],
		created_timestamp: 1n,
		updated_timestamp: 1n
	} as UserProfile;

	const mockedUserToken = {
		decimals: [],
		version: [],
		enabled: [],
		chain_id: 1n,
		contract_address: 'test_address',
		symbol: []
	} as UserToken;
	const userTokens = [mockedUserToken];

	const mockedCustomToken = {
		token: {
			Icrc: {
				ledger_id: mockPrincipal,
				index_id: []
			} as IcrcToken
		},
		version: [],
		enabled: false
	} as CustomToken;
	const customTokens = [mockedCustomToken];

	const errorResponse = { Err: { InternalError: { msg: 'Test error' } } };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns user tokens', async () => {
		service.list_user_tokens.mockResolvedValue(userTokens);

		const { listUserTokens } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await listUserTokens(queryParams);

		expect(res).toEqual(userTokens);
	});

	it('should throw an error if list_user_tokens throws', async () => {
		service.list_user_tokens.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { listUserTokens } = await createBackendCanister({
			serviceOverride: service
		});

		const res = listUserTokens(queryParams);

		await expect(res).rejects.toThrow(mockResponseError);
	});

	it('returns custom tokens', async () => {
		service.list_custom_tokens.mockResolvedValue(customTokens);

		const { listCustomTokens } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await listCustomTokens(queryParams);

		expect(res).toEqual(customTokens);
	});

	it('should throw an error if list_custom_tokens throws', async () => {
		service.list_custom_tokens.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { listCustomTokens } = await createBackendCanister({
			serviceOverride: service
		});

		const res = listCustomTokens(queryParams);

		await expect(res).rejects.toThrow(mockResponseError);
	});

	it('sets many custom tokens', async () => {
		const { setManyCustomTokens } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await setManyCustomTokens({ tokens: customTokens });

		expect(service.set_many_custom_tokens).toHaveBeenCalledWith(customTokens);
		expect(res).toEqual(undefined);
	});

	it('should throw an error if set_many_custom_tokens throws', async () => {
		service.set_many_custom_tokens.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { setManyCustomTokens } = await createBackendCanister({
			serviceOverride: service
		});

		const res = setManyCustomTokens({ tokens: customTokens });

		await expect(res).rejects.toThrow(mockResponseError);
	});

	it('sets custom token', async () => {
		const { setCustomToken } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await setCustomToken({ token: mockedCustomToken });

		expect(service.set_custom_token).toHaveBeenCalledWith(mockedCustomToken);
		expect(res).toEqual(undefined);
	});

	it('should throw an error if set_custom_token throws', async () => {
		service.set_custom_token.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { setCustomToken } = await createBackendCanister({
			serviceOverride: service
		});

		const res = setCustomToken({ token: mockedCustomToken });

		await expect(res).rejects.toThrow(mockResponseError);
	});

	it('sets many user tokens', async () => {
		const { setManyUserTokens } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await setManyUserTokens({ tokens: userTokens });

		expect(service.set_many_user_tokens).toHaveBeenCalledWith(userTokens);
		expect(res).toEqual(undefined);
	});

	it('should throw an error if set_many_user_tokens throws', async () => {
		service.set_many_user_tokens.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { setManyUserTokens } = await createBackendCanister({
			serviceOverride: service
		});

		const res = setManyUserTokens({ tokens: userTokens });

		await expect(res).rejects.toThrow(mockResponseError);
	});

	it('sets user token', async () => {
		const { setUserToken } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await setUserToken({ token: mockedUserToken });

		expect(service.set_user_token).toHaveBeenCalledWith(mockedUserToken);
		expect(res).toEqual(undefined);
	});

	it('should throw an error if set_user_token throws', async () => {
		service.set_user_token.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { setUserToken } = await createBackendCanister({
			serviceOverride: service
		});

		const res = setUserToken({ token: mockedUserToken });

		await expect(res).rejects.toThrow(mockResponseError);
	});

	it('creates user profile', async () => {
		service.create_user_profile.mockResolvedValue(mockedUserProfile);

		const { createUserProfile } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await createUserProfile();

		expect(res).toEqual(mockedUserProfile);
	});

	it('should throw an error if create_user_profile throws', async () => {
		service.create_user_profile.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { createUserProfile } = await createBackendCanister({
			serviceOverride: service
		});

		const res = createUserProfile();

		await expect(res).rejects.toThrow(mockResponseError);
	});

	it('returns user profile success response', async () => {
		const response = { Ok: mockedUserProfile };
		service.get_user_profile.mockResolvedValue(response);

		const { getUserProfile } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await getUserProfile(queryParams);

		expect(res).toEqual(response);
	});

	it('returns user profile error response', async () => {
		const response = { Err: { NotFound: null } };
		service.get_user_profile.mockResolvedValue({ Err: { NotFound: null } });

		const { getUserProfile } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await getUserProfile(queryParams);

		expect(res).toEqual(response);
	});

	it('should throw an error if get_user_profile throws', async () => {
		service.get_user_profile.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { getUserProfile } = await createBackendCanister({
			serviceOverride: service
		});

		const res = getUserProfile(queryParams);

		await expect(res).rejects.toThrow(mockResponseError);
	});

	it('adds user credentials with success response', async () => {
		const response = { Ok: null };

		service.add_user_credential.mockResolvedValue(response);

		const { addUserCredential } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await addUserCredential(addUserCredentialParams);

		expect(service.add_user_credential).toHaveBeenCalledWith(addUserCredentialEndpointParams);
		expect(res).toEqual(response);
	});

	it('adds user credentials with error response', async () => {
		const response = { Err: { InvalidCredential: null } };
		service.add_user_credential.mockResolvedValue(response);

		const { addUserCredential } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await addUserCredential(addUserCredentialParams);

		expect(service.add_user_credential).toHaveBeenCalledWith(addUserCredentialEndpointParams);
		expect(res).toEqual(response);
	});

	it('should throw an error if add_user_credential throws', async () => {
		service.add_user_credential.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { addUserCredential } = await createBackendCanister({
			serviceOverride: service
		});

		const res = addUserCredential(addUserCredentialParams);

		await expect(res).rejects.toThrow(mockResponseError);
	});

	describe('btc_add_pending_transaction', () => {
		it('adds btc pending transactions with success response', async () => {
			const response = { Ok: null };

			service.btc_add_pending_transaction.mockResolvedValue(response);

			const { btcAddPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await btcAddPendingTransaction(btcAddPendingTransactionParams);

			expect(service.btc_add_pending_transaction).toHaveBeenCalledWith(
				btcAddPendingTransactionEndpointParams
			);
			expect(res).toEqual(true);
		});

		it('should throw an error if btc_add_pending_transaction returns an internal error', async () => {
			service.btc_add_pending_transaction.mockResolvedValue(errorResponse);

			const { btcAddPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcAddPendingTransaction(btcAddPendingTransactionParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError(errorResponse.Err.InternalError.msg)
			);
		});

		it('should throw an error if btc_add_pending_transaction throws', async () => {
			service.btc_add_pending_transaction.mockImplementation(async () => {
				throw mockResponseError;
			});

			const { btcAddPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcAddPendingTransaction(btcAddPendingTransactionParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('btc_get_pending_transactions', () => {
		it('should return pending btc transactions with success response', async () => {
			const response = {
				Ok: {
					transactions: [
						{
							utxos: btcAddPendingTransactionParams.utxos,
							txid: btcAddPendingTransactionParams.txId
						}
					]
				}
			};

			service.btc_get_pending_transactions.mockResolvedValue(response);

			const { btcGetPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await btcGetPendingTransaction(btcGetPendingTransactionParams);

			expect(service.btc_get_pending_transactions).toHaveBeenCalledWith(
				btcGetPendingTransactionParams
			);
			expect(res).toEqual(response.Ok.transactions);
		});

		it('should throw an error if btc_get_pending_transactions returns an internal error', async () => {
			service.btc_get_pending_transactions.mockResolvedValue(errorResponse);

			const { btcGetPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetPendingTransaction(btcGetPendingTransactionParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError(errorResponse.Err.InternalError.msg)
			);
		});

		it('should throw an error if btc_get_pending_transactions throws', async () => {
			service.btc_get_pending_transactions.mockImplementation(async () => {
				throw mockResponseError;
			});

			const { btcGetPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetPendingTransaction(btcGetPendingTransactionParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('btc_select_user_utxos_fee', () => {
		it('should return user utxos fee with success response', async () => {
			const response = {
				Ok: {
					fee_satoshis: 1n,
					utxos: btcAddPendingTransactionParams.utxos
				}
			};

			service.btc_select_user_utxos_fee.mockResolvedValue(response);

			const { btcSelectUserUtxosFee } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await btcSelectUserUtxosFee(btcSelectUserUtxosFeeParams);

			expect(service.btc_select_user_utxos_fee).toHaveBeenCalledWith(
				btcSelectUserUtxosFeeEndpointParams
			);
			expect(res).toEqual(response.Ok);
		});

		it('should throw an error if btc_select_user_utxos_fee returns an internal error', async () => {
			service.btc_select_user_utxos_fee.mockResolvedValue(errorResponse);

			const { btcSelectUserUtxosFee } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcSelectUserUtxosFee(btcSelectUserUtxosFeeParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError(errorResponse.Err.InternalError.msg)
			);
		});

		it('should throw an error if btc_select_user_utxos_fee throws', async () => {
			service.btc_select_user_utxos_fee.mockImplementation(async () => {
				throw mockResponseError;
			});

			const { btcSelectUserUtxosFee } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcSelectUserUtxosFee(btcSelectUserUtxosFeeParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});
});
