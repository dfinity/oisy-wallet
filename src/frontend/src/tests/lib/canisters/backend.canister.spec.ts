import type {
	AllowSigningResult,
	_SERVICE as BackendService,
	CustomToken,
	IcrcToken,
	UserProfile,
	UserToken
} from '$declarations/backend/backend.did';

import { BackendCanister } from '$lib/canisters/backend.canister';
import {
	ChallengeCompletionErrorEnum,
	CreateChallengeEnum,
	PowChallengeError,
	PowCreateChallengeError
} from '$lib/canisters/backend.errors';
import { CanisterInternalError } from '$lib/canisters/errors';
import { ZERO } from '$lib/constants/app.constants';
import type { AddUserCredentialParams, BtcSelectUserUtxosFeeParams } from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { getMockContacts } from '$tests/mocks/contacts.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { mockUserAgreements } from '$tests/mocks/user-agreements.mock';
import { mockUserNetworks } from '$tests/mocks/user-networks.mock';
import { mockDefinedUserAgreements, mockUserNetworksMap } from '$tests/mocks/user-profile.mock';
import type { ActorSubclass } from '@dfinity/agent';
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
		currentUserVersion: ZERO,
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
			expect(res).toBeTruthy();
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

		it('should throw an error if btc_add_pending_transaction returns a generic canister error', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_add_pending_transaction.mockResolvedValue({ Err: { CanisterError: null } });

			const { btcAddPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcAddPendingTransaction(btcAddPendingTransactionParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError('Unknown BtcAddPendingTransactionError')
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

		it('should throw an error if btc_select_user_utxos_fee returns a pending-transactions error', async () => {
			service.btc_select_user_utxos_fee.mockResolvedValue({ Err: { PendingTransactions: null } });

			const { btcSelectUserUtxosFee } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcSelectUserUtxosFee(btcSelectUserUtxosFeeParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError(
					'Selecting utxos fee is not possible - pending transactions found.'
				)
			);
		});

		it('should throw an error if btc_select_user_utxos_fee returns a generic canister error', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_select_user_utxos_fee.mockResolvedValue({ Err: { CanisterError: null } });

			const { btcSelectUserUtxosFee } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcSelectUserUtxosFee(btcSelectUserUtxosFeeParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError('Unknown BtcSelectUserUtxosFeeError')
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

	describe('getAllowedCycles', () => {
		it('should return allowed cycles when response is successful', async () => {
			const mockAllowedCycles = 1000000n;

			service.get_allowed_cycles.mockResolvedValue({
				Ok: { allowed_cycles: mockAllowedCycles }
			});

			const { getAllowedCycles } = await createBackendCanister({
				serviceOverride: service
			});

			const result = await getAllowedCycles();

			expect(service.get_allowed_cycles).toHaveBeenCalledOnce();
			expect(result).toEqual({ allowed_cycles: mockAllowedCycles });
		});

		it('should throw CanisterInternalError when FailedToContactCyclesLedger error is returned', async () => {
			service.get_allowed_cycles.mockResolvedValue({
				Err: { FailedToContactCyclesLedger: null }
			});

			const { getAllowedCycles } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(getAllowedCycles()).rejects.toThrow(
				new CanisterInternalError('The Cycles Ledger cannot be contacted.')
			);
		});

		it('should throw CanisterInternalError with custom message when Other error is returned', async () => {
			const errorMsg = 'Custom error message';
			service.get_allowed_cycles.mockResolvedValue({
				Err: { Other: errorMsg }
			});

			const { getAllowedCycles } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(getAllowedCycles()).rejects.toThrow(new CanisterInternalError(errorMsg));
		});

		it('should throw CanisterInternalError with custom message when a generic canister error is returned', async () => {
			// @ts-expect-error we test this in purposes
			service.get_allowed_cycles.mockResolvedValue({ Err: { CanisterError: null } });

			const { getAllowedCycles } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(getAllowedCycles()).rejects.toThrow(
				new CanisterInternalError('Unknown GetAllowedCyclesError')
			);
		});

		it('should throw unknown GetAllowedCyclesError for unrecognized errors', async () => {
			service.get_allowed_cycles.mockResolvedValue({
				Err: { Other: 'Some unknown error' }
			});

			const { getAllowedCycles } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(getAllowedCycles()).rejects.toThrow(
				new CanisterInternalError('Some unknown error')
			);
		});

		it('should throw an error if get_allowed_cycles throws', async () => {
			service.get_allowed_cycles.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getAllowedCycles } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(getAllowedCycles()).rejects.toThrow(mockResponseError);
		});
	});

	describe('allowSigning', () => {
		it('should allow signing', async () => {
			const result: AllowSigningResult = {
				Ok: {
					status: { Executed: null },
					challenge_completion: [],
					allowed_cycles: ZERO
				}
			};

			service.allow_signing.mockResolvedValue(result);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await allowSigning();

			expect(service.allow_signing).toHaveBeenCalledOnce();
			expect(res).toBeDefined();
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

		it.each([
			{
				errorName: 'InvalidNonce',
				error: { InvalidNonce: null },
				code: ChallengeCompletionErrorEnum.InvalidNonce
			},
			{
				errorName: 'MissingChallenge',
				error: { MissingChallenge: null },
				code: ChallengeCompletionErrorEnum.MissingChallenge
			},
			{
				errorName: 'ExpiredChallenge',
				error: { ExpiredChallenge: null },
				code: ChallengeCompletionErrorEnum.ExpiredChallenge
			},
			{
				errorName: 'MissingUserProfile',
				error: { MissingUserProfile: null },
				code: ChallengeCompletionErrorEnum.MissingUserProfile
			},
			{
				errorName: 'ChallengeAlreadySolved',
				error: { ChallengeAlreadySolved: null },
				code: ChallengeCompletionErrorEnum.ChallengeAlreadySolved
			}
		])(
			'should throw PowChallengeError with appropriate code if PowChallenge error $errorName is returned',
			async ({ error, code }) => {
				service.allow_signing.mockResolvedValue({ Err: { PowChallenge: error } });

				const { allowSigning } = await createBackendCanister({
					serviceOverride: service
				});

				const result = allowSigning();

				await expect(result).rejects.toBeInstanceOf(PowChallengeError);

				await result.catch((err) => {
					expect(err).toBeInstanceOf(PowChallengeError);
					expect((err as PowChallengeError).code).toEqual(code);
				});
			}
		);

		it('should throw a CanisterInternalError if Other error is returned', async () => {
			const errorMsg = 'Test error';
			const response = { Err: { Other: errorMsg } };

			service.allow_signing.mockResolvedValue(response);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(allowSigning()).rejects.toThrow(new CanisterInternalError(errorMsg));
		});

		it('should throw a CanisterInternalError with message if unrecognized error is returned', async () => {
			const response = { Err: { UnrecognizedError: 'Some unknown error' } };

			service.allow_signing.mockResolvedValue(response as unknown as AllowSigningResult);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(allowSigning()).rejects.toThrow(
				new CanisterInternalError('An uknown error occurred.')
			);
		});
	});

	describe('createPowChallenge', () => {
		const mockPowChallengeSuccess = {
			start_timestamp_ms: 1_644_001_000_000n,
			expiry_timestamp_ms: 1_644_001_001_200n,
			difficulty: 1_000_000
		};

		let backendCanister: BackendCanister;

		beforeEach(async () => {
			backendCanister = await createBackendCanister({ serviceOverride: service });
		});

		it('should successfully create a PoW challenge (Ok case)', async () => {
			service.create_pow_challenge.mockResolvedValue({ Ok: mockPowChallengeSuccess });

			const result = await backendCanister.createPowChallenge();

			expect(service.create_pow_challenge).toHaveBeenCalled();
			expect(result).toEqual(mockPowChallengeSuccess);
		});

		it('should handle challenge already in progress error', async () => {
			service.create_pow_challenge.mockResolvedValue({
				Err: { ChallengeInProgress: null }
			});

			await expect(backendCanister.createPowChallenge()).rejects.toThrow(
				new PowCreateChallengeError(
					'Challenge is already in progress.',
					CreateChallengeEnum.ChallengeInProgress
				)
			);

			expect(service.create_pow_challenge).toHaveBeenCalled();
		});

		it('should handle randomness generation error', async () => {
			service.create_pow_challenge.mockResolvedValue({
				Err: { RandomnessError: 'Failed to generate randomness' }
			});

			await expect(backendCanister.createPowChallenge()).rejects.toThrow(
				new CanisterInternalError('Could not generate randomness.')
			);

			expect(service.create_pow_challenge).toHaveBeenCalled();
		});

		it('should handle missing user profile error', async () => {
			service.create_pow_challenge.mockResolvedValue({
				Err: { MissingUserProfile: null }
			});

			await expect(backendCanister.createPowChallenge()).rejects.toThrow(
				new CanisterInternalError('User profile is missing.')
			);

			expect(service.create_pow_challenge).toHaveBeenCalled();
		});

		it('should handle other unexpected errors', async () => {
			const errorMsg = 'Unexpected error occurred.';
			service.create_pow_challenge.mockResolvedValue({
				Err: { Other: errorMsg }
			});

			await expect(backendCanister.createPowChallenge()).rejects.toThrow(
				new CanisterInternalError('An other error occurred.')
			);

			expect(service.create_pow_challenge).toHaveBeenCalled();
		});

		it('should handle a generic canister error', async () => {
			// @ts-expect-error we test this in purposes
			service.create_pow_challenge.mockResolvedValue({ Err: { CanisterError: null } });

			await expect(backendCanister.createPowChallenge()).rejects.toThrow(
				new CanisterInternalError('An uknown error occurred.')
			);

			expect(service.create_pow_challenge).toHaveBeenCalled();
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

	describe('updateUserNetworkSettings', () => {
		it('should update user network settings', async () => {
			const response = { Ok: null };

			service.update_user_network_settings.mockResolvedValue(response);

			const { updateUserNetworkSettings } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await updateUserNetworkSettings({
				networks: mockUserNetworks
			});

			expect(service.update_user_network_settings).toHaveBeenCalledWith({
				networks: mockUserNetworksMap,
				current_user_version: []
			});
			expect(res).toBeUndefined();
		});

		it('should throw an error if update_user_network_settings throws', async () => {
			service.update_user_network_settings.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { updateUserNetworkSettings } = await createBackendCanister({
				serviceOverride: service
			});

			const res = updateUserNetworkSettings({
				networks: mockUserNetworks
			});

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('updateUserAgreements', () => {
		it('should update user agreements', async () => {
			const response = { Ok: null };

			service.update_user_agreements.mockResolvedValue(response);

			const { updateUserAgreements } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await updateUserAgreements({
				agreements: mockUserAgreements
			});

			expect(service.update_user_agreements).toHaveBeenCalledWith({
				agreements: mockDefinedUserAgreements.agreements,
				current_user_version: []
			});
			expect(res).toBeUndefined();
		});

		it('should throw an error if update_user_agreements throws', async () => {
			service.update_user_agreements.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { updateUserAgreements } = await createBackendCanister({
				serviceOverride: service
			});

			const res = updateUserAgreements({
				agreements: mockUserAgreements
			});

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('getContact', () => {
		it('should call get_contact service', async () => {
			const [mockContact] = getMockContacts({ n: 1 });
			const response = { Ok: mockContact };

			service.get_contact.mockResolvedValue(response);

			const { getContact } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await getContact(1n);

			expect(service.get_contact).toHaveBeenCalledWith(1n);
			expect(res).toEqual(mockContact);
		});

		it('should throw an error if get_contact throws', async () => {
			service.get_contact.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getContact } = await createBackendCanister({
				serviceOverride: service
			});

			const res = getContact(1n);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('getContacts', () => {
		it('should call get_contacts service', async () => {
			const mockContacts = getMockContacts({ n: 4 });
			const response = { Ok: mockContacts };

			service.get_contacts.mockResolvedValue(response);

			const { getContacts } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await getContacts();

			expect(service.get_contacts).toHaveBeenCalledOnce();
			expect(res).toEqual(mockContacts);
		});

		it('should throw an error if get_contact throws', async () => {
			service.get_contacts.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getContacts } = await createBackendCanister({
				serviceOverride: service
			});

			const res = getContacts();

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('createContact', () => {
		it('should call create_contact service', async () => {
			const [mockContact] = getMockContacts({ n: 1, names: ['John'] });
			const response = { Ok: mockContact };

			service.create_contact.mockResolvedValue(response);

			const { createContact } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await createContact('John');

			expect(service.create_contact).toHaveBeenCalledWith({ name: 'John', image: [] });
			expect(res).toEqual(mockContact);
		});

		it('should throw an error if create_contact throws', async () => {
			service.create_contact.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { createContact } = await createBackendCanister({
				serviceOverride: service
			});

			const res = createContact('John');

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('delete_contact', () => {
		it('should call delete_contact service', async () => {
			const response = { Ok: 1n };

			service.delete_contact.mockResolvedValue(response);

			const { deleteContact } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await deleteContact(1n);

			expect(service.delete_contact).toHaveBeenCalledWith(1n);
			expect(res).toEqual(1n);
		});

		it('should throw an error if delete_contact throws', async () => {
			service.delete_contact.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { deleteContact } = await createBackendCanister({
				serviceOverride: service
			});

			const res = deleteContact(1n);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('update_contact', () => {
		it('should call update_contact service', async () => {
			const [mockContact] = getMockContacts({ n: 1, names: ['John'] });
			const response = { Ok: mockContact };

			service.update_contact.mockResolvedValue(response);

			const { updateContact } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await updateContact(mockContact);

			expect(service.update_contact).toHaveBeenCalledWith(mockContact);
			expect(res).toEqual(mockContact);
		});

		it('should throw an error if update_contact throws', async () => {
			const [mockContact] = getMockContacts({ n: 1, names: ['John'] });
			service.update_contact.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { updateContact } = await createBackendCanister({
				serviceOverride: service
			});

			const res = updateContact(mockContact);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('removeUserToken', () => {
		it('should call remove_user_token method', async () => {
			const params = {
				chain_id: mockedUserToken.chain_id,
				contract_address: mockedUserToken.contract_address
			};
			const response = undefined;

			service.remove_user_token.mockResolvedValue(response);

			const { removeUserToken } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await removeUserToken(params);

			expect(service.remove_user_token).toHaveBeenCalledWith(params);
			expect(res).toEqual(response);
		});

		it('should throw an error if remove_user_token throws', async () => {
			service.remove_user_token.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { removeUserToken } = await createBackendCanister({
				serviceOverride: service
			});

			const res = removeUserToken({
				chain_id: mockedUserToken.chain_id,
				contract_address: mockedUserToken.contract_address
			});

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('removeCustomToken', () => {
		it('should call remove_custom_token method', async () => {
			const params = {
				token: mockedCustomToken
			};
			const response = undefined;

			service.remove_custom_token.mockResolvedValue(response);

			const { removeCustomToken } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await removeCustomToken(params);

			expect(service.remove_custom_token).toHaveBeenCalledWith(params.token);
			expect(res).toEqual(response);
		});

		it('should throw an error if remove_custom_token throws', async () => {
			service.remove_custom_token.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { removeCustomToken } = await createBackendCanister({
				serviceOverride: service
			});

			const res = removeCustomToken({
				token: mockedCustomToken
			});

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('btc_get_current_fee_percentiles', () => {
		const btcGetFeePercentilesParams = {
			network: btcAddPendingTransactionParams.network
		};

		it('should return fee percentiles with success response', async () => {
			const response = {
				Ok: {
					fee_percentiles: [5n, 10n, 15n, 20n, 30n]
				}
			};

			service.btc_get_current_fee_percentiles.mockResolvedValue(response);

			const { btcGetCurrentFeePercentiles } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await btcGetCurrentFeePercentiles(btcGetFeePercentilesParams);

			expect(service.btc_get_current_fee_percentiles).toHaveBeenCalledWith(
				btcGetFeePercentilesParams
			);
			expect(res).toEqual(response.Ok);
		});

		it('should throw an error if btc_get_current_fee_percentiles returns an internal error', async () => {
			service.btc_get_current_fee_percentiles.mockResolvedValue(errorResponse);

			const { btcGetCurrentFeePercentiles } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetCurrentFeePercentiles(btcGetFeePercentilesParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError(errorResponse.Err.InternalError.msg)
			);
		});

		it('should throw an error if btc_get_current_fee_percentiles returns a pending-transactions error', async () => {
			service.btc_get_current_fee_percentiles.mockResolvedValue({
				Err: { PendingTransactions: null }
			});

			const { btcGetCurrentFeePercentiles } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetCurrentFeePercentiles(btcGetFeePercentilesParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError(
					'Selecting utxos fee is not possible - pending transactions found.'
				)
			);
		});

		it('should throw an error if btc_get_current_fee_percentiles returns a generic canister error', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_get_current_fee_percentiles.mockResolvedValue({ Err: { CanisterError: null } });

			const { btcGetCurrentFeePercentiles } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetCurrentFeePercentiles(btcGetFeePercentilesParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError('Unknown BtcSelectUserUtxosFeeError')
			);
		});

		it('should throw an error if btc_get_current_fee_percentiles throws', async () => {
			service.btc_get_current_fee_percentiles.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { btcGetCurrentFeePercentiles } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetCurrentFeePercentiles(btcGetFeePercentilesParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if btc_get_current_fee_percentiles returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_get_current_fee_percentiles.mockResolvedValue({ test: 'unexpected' });

			const { btcGetCurrentFeePercentiles } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetCurrentFeePercentiles(btcGetFeePercentilesParams);

			await expect(res).rejects.toThrow();
		});
	});
});
