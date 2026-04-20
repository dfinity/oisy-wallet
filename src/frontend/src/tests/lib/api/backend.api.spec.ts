import type { CustomToken, PendingTransaction, TokenId } from '$declarations/backend/backend.did';
import {
	addPendingBtcTransaction,
	addUserDismissedNotification,
	allowSigning,
	createUserProfile,
	getExchangeRate,
	getExchangeRates,
	getPendingBtcTransactions,
	getUserProfile,
	getUserTransactions,
	listCustomTokens,
	removeCustomToken,
	saveUserTransactions,
	setCustomToken,
	setManyCustomTokens,
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
	GetUserProfileResponse,
	GetUserTransactionsParams,
	SaveUserTransactionsParams,
	UpdateUserExperimentalFeatureSettings,
	UpdateUserTransactionFilterSettings
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { BackendExchangeRate } from '$lib/types/exchange';
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

		beforeEach(() => {
			backendCanisterMock.createUserProfile.mockResolvedValue(mockUserProfile);
		});

		it('should successfully call createUserProfile endpoint', async () => {
			const result = await createUserProfile(mockParams);

			expect(result).toEqual(mockUserProfile);
			expect(backendCanisterMock.createUserProfile).toHaveBeenCalledOnce();
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

	describe('addPendingBtcTransaction', () => {
		const mockParams: CanisterApiFunctionParams<BtcAddPendingTransactionParams> = {
			...baseParams,
			txId: new Uint8Array([1, 2, 3]),
			utxos: [mockUtxo],
			network: { mainnet: null },
			address: 'address',
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
				address: 'address',
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
			address: 'address',
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
				address: 'address',
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
		const tokenIds: TokenId[] = [
			{ Icrc: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') },
			{ Erc20: ['0xabc', 1n] }
		];
		const mockRate: BackendExchangeRate = {
			usd: {
				price: 42000,
				price24hChangePct: 1.5,
				marketCap: 800_000_000_000,
				timestampNs: 1_000_000_000n
			}
		};

		const mockMap = new Map([
			['Icrc:ryjl3-tyaaa-aaaaa-aaaba-cai', mockRate],
			['Erc20:0xabc:1', mockRate]
		]);

		beforeEach(() => {
			backendCanisterMock.getExchangeRates.mockResolvedValue(mockMap);
		});

		it('should successfully call getExchangeRates endpoint', async () => {
			const result = await getExchangeRates({
				...baseParams,
				token_ids: tokenIds,
				certified: false
			});

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(2);
			expect(backendCanisterMock.getExchangeRates).toHaveBeenCalledExactlyOnceWith({
				token_ids: tokenIds,
				certified: false
			});
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(
				getExchangeRates({ identity: undefined, token_ids: tokenIds, certified: false })
			).rejects.toThrow();
		});

		it('should throw an error if getExchangeRates throws', async () => {
			backendCanisterMock.getExchangeRates.mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(
				getExchangeRates({ ...baseParams, token_ids: tokenIds, certified: false })
			).rejects.toThrow();
		});
	});
});
