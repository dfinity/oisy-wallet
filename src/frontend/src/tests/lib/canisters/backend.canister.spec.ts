import type {
	AllowSigningResponse,
	AllowSigningResult,
	_SERVICE as BackendService,
	BtcAddPendingTransactionResult,
	BtcGetPendingTransactionsResult,
	CustomToken,
	IcrcToken,
	SignOnramperWidgetUrlResult,
	UserProfile
} from '$declarations/backend/backend.did';
import { BackendCanister } from '$lib/canisters/backend.canister';
import {
	CanisterInternalError,
	OnramperRateLimitedError,
	OnramperSecretNotConfiguredError
} from '$lib/canisters/errors';
import { ZERO } from '$lib/constants/app.constants';
import type { BtcAddPendingTransactionParams } from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import {
	mockActiveUserTransaction,
	mockActiveUserTransactionData,
	mockActiveUserTransactionErrorNotFound,
	mockActiveUserTransactionId,
	mockActiveUserTransactionRef,
	mockCreateActiveUserTransactionParams,
	mockUpdateActiveUserTransactionParams
} from '$tests/mocks/active-user-transactions.mock';
import { getMockContacts } from '$tests/mocks/contacts.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { mockIIDelegationChain } from '$tests/mocks/ii-delegation.mock';
import { mockUserAgreements } from '$tests/mocks/user-agreements.mock';
import {
	mockUserExperimentalFeatures,
	mockUserExperimentalFeaturesMap
} from '$tests/mocks/user-experimental-features.mock';
import { mockUserNetworks } from '$tests/mocks/user-networks.mock';
import {
	mockDefinedUserAgreements,
	mockProviderAgreements,
	mockUserNetworksMap,
	mockUserProviderAgreements
} from '$tests/mocks/user-profile.mock';
import {
	mockCandidGetUserTransactionsResponse,
	mockGetUserTransactionsResponse,
	mockUserTransaction,
	mockUserTransactionTokenId
} from '$tests/mocks/user-transactions.mock';
import { toNullable } from '@dfinity/utils';
import { mapIcrc2ApproveError } from '@icp-sdk/canisters/ledger/icp';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
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
			canisterId: Principal.fromText('d3nvo-aaaaa-aaaar-qagzq-cai'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});
	const service = mock<ActorSubclass<BackendService>>();
	const mockResponseError = new Error('Test response error');
	const queryParams = {
		certified: false
	};

	const btcAddPendingTransactionParams: BtcAddPendingTransactionParams = {
		txId: Uint8Array.from([1, 2, 3]),
		network: { testnet: null },
		utxos: [
			{
				height: 1000,
				value: 1n,
				outpoint: {
					txid: Uint8Array.from([1, 2, 3]),
					vout: 1
				}
			}
		],
		iiDelegationChain: mockIIDelegationChain
	};
	const btcAddPendingTransactionEndpointParams = {
		txid: btcAddPendingTransactionParams.txId,
		network: btcAddPendingTransactionParams.network,
		utxos: btcAddPendingTransactionParams.utxos,
		ii_delegation_chain: btcAddPendingTransactionParams.iiDelegationChain
	};

	const btcGetPendingTransactionParams = {
		network: btcAddPendingTransactionParams.network,
		iiDelegationChain: mockIIDelegationChain
	};

	const btcGetPendingTransactionEndpointParams = {
		network: btcGetPendingTransactionParams.network,
		ii_delegation_chain: btcGetPendingTransactionParams.iiDelegationChain
	};

	const mockedUserProfile = {
		version: [],
		created_timestamp: 1n,
		updated_timestamp: 1n
	} as UserProfile;

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

	it('returns custom tokens', async () => {
		service.list_custom_tokens.mockResolvedValue(customTokens);

		const { listCustomTokens } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await listCustomTokens();

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

		const res = listCustomTokens();

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

	it('creates user profile', async () => {
		const response = { Ok: mockedUserProfile };
		service.create_user_profile.mockResolvedValue(response);

		const { createUserProfile } = await createBackendCanister({
			serviceOverride: service
		});

		const res = await createUserProfile();

		expect(res).toEqual(response);
	});

	it('should throw SignupsClosedError when backend returns SignupsClosed', async () => {
		service.create_user_profile.mockResolvedValue({ Err: { SignupsClosed: null } });

		const { createUserProfile } = await createBackendCanister({
			serviceOverride: service
		});

		const { SignupsClosedError } = await import('$lib/types/errors');

		await expect(createUserProfile()).rejects.toThrow(SignupsClosedError);
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

		it('should return rateLimitInfo if RateLimited error is returned', async () => {
			const response = {
				Err: { RateLimited: { max_calls: 5, window_ns: 60_000_000_000n, caller: mockPrincipal } }
			};

			service.btc_add_pending_transaction.mockResolvedValue(
				response as unknown as BtcAddPendingTransactionResult
			);

			const { btcAddPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await btcAddPendingTransaction(btcAddPendingTransactionParams);

			expect(service.btc_add_pending_transaction).toHaveBeenCalledWith(
				btcAddPendingTransactionEndpointParams
			);
			expect(res).toStrictEqual({
				response: true,
				rateLimitInfo: {
					endpoint: 'btc_add_pending_transaction',
					limiter: 'BTC_ADD_PENDING_TX_RATE_LIMITER'
				}
			});
		});

		it('should throw a CanisterInternalError if InvalidDelegationChain error is returned', async () => {
			const response = {
				Err: { InvalidDelegationChain: { msg: 'chain expired' } }
			};

			service.btc_add_pending_transaction.mockResolvedValue(
				response as unknown as BtcAddPendingTransactionResult
			);

			const { btcAddPendingTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(btcAddPendingTransaction(btcAddPendingTransactionParams)).rejects.toThrow(
				new CanisterInternalError('II delegation chain verification failed: chain expired')
			);
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

			const { btcGetPendingTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await btcGetPendingTransactions(btcGetPendingTransactionParams);

			expect(service.btc_get_pending_transactions).toHaveBeenCalledWith(
				btcGetPendingTransactionEndpointParams
			);
			expect(res).toEqual({ response: response.Ok.transactions });
		});

		it('should throw an error if btc_get_pending_transactions returns an internal error', async () => {
			service.btc_get_pending_transactions.mockResolvedValue(errorResponse);

			const { btcGetPendingTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetPendingTransactions(btcGetPendingTransactionParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError(errorResponse.Err.InternalError.msg)
			);
		});

		it('should throw an error if btc_get_pending_transactions throws', async () => {
			service.btc_get_pending_transactions.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { btcGetPendingTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetPendingTransactions(btcGetPendingTransactionParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if btc_get_pending_transactions returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_get_pending_transactions.mockResolvedValue({ test: 'unexpected' });

			const { btcGetPendingTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetPendingTransactions(btcGetPendingTransactionParams);

			await expect(res).rejects.toThrow();
		});

		it('should return rateLimitInfo if RateLimited error is returned', async () => {
			const response = {
				Err: { RateLimited: { max_calls: 5, window_ns: 60_000_000_000n, caller: mockPrincipal } }
			};

			service.btc_get_pending_transactions.mockResolvedValue(
				response as unknown as BtcGetPendingTransactionsResult
			);

			const { btcGetPendingTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await btcGetPendingTransactions(btcGetPendingTransactionParams);

			expect(service.btc_get_pending_transactions).toHaveBeenCalledWith(
				btcGetPendingTransactionEndpointParams
			);
			expect(res).toStrictEqual({
				response: [],
				rateLimitInfo: {
					endpoint: 'btc_get_pending_transactions',
					limiter: 'BTC_GET_PENDING_TX_RATE_LIMITER'
				}
			});
		});

		it('should throw a CanisterInternalError if InvalidDelegationChain error is returned', async () => {
			const response = {
				Err: { InvalidDelegationChain: { msg: 'chain expired' } }
			};

			service.btc_get_pending_transactions.mockResolvedValue(
				response as unknown as BtcGetPendingTransactionsResult
			);

			const { btcGetPendingTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(btcGetPendingTransactions(btcGetPendingTransactionParams)).rejects.toThrow(
				new CanisterInternalError('II delegation chain verification failed: chain expired')
			);
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

	describe('signOnramperWidgetUrl', () => {
		const signOnramperWidgetUrlParams = {
			wallets: [{ cryptoId: 'btc' as const, wallet: 'bc1q-user' }],
			networkWallets: [{ networkId: 'bitcoin' as const, wallet: 'bc1q-user' }],
			walletAddressTags: [{ cryptoId: 'xrp' as const, tag: 'destination-tag' }]
		};

		it('should sign Onramper widget URL parameters', async () => {
			const okResponse = {
				signature: 'a'.repeat(64),
				signed_query:
					'networkWallets=bitcoin:bc1q-user&walletAddressTags=xrp:destination-tag&wallets=btc:bc1q-user'
			};
			const result: SignOnramperWidgetUrlResult = { Ok: okResponse };

			service.sign_onramper_widget_url.mockResolvedValue(result);

			const { signOnramperWidgetUrl } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await signOnramperWidgetUrl(signOnramperWidgetUrlParams);

			expect(service.sign_onramper_widget_url).toHaveBeenCalledExactlyOnceWith({
				wallets: [{ key: 'btc', value: 'bc1q-user' }],
				network_wallets: [{ key: 'bitcoin', value: 'bc1q-user' }],
				wallet_address_tags: [{ key: 'xrp', value: 'destination-tag' }]
			});
			expect(res).toStrictEqual(okResponse);
		});

		it('should throw an OnramperSecretNotConfiguredError if the signing secret is missing', async () => {
			service.sign_onramper_widget_url.mockResolvedValue({
				Err: { SecretNotConfigured: null }
			});

			const { signOnramperWidgetUrl } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(signOnramperWidgetUrl(signOnramperWidgetUrlParams)).rejects.toThrow(
				new OnramperSecretNotConfiguredError(
					'OnRamper signing secret is not configured on the backend canister.'
				)
			);
		});

		it('should throw an OnramperRateLimitedError if the signing endpoint rate-limits', async () => {
			service.sign_onramper_widget_url.mockResolvedValue({
				Err: { RateLimited: { max_calls: 30, window_ns: 60_000_000_000n, caller: mockPrincipal } }
			});

			const { signOnramperWidgetUrl } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(signOnramperWidgetUrl(signOnramperWidgetUrlParams)).rejects.toThrow(
				new OnramperRateLimitedError(
					'Rate limit exceeded. Maximum of 30 calls allowed every 60 seconds.'
				)
			);
		});
	});

	describe('allowSigning', () => {
		const allowSigningParams = { iiDelegationChain: mockIIDelegationChain };

		it('should allow signing', async () => {
			const okResponse: AllowSigningResponse = {
				status: { Executed: null },
				allowed_cycles: ZERO
			};

			const result: AllowSigningResult = { Ok: okResponse };

			service.allow_signing.mockResolvedValue(result);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await allowSigning(allowSigningParams);

			expect(service.allow_signing).toHaveBeenCalledOnce();
			expect(res).toStrictEqual({ response: okResponse });
		});

		it('should throw an error if allowSigning throws', async () => {
			service.allow_signing.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			const res = allowSigning(allowSigningParams);

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

			await expect(allowSigning(allowSigningParams)).rejects.toThrow(
				mapIcrc2ApproveError(response.Err.ApproveError)
			);
		});

		it('should throw a CanisterInternalError if FailedToContactCyclesLedger error is returned', async () => {
			const response = { Err: { FailedToContactCyclesLedger: null } };

			service.allow_signing.mockResolvedValue(response);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(allowSigning(allowSigningParams)).rejects.toThrow(
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

			await expect(allowSigning(allowSigningParams)).rejects.toThrow(
				new CanisterInternalError(errorMsg)
			);
		});

		it('should throw a CanisterInternalError with message if unrecognized error is returned', async () => {
			const response = { Err: { UnrecognizedError: 'Some unknown error' } };

			service.allow_signing.mockResolvedValue(response as unknown as AllowSigningResult);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(allowSigning(allowSigningParams)).rejects.toThrow(
				new CanisterInternalError('Unknown AllowSigningError')
			);
		});

		it('should return rateLimitInfo if RateLimited error is returned', async () => {
			const response = {
				Err: { RateLimited: { max_calls: 5, window_ns: 60_000_000_000n, caller: mockPrincipal } }
			};

			service.allow_signing.mockResolvedValue(response as unknown as AllowSigningResult);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await allowSigning(allowSigningParams);

			expect(service.allow_signing).toHaveBeenCalledOnce();
			expect(res).toStrictEqual({
				response: {
					status: { Skipped: null },
					allowed_cycles: ZERO
				},
				rateLimitInfo: {
					endpoint: 'allow_signing',
					limiter: 'ALLOW_SIGNING_RATE_LIMITER'
				}
			});
		});

		it('should return rateLimitInfo if RateLimitedByGuard error is returned', async () => {
			const response = {
				Err: {
					RateLimitedByGuard: {
						max_calls: 10,
						window_ns: 60_000_000_000_000n,
						caller: mockPrincipal
					}
				}
			};

			service.allow_signing.mockResolvedValue(response as unknown as AllowSigningResult);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await allowSigning(allowSigningParams);

			expect(service.allow_signing).toHaveBeenCalledOnce();
			expect(res).toStrictEqual({
				response: {
					status: { Skipped: null },
					allowed_cycles: ZERO
				},
				rateLimitInfo: {
					endpoint: 'allow_signing',
					limiter: 'ALLOW_SIGNING_GUARD_LIMITER'
				}
			});
		});

		it('should throw a CanisterInternalError if InvalidDelegationChain error is returned', async () => {
			const response = {
				Err: { InvalidDelegationChain: { msg: 'chain expired' } }
			};

			service.allow_signing.mockResolvedValue(response as unknown as AllowSigningResult);

			const { allowSigning } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(allowSigning(allowSigningParams)).rejects.toThrow(
				new CanisterInternalError('II delegation chain verification failed: chain expired')
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

	describe('addUserDismissedNotification', () => {
		it('should add user dismissed notifications', async () => {
			const response = { Ok: null };

			service.add_user_dismissed_notification.mockResolvedValue(response);

			const { addUserDismissedNotification } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await addUserDismissedNotification({
				notifications: [
					{ Simple: { kind: { BtcActivityInfo: null }, version: 1 } },
					{ Qualified: { kind: { NoIndexCanister: null }, qualifier: 'ETH', version: 1 } }
				]
			});

			expect(service.add_user_dismissed_notification).toHaveBeenCalledWith({
				notifications: [
					{ Simple: { kind: { BtcActivityInfo: null }, version: 1 } },
					{ Qualified: { kind: { NoIndexCanister: null }, qualifier: 'ETH', version: 1 } }
				],
				current_user_version: []
			});
			expect(res).toBeUndefined();
		});

		it('should pass current_user_version when provided', async () => {
			const response = { Ok: null };

			service.add_user_dismissed_notification.mockResolvedValue(response);

			const { addUserDismissedNotification } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await addUserDismissedNotification({
				notifications: [
					{ Qualified: { kind: { UnavailableIndexCanister: null }, qualifier: 'BTC', version: 1 } }
				],
				currentUserVersion: 3n
			});

			expect(service.add_user_dismissed_notification).toHaveBeenCalledWith({
				notifications: [
					{ Qualified: { kind: { UnavailableIndexCanister: null }, qualifier: 'BTC', version: 1 } }
				],
				current_user_version: [3n]
			});
			expect(res).toBeUndefined();
		});

		it('should throw an error if add_user_dismissed_notification throws', async () => {
			service.add_user_dismissed_notification.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { addUserDismissedNotification } = await createBackendCanister({
				serviceOverride: service
			});

			const res = addUserDismissedNotification({
				notifications: [{ Simple: { kind: { BtcActivityInfo: null }, version: 1 } }]
			});

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

	describe('updateUserExperimentalFeatureSettings', () => {
		it('should update user experimental feature settings', async () => {
			const response = { Ok: null };

			service.update_user_experimental_feature_settings.mockResolvedValue(response);

			const { updateUserExperimentalFeatureSettings } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await updateUserExperimentalFeatureSettings({
				experimentalFeatures: mockUserExperimentalFeatures
			});

			expect(service.update_user_experimental_feature_settings).toHaveBeenCalledWith({
				experimental_features: mockUserExperimentalFeaturesMap,
				current_user_version: []
			});
			expect(res).toBeUndefined();
		});

		it('should throw an error if update_user_experimental_feature_settings throws', async () => {
			service.update_user_experimental_feature_settings.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { updateUserExperimentalFeatureSettings } = await createBackendCanister({
				serviceOverride: service
			});

			const res = updateUserExperimentalFeatureSettings({
				experimentalFeatures: mockUserExperimentalFeatures
			});

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('updateUserTransactionFilterSettings', () => {
		it('should update user transaction filter settings', async () => {
			const response = { Ok: null };

			service.update_user_transaction_filter_settings.mockResolvedValue(response);

			const { updateUserTransactionFilterSettings } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await updateUserTransactionFilterSettings({
				hideMicroTransactions: true
			});

			expect(service.update_user_transaction_filter_settings).toHaveBeenCalledWith({
				filter: { hide_micro_transactions: true },
				current_user_version: []
			});
			expect(res).toBeUndefined();
		});

		it('should update user transaction filter settings with current user version', async () => {
			const response = { Ok: null };

			service.update_user_transaction_filter_settings.mockResolvedValue(response);

			const { updateUserTransactionFilterSettings } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await updateUserTransactionFilterSettings({
				hideMicroTransactions: false,
				currentUserVersion: 1n
			});

			expect(service.update_user_transaction_filter_settings).toHaveBeenCalledWith({
				filter: { hide_micro_transactions: false },
				current_user_version: [1n]
			});
			expect(res).toBeUndefined();
		});

		it('should throw an error if update_user_transaction_filter_settings throws', async () => {
			service.update_user_transaction_filter_settings.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { updateUserTransactionFilterSettings } = await createBackendCanister({
				serviceOverride: service
			});

			const res = updateUserTransactionFilterSettings({
				hideMicroTransactions: true
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

		it('should update partial user agreements', async () => {
			const response = { Ok: null };

			service.update_user_agreements.mockResolvedValue(response);

			const { updateUserAgreements } = await createBackendCanister({
				serviceOverride: service
			});

			const { licenseAgreement: _, ...agreements } = mockUserAgreements;

			const res = await updateUserAgreements({ agreements });

			expect(service.update_user_agreements).toHaveBeenCalledWith({
				agreements: {
					...mockDefinedUserAgreements.agreements,
					license_agreement: {
						accepted: toNullable(),
						last_accepted_at_ns: toNullable(),
						last_updated_at_ms: toNullable(),
						text_sha256: toNullable()
					}
				},
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

	describe('updateProviderAgreements', () => {
		it('should update provider agreements with mapped backend tuples', async () => {
			const response = { Ok: null };

			service.update_provider_agreements.mockResolvedValue(response);

			const { updateProviderAgreements } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await updateProviderAgreements({
				providerAgreements: mockUserProviderAgreements
			});

			expect(service.update_provider_agreements).toHaveBeenCalledWith({
				provider_agreements: mockProviderAgreements,
				current_user_version: []
			});
			expect(res).toBeUndefined();
		});

		it('should update provider agreements with version', async () => {
			const response = { Ok: null };

			service.update_provider_agreements.mockResolvedValue(response);

			const { updateProviderAgreements } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await updateProviderAgreements({
				providerAgreements: mockUserProviderAgreements,
				currentUserVersion: 1n
			});

			expect(service.update_provider_agreements).toHaveBeenCalledWith({
				provider_agreements: mockProviderAgreements,
				current_user_version: [1n]
			});
			expect(res).toBeUndefined();
		});

		it('should throw an error if update_provider_agreements throws', async () => {
			service.update_provider_agreements.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { updateProviderAgreements } = await createBackendCanister({
				serviceOverride: service
			});

			const res = updateProviderAgreements({
				providerAgreements: mockUserProviderAgreements
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
					fee_percentiles: BigUint64Array.from([5n, 10n, 15n, 20n, 30n])
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

		it('should throw an error if btc_get_current_fee_percentiles returns a generic canister error', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_get_current_fee_percentiles.mockResolvedValue({ Err: { CanisterError: null } });

			const { btcGetCurrentFeePercentiles } = await createBackendCanister({
				serviceOverride: service
			});

			const res = btcGetCurrentFeePercentiles(btcGetFeePercentilesParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError('Unknown BtcGetFeePercentilesError')
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

	describe('getUserTransactions', () => {
		const getUserTransactionsParams = {
			tokenId: mockUserTransactionTokenId,
			start: 5n,
			maxResults: 10n
		};

		it('should return user transactions with success response', async () => {
			service.get_user_transactions.mockResolvedValue({
				Ok: mockCandidGetUserTransactionsResponse
			});

			const { getUserTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await getUserTransactions(getUserTransactionsParams);

			expect(service.get_user_transactions).toHaveBeenCalledWith({
				token_id: mockUserTransactionTokenId,
				start: [5n],
				max_results: 10n
			});
			expect(res).toEqual(mockGetUserTransactionsResponse);
		});

		it('should pass empty array for start when undefined', async () => {
			service.get_user_transactions.mockResolvedValue({
				Ok: mockCandidGetUserTransactionsResponse
			});

			const { getUserTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			await getUserTransactions({ tokenId: mockUserTransactionTokenId, maxResults: 10n });

			expect(service.get_user_transactions).toHaveBeenCalledWith({
				token_id: mockUserTransactionTokenId,
				start: [],
				max_results: 10n
			});
		});

		it('should throw an error if get_user_transactions returns an error', async () => {
			service.get_user_transactions.mockResolvedValue(errorResponse);

			const { getUserTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(getUserTransactions(getUserTransactionsParams)).rejects.toEqual(
				errorResponse.Err
			);
		});

		it('should throw an error if get_user_transactions throws', async () => {
			service.get_user_transactions.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getUserTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(getUserTransactions(getUserTransactionsParams)).rejects.toThrow(
				mockResponseError
			);
		});
	});

	describe('saveUserTransactions', () => {
		const saveUserTransactionsParams = {
			tokenId: mockUserTransactionTokenId,
			transactions: [mockUserTransaction]
		};

		it('should save user transactions with success response', async () => {
			service.save_user_transactions.mockResolvedValue({ Ok: null });

			const { saveUserTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await saveUserTransactions(saveUserTransactionsParams);

			expect(service.save_user_transactions).toHaveBeenCalledWith({
				token_id: mockUserTransactionTokenId,
				transactions: [mockUserTransaction]
			});
			expect(res).toBeUndefined();
		});

		it('should throw an error if save_user_transactions returns an error', async () => {
			service.save_user_transactions.mockResolvedValue(errorResponse);

			const { saveUserTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(saveUserTransactions(saveUserTransactionsParams)).rejects.toEqual(
				errorResponse.Err
			);
		});

		it('should throw an error if save_user_transactions throws', async () => {
			service.save_user_transactions.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { saveUserTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(saveUserTransactions(saveUserTransactionsParams)).rejects.toThrow(
				mockResponseError
			);
		});
	});

	describe('getExchangeRate', () => {
		const tokenId = { Icrc: mockPrincipal };
		const mockCandidRate = {
			usd: {
				price: [42000] as [] | [number],
				price_24h_change_pct: [1.5] as [] | [number],
				market_cap: [800_000_000_000] as [] | [number],
				timestamp_ns: 1_000_000_000n
			}
		};

		const expectedUnwrapped = {
			usd: {
				price: 42000,
				price24hChangePct: 1.5,
				marketCap: 800_000_000_000,
				timestampNs: 1_000_000_000n
			}
		};

		it('should return fully unwrapped exchange rate for a token', async () => {
			service.get_exchange_rate.mockResolvedValue([mockCandidRate]);

			const { getExchangeRate } = await createBackendCanister({ serviceOverride: service });

			const result = await getExchangeRate({ token_id: tokenId, certified: false });

			expect(result).toEqual(expectedUnwrapped);
			expect(service.get_exchange_rate).toHaveBeenCalledExactlyOnceWith(tokenId);
		});

		it('should return undefined when no rate exists', async () => {
			service.get_exchange_rate.mockResolvedValue([]);

			const { getExchangeRate } = await createBackendCanister({ serviceOverride: service });

			const result = await getExchangeRate({ token_id: tokenId, certified: false });

			expect(result).toBeUndefined();
		});

		it('should unwrap nested optional fields as undefined', async () => {
			const partialCandidRate = {
				usd: {
					price: [100] as [] | [number],
					price_24h_change_pct: [] as [] | [number],
					market_cap: [] as [] | [number],
					timestamp_ns: 1_000_000_000n
				}
			};
			service.get_exchange_rate.mockResolvedValue([partialCandidRate]);

			const { getExchangeRate } = await createBackendCanister({ serviceOverride: service });

			const result = await getExchangeRate({ token_id: tokenId, certified: false });

			expect(result).toEqual({
				usd: {
					price: 100,
					price24hChangePct: undefined,
					marketCap: undefined,
					timestampNs: 1_000_000_000n
				}
			});
		});

		it('should throw an error if the service throws', async () => {
			service.get_exchange_rate.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getExchangeRate } = await createBackendCanister({ serviceOverride: service });

			await expect(getExchangeRate({ token_id: tokenId, certified: false })).rejects.toThrow(
				mockResponseError
			);
		});
	});

	describe('getExchangeRates', () => {
		const tokenIds = [{ Icrc: mockPrincipal }, { Erc20: ['0xabc', 1n] as [string, bigint] }];
		const mockCandidRate = {
			usd: {
				price: [42000] as [] | [number],
				price_24h_change_pct: [1.5] as [] | [number],
				market_cap: [800_000_000_000] as [] | [number],
				timestamp_ns: 1_000_000_000n
			}
		};

		const expectedUnwrapped = {
			usd: {
				price: 42000,
				price24hChangePct: 1.5,
				marketCap: 800_000_000_000,
				timestampNs: 1_000_000_000n
			}
		};

		it('should return the response paired with unwrapped rates', async () => {
			const rawResponse = tokenIds.map(
				(id) => [id, [mockCandidRate]] as [typeof id, [typeof mockCandidRate]]
			);
			service.get_exchange_rates.mockResolvedValue(rawResponse);

			const { getExchangeRates } = await createBackendCanister({ serviceOverride: service });

			const result = await getExchangeRates();

			expect(result).toEqual([
				[tokenIds[0], expectedUnwrapped],
				[tokenIds[1], expectedUnwrapped]
			]);
			expect(service.get_exchange_rates).toHaveBeenCalledExactlyOnceWith();
		});

		it('should map empty rates to undefined', async () => {
			service.get_exchange_rates.mockResolvedValue([
				[tokenIds[0], [mockCandidRate]],
				[tokenIds[1], []]
			]);

			const { getExchangeRates } = await createBackendCanister({ serviceOverride: service });

			const result = await getExchangeRates();

			expect(result).toEqual([
				[tokenIds[0], expectedUnwrapped],
				[tokenIds[1], undefined]
			]);
		});

		it('should throw an error if the service throws', async () => {
			service.get_exchange_rates.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getExchangeRates } = await createBackendCanister({ serviceOverride: service });

			await expect(getExchangeRates()).rejects.toThrow(mockResponseError);
		});
	});

	describe('createActiveUserTransaction', () => {
		const errorResponse = { Err: mockActiveUserTransactionErrorNotFound };

		it('should create the record and return the unwrapped value', async () => {
			service.create_active_user_transaction.mockResolvedValue({
				Ok: mockActiveUserTransaction
			});

			const { createActiveUserTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await createActiveUserTransaction(mockCreateActiveUserTransactionParams);

			expect(service.create_active_user_transaction).toHaveBeenCalledExactlyOnceWith({
				id: mockActiveUserTransactionId,
				data: mockActiveUserTransactionData,
				progress_step: ['submitting'],
				external_refs: []
			});
			expect(res).toEqual(mockActiveUserTransaction);
		});

		it('should pass empty array for progress_step when undefined', async () => {
			service.create_active_user_transaction.mockResolvedValue({
				Ok: mockActiveUserTransaction
			});

			const { createActiveUserTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			await createActiveUserTransaction({
				id: mockActiveUserTransactionId,
				data: mockActiveUserTransactionData,
				externalRefs: []
			});

			expect(service.create_active_user_transaction).toHaveBeenCalledExactlyOnceWith({
				id: mockActiveUserTransactionId,
				data: mockActiveUserTransactionData,
				progress_step: [],
				external_refs: []
			});
		});

		it('should throw if the canister returns Err', async () => {
			service.create_active_user_transaction.mockResolvedValue(errorResponse);

			const { createActiveUserTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(
				createActiveUserTransaction(mockCreateActiveUserTransactionParams)
			).rejects.toEqual(errorResponse.Err);
		});

		it('should rethrow if the canister call throws', async () => {
			service.create_active_user_transaction.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { createActiveUserTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(
				createActiveUserTransaction(mockCreateActiveUserTransactionParams)
			).rejects.toThrow(mockResponseError);
		});
	});

	describe('updateActiveUserTransaction', () => {
		const errorResponse = { Err: mockActiveUserTransactionErrorNotFound };

		it('should pass populated optionals through to the canister', async () => {
			service.update_active_user_transaction.mockResolvedValue({
				Ok: mockActiveUserTransaction
			});

			const { updateActiveUserTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await updateActiveUserTransaction(mockUpdateActiveUserTransactionParams);

			expect(service.update_active_user_transaction).toHaveBeenCalledExactlyOnceWith({
				id: mockActiveUserTransactionId,
				status: [{ Executing: null }],
				progress_step: ['settling'],
				external_refs: [[mockActiveUserTransactionRef]],
				error: []
			});
			expect(res).toEqual(mockActiveUserTransaction);
		});

		it('should pass empty arrays for all unset partial fields', async () => {
			service.update_active_user_transaction.mockResolvedValue({
				Ok: mockActiveUserTransaction
			});

			const { updateActiveUserTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			await updateActiveUserTransaction({ id: mockActiveUserTransactionId });

			expect(service.update_active_user_transaction).toHaveBeenCalledExactlyOnceWith({
				id: mockActiveUserTransactionId,
				status: [],
				progress_step: [],
				external_refs: [],
				error: []
			});
		});

		it('should throw if the canister returns Err', async () => {
			service.update_active_user_transaction.mockResolvedValue(errorResponse);

			const { updateActiveUserTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(
				updateActiveUserTransaction(mockUpdateActiveUserTransactionParams)
			).rejects.toEqual(errorResponse.Err);
		});
	});

	describe('deleteActiveUserTransaction', () => {
		const errorResponse = { Err: mockActiveUserTransactionErrorNotFound };

		it('should resolve to void on Ok', async () => {
			service.delete_active_user_transaction.mockResolvedValue({ Ok: null });

			const { deleteActiveUserTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await deleteActiveUserTransaction(mockActiveUserTransactionId);

			expect(service.delete_active_user_transaction).toHaveBeenCalledExactlyOnceWith(
				mockActiveUserTransactionId
			);
			expect(res).toBeUndefined();
		});

		it('should throw if the canister returns Err', async () => {
			service.delete_active_user_transaction.mockResolvedValue(errorResponse);

			const { deleteActiveUserTransaction } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(deleteActiveUserTransaction(mockActiveUserTransactionId)).rejects.toEqual(
				errorResponse.Err
			);
		});
	});

	describe('getActiveUserTransactions', () => {
		const errorResponse = { Err: mockActiveUserTransactionErrorNotFound };

		it('should return the unwrapped list of transactions', async () => {
			service.get_active_user_transactions.mockResolvedValue({
				Ok: { transactions: [mockActiveUserTransaction] }
			});

			const { getActiveUserTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await getActiveUserTransactions();

			expect(service.get_active_user_transactions).toHaveBeenCalledExactlyOnceWith();
			expect(res).toEqual([mockActiveUserTransaction]);
		});

		it('should return an empty array when the user has no records', async () => {
			service.get_active_user_transactions.mockResolvedValue({
				Ok: { transactions: [] }
			});

			const { getActiveUserTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			const res = await getActiveUserTransactions();

			expect(res).toEqual([]);
		});

		it('should throw if the canister returns Err', async () => {
			service.get_active_user_transactions.mockResolvedValue(errorResponse);

			const { getActiveUserTransactions } = await createBackendCanister({
				serviceOverride: service
			});

			await expect(getActiveUserTransactions()).rejects.toEqual(errorResponse.Err);
		});
	});
});
