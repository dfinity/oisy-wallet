import type {
	_SERVICE as BackendService,
	CustomToken,
	IcrcToken,
	Result_2,
	UserProfile,
	UserToken
} from '$declarations/backend/backend.did';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import { ZERO_BI } from '$lib/constants/app.constants';
import type { AddUserCredentialParams, BtcSelectUserUtxosFeeParams } from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { type ActorSubclass } from '@dfinity/agent';
import { mapIcrc2ApproveError } from '@dfinity/ledger-icp';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';
import { mock } from 'vitest-mock-extended';

vi.mock(import('$lib/constants/app.constants'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		LOCAL: false
	};
});

describe('backend.canister', () => {
	const createBackendCanister = ({
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
		currentUserVersion: ZERO_BI,
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
		address: mockBtcAddress,
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
		amountSatoshis: 100n
	} as BtcSelectUserUtxosFeeParams;
	const btcSelectUserUtxosFeeEndpointParams = {
		network: btcSelectUserUtxosFeeParams.network,
		min_confirmations: btcSelectUserUtxosFeeParams.minConfirmations,
		amount_satoshis: btcSelectUserUtxosFeeParams.amountSatoshis
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
			await Promise.resolve();
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
			await Promise.resolve();
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
			await Promise.resolve();
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
			await Promise.resolve();
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
			await Promise.resolve();
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
			await Promise.resolve();
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
			await Promise.resolve();
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
			await Promise.resolve();
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
			await Promise.resolve();
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
				await Promise.resolve();
				throw mockResponseError;
			});

			const { btcAddPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcAddPendingTransaction(btcAddPendingTransactionParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if btc_add_pending_transaction returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_add_pending_transaction.mockResolvedValue({ test: 'unexpected' });

			const { btcAddPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcAddPendingTransaction(btcAddPendingTransactionParams);

			await expect(res).rejects.toThrow();
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
				await Promise.resolve();
				throw mockResponseError;
			});

			const { btcGetPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetPendingTransaction(btcGetPendingTransactionParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if btc_get_pending_transactions returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_get_pending_transactions.mockResolvedValue({ test: 'unexpected' });

			const { btcGetPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetPendingTransaction(btcGetPendingTransactionParams);

			await expect(res).rejects.toThrow();
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
				await Promise.resolve();
				throw mockResponseError;
			});

			const { btcSelectUserUtxosFee } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcSelectUserUtxosFee(btcSelectUserUtxosFeeParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if btc_select_user_utxos_fee returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_select_user_utxos_fee.mockResolvedValue({ test: 'unexpected' });

			const { btcSelectUserUtxosFee } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcSelectUserUtxosFee(btcSelectUserUtxosFeeParams);

			await expect(res).rejects.toThrow();
		});
	});

	describe('allowSigning', () => {
		it('should allow signing', async () => {
			const response = { Ok: null };

			service.allow_signing.mockResolvedValue(response);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await allowSigning();

			expect(service.allow_signing).toHaveBeenCalledTimes(1);
			expect(res).toBeUndefined();
		});

		it('should throw an error if allowSigning throws', async () => {
			service.allow_signing.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			const res = allowSigning();

			await expect(res).rejects.toThrow(mockResponseError);
		});

		// We do not test all types of ApproveError:
		// - for simplicity
		// - because the utility mapIcrc2ApproveError, we are using to map those error types, is already covered by tests in ic-js
		// - and we do not differentiate the error in Oisy anyway
		it('should throw an ApproveError if allowSigning returns ApproveError', async () => {
			const response = { Err: { ApproveError: { TemporarilyUnavailable: null } } };

			service.allow_signing.mockResolvedValue(response);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(allowSigning()).rejects.toThrow(mapIcrc2ApproveError(response.Err.ApproveError));
		});

		it('should throw a CanisterInternalError if FailedToContactCyclesLedger error is returned', async () => {
			const response = { Err: { FailedToContactCyclesLedger: null } };

			service.allow_signing.mockResolvedValue(response);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(allowSigning()).rejects.toThrow(
				new CanisterInternalError('The Cycles Ledger cannot be contacted.')
			);
		});

		it('should throw a CanisterInternalError if Other error is returned', async () => {
			const errorMsg = 'Test error';
			const response = { Err: { Other: errorMsg } };

			service.allow_signing.mockResolvedValue(response);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(allowSigning()).rejects.toThrow(new CanisterInternalError(errorMsg));
		});

		it('should throw an unknown AllowSigningError if unrecognized error is returned', async () => {
			const response = { Err: { UnrecognizedError: 'Some unknown error' } };

			service.allow_signing.mockResolvedValue(response as unknown as Result_2);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(allowSigning()).rejects.toThrow(
				new CanisterInternalError('Unknown AllowSigningError')
			);
		});
	});

	describe('addUserHiddenDappId', () => {
		it('should add user hidden dapp id', async () => {
			const response = { Ok: null };

			service.add_user_hidden_dapp_id.mockResolvedValue(response);

			const { addUserHiddenDappId } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await addUserHiddenDappId({ dappId: 'test-dapp-id' });

			expect(service.add_user_hidden_dapp_id).toHaveBeenCalledWith({
				dapp_id: 'test-dapp-id',
				current_user_version: []
			});
			expect(res).toBeUndefined();
		});

		it('should throw an error if add_user_hidden_dapp_id throws', async () => {
			service.add_user_hidden_dapp_id.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { addUserHiddenDappId } = await createBackendCanister({
				serviceOverride: service
			});

			const res = addUserHiddenDappId({ dappId: 'test-dapp-id' });

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('setUserShowTestnets', () => {
		it('should set user show testnets', async () => {
			const response = { Ok: null };

			service.set_user_show_testnets.mockResolvedValue(response);

			const { setUserShowTestnets } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await setUserShowTestnets({
				showTestnets: true
			});

			expect(service.set_user_show_testnets).toHaveBeenCalledWith({
				show_testnets: true,
				current_user_version: []
			});
			expect(res).toBeUndefined();
		});

		it('should throw an error if set_user_show_testnets throws', async () => {
			service.set_user_show_testnets.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { setUserShowTestnets } = await createBackendCanister({
				serviceOverride: service
			});

			const res = setUserShowTestnets({
				showTestnets: true
			});

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});
});
