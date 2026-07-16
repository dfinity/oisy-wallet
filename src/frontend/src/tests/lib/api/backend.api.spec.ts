import type { CustomToken, PendingTransaction, TokenId } from '$declarations/backend/backend.did';
import {
	addPendingBtcTransaction,
	addUserDismissedNotification,
	allowSigning,
	createActiveUserTransaction,
	createUserProfile,
	deleteActiveUserTransaction,
	getActiveUserTransactions,
	getExchangeRate,
	getExchangeRates,
	getPendingBtcTransactions,
	getUserProfile,
	getUserTransactions,
	listCustomTokens,
	newUserSignupsAllowed,
	removeCustomToken,
	saveUserTransactions,
	setCustomToken,
	setManyCustomTokens,
	updateActiveUserTransaction,
	updateUserExperimentalFeatureSettings,
	updateUserTransactionFilterSettings
} from '$lib/api/backend.api';
import { BackendCanister } from '$lib/canisters/backend.canister';
import type {
	AddPendingTransactionOutcome,
	AddUserDismissedNotificationParams,
	AllowSigningOutcome,
	AllowSigningParams,
	BtcAddPendingTransactionParams,
	BtcGetPendingTransactionParams,
	CreateActiveUserTransactionParams,
	CreateUserProfileResponse,
	GetUserProfileResponse,
	GetUserTransactionsParams,
	SaveUserTransactionsParams,
	UpdateActiveUserTransactionParams,
	UpdateUserExperimentalFeatureSettings,
	UpdateUserTransactionFilterSettings
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { BackendExchangeRate } from '$lib/types/exchange';
import {
	mockActiveUserTransaction,
	mockActiveUserTransactionId,
	mockCreateActiveUserTransactionParams,
	mockUpdateActiveUserTransactionParams
} from '$tests/mocks/active-user-transactions.mock';
import { mockUtxo } from '$tests/mocks/btc.mock';
import { mockCustomTokens } from '$tests/mocks/custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockIIDelegationChain } from '$tests/mocks/ii-delegation.mock';
import { mockUserExperimentalFeatures } from '$tests/mocks/user-experimental-features.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import {
	mockGetUserTransactionsResponse,
	mockUserTransactionTokenId
} from '$tests/mocks/user-transactions.mock';
import type { QueryParams } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('backend.api', () => {
	const backendCanisterMock = mock<BackendCanister>();

	const certified = false;

	const baseParams = {
		identity: mockIdentity
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(BackendCanister, 'create').mockResolvedValue(backendCanisterMock);
	});

	describe('listCustomTokens', () => {
		const mockParams: CanisterApiFunctionParams<QueryParams> = {
			...baseParams,
			certified
		};

		beforeEach(() => {
			backendCanisterMock.listCustomTokens.mockResolvedValue(mockCustomTokens);
		});

		it('should successfully call listCustomTokens endpoint', async () => {
			const result = await listCustomTokens(mockParams);

			expect(result).toEqual(mockCustomTokens);
			expect(backendCanisterMock.listCustomTokens).toHaveBeenCalledExactlyOnceWith();
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(listCustomTokens({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if listCustomTokens throws', async () => {
			backendCanisterMock.listCustomTokens.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(listCustomTokens(mockParams)).rejects.toThrow();
		});
	});

	describe('setManyCustomTokens', () => {
		const mockParams: CanisterApiFunctionParams<{
			tokens: CustomToken[];
		}> = {
			...baseParams,
			tokens: mockCustomTokens
		};

		beforeEach(() => {
			backendCanisterMock.setManyCustomTokens.mockResolvedValue();
		});

		it('should successfully call setManyCustomTokens endpoint', async () => {
			await setManyCustomTokens(mockParams);

			expect(backendCanisterMock.setManyCustomTokens).toHaveBeenCalledExactlyOnceWith({
				tokens: mockCustomTokens
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(setManyCustomTokens({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if setManyCustomTokens throws', async () => {
			backendCanisterMock.setManyCustomTokens.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(setManyCustomTokens(mockParams)).rejects.toThrow();
		});
	});

	describe('setCustomToken', () => {
		const [mockCustomToken] = mockCustomTokens;

		const mockParams: CanisterApiFunctionParams<{
			token: CustomToken;
		}> = {
			...baseParams,
			token: mockCustomToken
		};

		beforeEach(() => {
			backendCanisterMock.setCustomToken.mockResolvedValue();
		});

		it('should successfully call setCustomToken endpoint', async () => {
			await setCustomToken(mockParams);

			expect(backendCanisterMock.setCustomToken).toHaveBeenCalledExactlyOnceWith({
				token: mockCustomToken
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(setCustomToken({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if setCustomToken throws', async () => {
			backendCanisterMock.setCustomToken.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(setCustomToken(mockParams)).rejects.toThrow();
		});
	});

	describe('removeCustomToken', () => {
		const [mockCustomToken] = mockCustomTokens;

		const mockParams: CanisterApiFunctionParams<{ token: CustomToken }> = {
			...baseParams,
			token: mockCustomToken
		};

		beforeEach(() => {
			backendCanisterMock.removeCustomToken.mockResolvedValue();
		});

		it('should successfully call removeCustomToken endpoint', async () => {
			await removeCustomToken(mockParams);

			expect(backendCanisterMock.removeCustomToken).toHaveBeenCalledExactlyOnceWith({
				token: mockCustomToken
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(removeCustomToken({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if removeCustomToken throws', async () => {
			backendCanisterMock.removeCustomToken.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(removeCustomToken(mockParams)).rejects.toThrow();
		});
	});

	describe('createUserProfile', () => {
		const mockParams: CanisterApiFunctionParams = {
			...baseParams
		};

		const mockResponse: CreateUserProfileResponse = { Ok: mockUserProfile };

		beforeEach(() => {
			backendCanisterMock.createUserProfile.mockResolvedValue(mockResponse);
		});

		it('should successfully call createUserProfile endpoint', async () => {
			const result = await createUserProfile(mockParams);

			expect(result).toEqual(mockResponse);
			expect(backendCanisterMock.createUserProfile).toHaveBeenCalledOnce();
		});

		it('should return the backend error', async () => {
			const mockErrResponse: CreateUserProfileResponse = { Err: { SignupsClosed: null } };

			backendCanisterMock.createUserProfile.mockResolvedValue(mockErrResponse);

			const result = await createUserProfile(mockParams);

			expect(result).toEqual(mockErrResponse);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(createUserProfile({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if createUserProfile throws', async () => {
			backendCanisterMock.createUserProfile.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(createUserProfile(mockParams)).rejects.toThrow();
		});
	});

	describe('getUserProfile', () => {
		const mockParams: CanisterApiFunctionParams<QueryParams> = {
			...baseParams,
			certified
		};

		const mockResponse: GetUserProfileResponse = { Ok: mockUserProfile };

		beforeEach(() => {
			backendCanisterMock.getUserProfile.mockResolvedValue(mockResponse);
		});

		it('should successfully call getUserProfile endpoint', async () => {
			const result = await getUserProfile(mockParams);

			expect(result).toEqual(mockResponse);
			expect(backendCanisterMock.getUserProfile).toHaveBeenCalledExactlyOnceWith({ certified });
		});

		it('should return the backend error', async () => {
			const mockErrResponse: GetUserProfileResponse = { Err: { NotFound: null } };

			backendCanisterMock.getUserProfile.mockResolvedValue(mockErrResponse);

			const result = await getUserProfile(mockParams);

			expect(result).toEqual(mockErrResponse);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(getUserProfile({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if getUserProfile throws', async () => {
			backendCanisterMock.getUserProfile.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(getUserProfile(mockParams)).rejects.toThrow();
		});
	});

	describe('newUserSignupsAllowed', () => {
		const mockParams: CanisterApiFunctionParams<QueryParams> = {
			...baseParams,
			certified
		};

		beforeEach(() => {
			backendCanisterMock.newUserSignupsAllowed.mockResolvedValue(true);
		});

		it('should successfully call newUserSignupsAllowed endpoint', async () => {
			const result = await newUserSignupsAllowed(mockParams);

			expect(result).toBeTruthy();
			expect(backendCanisterMock.newUserSignupsAllowed).toHaveBeenCalledExactlyOnceWith({
				certified
			});
		});

		it('should return false when signups are closed', async () => {
			backendCanisterMock.newUserSignupsAllowed.mockResolvedValue(false);

			const result = await newUserSignupsAllowed(mockParams);

			expect(result).toBeFalsy();
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(newUserSignupsAllowed({ ...mockParams, identity: undefined })).rejects.toThrow();
		});
	});

	describe('addPendingBtcTransaction', () => {
		const mockParams: CanisterApiFunctionParams<BtcAddPendingTransactionParams> = {
			...baseParams,
			txId: new Uint8Array([1, 2, 3]),
			utxos: [mockUtxo],
			network: { mainnet: null },
			iiDelegationChain: mockIIDelegationChain
		};

		const mockResponse: AddPendingTransactionOutcome = { response: true };

		beforeEach(() => {
			backendCanisterMock.btcAddPendingTransaction.mockResolvedValue(mockResponse);
		});

		it('should successfully call btcAddPendingTransaction endpoint', async () => {
			const result = await addPendingBtcTransaction(mockParams);

			expect(result).toEqual(mockResponse);
			expect(backendCanisterMock.btcAddPendingTransaction).toHaveBeenCalledExactlyOnceWith({
				txId: new Uint8Array([1, 2, 3]),
				utxos: [mockUtxo],
				network: { mainnet: null },
				iiDelegationChain: mockIIDelegationChain
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				addPendingBtcTransaction({ ...mockParams, identity: undefined })
			).rejects.toThrow();
		});

		it('should throw an error if addPendingBtcTransaction throws', async () => {
			backendCanisterMock.btcAddPendingTransaction.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(addPendingBtcTransaction(mockParams)).rejects.toThrow();
		});
	});

	describe('getPendingBtcTransactions', () => {
		const mockParams: CanisterApiFunctionParams<BtcGetPendingTransactionParams> = {
			...baseParams,
			network: { mainnet: null },
			iiDelegationChain: mockIIDelegationChain
		};

		const mockResponse: PendingTransaction[] = [
			{
				txid: new Uint8Array([1, 2, 3]),
				utxos: [mockUtxo]
			}
		];

		beforeEach(() => {
			backendCanisterMock.btcGetPendingTransactions.mockResolvedValue({ response: mockResponse });
		});

		it('should successfully call btcGetPendingTransaction endpoint', async () => {
			const result = await getPendingBtcTransactions(mockParams);

			expect(result).toEqual({ response: mockResponse });
			expect(backendCanisterMock.btcGetPendingTransactions).toHaveBeenCalledExactlyOnceWith({
				network: { mainnet: null },
				iiDelegationChain: mockIIDelegationChain
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				getPendingBtcTransactions({ ...mockParams, identity: undefined })
			).rejects.toThrow();
		});

		it('should throw an error if getPendingBtcTransactions throws', async () => {
			backendCanisterMock.btcGetPendingTransactions.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(getPendingBtcTransactions(mockParams)).rejects.toThrow();
		});
	});

	describe('allowSigning', () => {
		const mockParams: CanisterApiFunctionParams<AllowSigningParams> = {
			...baseParams,
			iiDelegationChain: mockIIDelegationChain
		};

		const mockResponse: AllowSigningOutcome = {
			response: { status: { Executed: null }, allowed_cycles: 100n }
		};

		beforeEach(() => {
			backendCanisterMock.allowSigning.mockResolvedValue(mockResponse);
		});

		it('should successfully call allowSigning endpoint', async () => {
			const result = await allowSigning(mockParams);

			expect(result).toEqual(mockResponse);
			expect(backendCanisterMock.allowSigning).toHaveBeenCalledExactlyOnceWith({
				iiDelegationChain: mockIIDelegationChain
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(allowSigning({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if allowSigning throws', async () => {
			backendCanisterMock.allowSigning.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(allowSigning(mockParams)).rejects.toThrow();
		});
	});

	describe('updateUserExperimentalFeatureSettings', () => {
		const mockParams: CanisterApiFunctionParams<UpdateUserExperimentalFeatureSettings> = {
			...baseParams,
			experimentalFeatures: mockUserExperimentalFeatures,
			currentUserVersion: 1n
		};

		beforeEach(() => {
			backendCanisterMock.updateUserExperimentalFeatureSettings.mockResolvedValue();
		});

		it('should successfully call updateUserExperimentalFeatureSettings endpoint', async () => {
			const result = await updateUserExperimentalFeatureSettings(mockParams);

			expect(result).toEqual(undefined);
			expect(
				backendCanisterMock.updateUserExperimentalFeatureSettings
			).toHaveBeenCalledExactlyOnceWith({
				experimentalFeatures: mockUserExperimentalFeatures,
				currentUserVersion: 1n
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				updateUserExperimentalFeatureSettings({ ...mockParams, identity: undefined })
			).rejects.toThrow();
		});

		it('should throw an error if addPendingBtcTransaction throws', async () => {
			backendCanisterMock.updateUserExperimentalFeatureSettings.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(updateUserExperimentalFeatureSettings(mockParams)).rejects.toThrow();
		});
	});

	describe('updateUserTransactionFilterSettings', () => {
		const mockParams: CanisterApiFunctionParams<UpdateUserTransactionFilterSettings> = {
			...baseParams,
			hideMicroTransactions: true,
			currentUserVersion: 1n
		};

		beforeEach(() => {
			backendCanisterMock.updateUserTransactionFilterSettings.mockResolvedValue();
		});

		it('should successfully call updateUserTransactionFilterSettings endpoint', async () => {
			const result = await updateUserTransactionFilterSettings(mockParams);

			expect(result).toEqual(undefined);
			expect(
				backendCanisterMock.updateUserTransactionFilterSettings
			).toHaveBeenCalledExactlyOnceWith({
				hideMicroTransactions: true,
				currentUserVersion: 1n
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				updateUserTransactionFilterSettings({ ...mockParams, identity: undefined })
			).rejects.toThrow();
		});

		it('should throw an error if updateUserTransactionFilterSettings throws', async () => {
			backendCanisterMock.updateUserTransactionFilterSettings.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(updateUserTransactionFilterSettings(mockParams)).rejects.toThrow();
		});
	});

	describe('getUserTransactions', () => {
		const mockParams: CanisterApiFunctionParams<GetUserTransactionsParams> = {
			...baseParams,
			tokenId: mockUserTransactionTokenId,
			start: 5n,
			maxResults: 10n
		};

		beforeEach(() => {
			backendCanisterMock.getUserTransactions.mockResolvedValue(mockGetUserTransactionsResponse);
		});

		it('should successfully call getUserTransactions endpoint', async () => {
			const result = await getUserTransactions(mockParams);

			expect(result).toEqual(mockGetUserTransactionsResponse);
			expect(backendCanisterMock.getUserTransactions).toHaveBeenCalledExactlyOnceWith({
				tokenId: mockUserTransactionTokenId,
				start: 5n,
				maxResults: 10n
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(getUserTransactions({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if getUserTransactions throws', async () => {
			backendCanisterMock.getUserTransactions.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(getUserTransactions(mockParams)).rejects.toThrow();
		});
	});

	describe('saveUserTransactions', () => {
		const mockParams: CanisterApiFunctionParams<SaveUserTransactionsParams> = {
			...baseParams,
			tokenId: mockUserTransactionTokenId,
			transactions: []
		};

		beforeEach(() => {
			backendCanisterMock.saveUserTransactions.mockResolvedValue();
		});

		it('should successfully call saveUserTransactions endpoint', async () => {
			const result = await saveUserTransactions(mockParams);

			expect(result).toEqual(undefined);
			expect(backendCanisterMock.saveUserTransactions).toHaveBeenCalledExactlyOnceWith({
				tokenId: mockUserTransactionTokenId,
				transactions: []
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(saveUserTransactions({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if saveUserTransactions throws', async () => {
			backendCanisterMock.saveUserTransactions.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(saveUserTransactions(mockParams)).rejects.toThrow();
		});
	});

	describe('addUserDismissedNotification', () => {
		const mockParams: CanisterApiFunctionParams<AddUserDismissedNotificationParams> = {
			...baseParams,
			notifications: [
				{ Simple: { kind: { BtcActivityInfo: null }, version: 1 } },
				{ Qualified: { kind: { NoIndexCanister: null }, qualifier: 'ETH', version: 1 } }
			],
			currentUserVersion: 1n
		};

		beforeEach(() => {
			backendCanisterMock.addUserDismissedNotification.mockResolvedValue();
		});

		it('should successfully call addUserDismissedNotification endpoint', async () => {
			const result = await addUserDismissedNotification(mockParams);

			expect(result).toEqual(undefined);
			expect(backendCanisterMock.addUserDismissedNotification).toHaveBeenCalledExactlyOnceWith({
				notifications: [
					{ Simple: { kind: { BtcActivityInfo: null }, version: 1 } },
					{ Qualified: { kind: { NoIndexCanister: null }, qualifier: 'ETH', version: 1 } }
				],
				currentUserVersion: 1n
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				addUserDismissedNotification({ ...mockParams, identity: undefined })
			).rejects.toThrow();
		});

		it('should throw an error if addUserDismissedNotification throws', async () => {
			backendCanisterMock.addUserDismissedNotification.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(addUserDismissedNotification(mockParams)).rejects.toThrow();
		});
	});

	describe('getExchangeRate', () => {
		const tokenId: TokenId = { Icrc: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') };
		const mockRate: BackendExchangeRate = {
			usd: {
				price: 42000,
				price24hChangePct: 1.5,
				marketCap: 800_000_000_000,
				timestampNs: 1_000_000_000n
			}
		};

		beforeEach(() => {
			backendCanisterMock.getExchangeRate.mockResolvedValue(mockRate);
		});

		it('should successfully call getExchangeRate endpoint', async () => {
			const result = await getExchangeRate({
				...baseParams,
				token_id: tokenId,
				certified: false
			});

			expect(result).toEqual(mockRate);
			expect(backendCanisterMock.getExchangeRate).toHaveBeenCalledExactlyOnceWith({
				token_id: tokenId,
				certified: false
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				getExchangeRate({ identity: undefined, token_id: tokenId, certified: false })
			).rejects.toThrow();
		});

		it('should throw an error if getExchangeRate throws', async () => {
			backendCanisterMock.getExchangeRate.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(
				getExchangeRate({ ...baseParams, token_id: tokenId, certified: false })
			).rejects.toThrow();
		});
	});

	describe('getExchangeRates', () => {
		const tokenId: TokenId = { Icrc: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') };
		const mockRate: BackendExchangeRate = {
			usd: {
				price: 42000,
				price24hChangePct: 1.5,
				marketCap: 800_000_000_000,
				timestampNs: 1_000_000_000n
			}
		};
		const mockResponse: Array<[TokenId, BackendExchangeRate | undefined]> = [[tokenId, mockRate]];

		beforeEach(() => {
			backendCanisterMock.getExchangeRates.mockResolvedValue(mockResponse);
		});

		it('should successfully call getExchangeRates endpoint', async () => {
			const result = await getExchangeRates({ ...baseParams });

			expect(result).toEqual(mockResponse);
			expect(backendCanisterMock.getExchangeRates).toHaveBeenCalledExactlyOnceWith();
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(getExchangeRates({ identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if getExchangeRates throws', async () => {
			backendCanisterMock.getExchangeRates.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(getExchangeRates({ ...baseParams })).rejects.toThrow();
		});
	});

	describe('createActiveUserTransaction', () => {
		const mockParams: CanisterApiFunctionParams<CreateActiveUserTransactionParams> = {
			...baseParams,
			...mockCreateActiveUserTransactionParams
		};

		beforeEach(() => {
			backendCanisterMock.createActiveUserTransaction.mockResolvedValue(mockActiveUserTransaction);
		});

		it('should successfully call createActiveUserTransaction endpoint', async () => {
			const result = await createActiveUserTransaction(mockParams);

			expect(result).toEqual(mockActiveUserTransaction);
			expect(backendCanisterMock.createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				mockCreateActiveUserTransactionParams
			);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				createActiveUserTransaction({ ...mockParams, identity: undefined })
			).rejects.toThrow();
		});

		it('should throw an error if createActiveUserTransaction throws', async () => {
			backendCanisterMock.createActiveUserTransaction.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(createActiveUserTransaction(mockParams)).rejects.toThrow();
		});
	});

	describe('updateActiveUserTransaction', () => {
		const mockParams: CanisterApiFunctionParams<UpdateActiveUserTransactionParams> = {
			...baseParams,
			...mockUpdateActiveUserTransactionParams
		};

		beforeEach(() => {
			backendCanisterMock.updateActiveUserTransaction.mockResolvedValue(mockActiveUserTransaction);
		});

		it('should successfully call updateActiveUserTransaction endpoint', async () => {
			const result = await updateActiveUserTransaction(mockParams);

			expect(result).toEqual(mockActiveUserTransaction);
			expect(backendCanisterMock.updateActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				mockUpdateActiveUserTransactionParams
			);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				updateActiveUserTransaction({ ...mockParams, identity: undefined })
			).rejects.toThrow();
		});

		it('should throw an error if updateActiveUserTransaction throws', async () => {
			backendCanisterMock.updateActiveUserTransaction.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(updateActiveUserTransaction(mockParams)).rejects.toThrow();
		});
	});

	describe('deleteActiveUserTransaction', () => {
		const mockParams: CanisterApiFunctionParams<{ id: string }> = {
			...baseParams,
			id: mockActiveUserTransactionId
		};

		beforeEach(() => {
			backendCanisterMock.deleteActiveUserTransaction.mockResolvedValue();
		});

		it('should successfully call deleteActiveUserTransaction endpoint', async () => {
			const result = await deleteActiveUserTransaction(mockParams);

			expect(result).toBeUndefined();
			expect(backendCanisterMock.deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				mockActiveUserTransactionId
			);
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				deleteActiveUserTransaction({ ...mockParams, identity: undefined })
			).rejects.toThrow();
		});

		it('should throw an error if deleteActiveUserTransaction throws', async () => {
			backendCanisterMock.deleteActiveUserTransaction.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(deleteActiveUserTransaction(mockParams)).rejects.toThrow();
		});
	});

	describe('getActiveUserTransactions', () => {
		const mockParams: CanisterApiFunctionParams = baseParams;

		beforeEach(() => {
			backendCanisterMock.getActiveUserTransactions.mockResolvedValue([mockActiveUserTransaction]);
		});

		it('should successfully call getActiveUserTransactions endpoint', async () => {
			const result = await getActiveUserTransactions(mockParams);

			expect(result).toEqual([mockActiveUserTransaction]);
			expect(backendCanisterMock.getActiveUserTransactions).toHaveBeenCalledExactlyOnceWith();
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				getActiveUserTransactions({ ...mockParams, identity: undefined })
			).rejects.toThrow();
		});

		it('should throw an error if getActiveUserTransactions throws', async () => {
			backendCanisterMock.getActiveUserTransactions.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(getActiveUserTransactions(mockParams)).rejects.toThrow();
		});
	});
});
