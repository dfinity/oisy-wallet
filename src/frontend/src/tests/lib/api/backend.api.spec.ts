import { listUserTokens } from '$lib/api/backend.api';
import { BackendCanister } from '$lib/canisters/backend.canister';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockUserTokens } from '$tests/mocks/user-tokens.mock';
import type { QueryParams } from '@dfinity/utils';
import { mock } from 'vitest-mock-extended';

describe('backend.api', () => {
	const backendCanisterMock = mock<BackendCanister>();

	const certified = false;

	const mockParams: CanisterApiFunctionParams<QueryParams> = {
		identity: mockIdentity,
		certified
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(BackendCanister, 'create').mockResolvedValue(backendCanisterMock);
	});

	describe('listUserTokens', () => {
		beforeEach(() => {
			backendCanisterMock.listUserTokens.mockResolvedValue(mockUserTokens);
		});

		it('should successfully call listUserTokens endpoint', async () => {
			const result = await listUserTokens(mockParams);

			expect(result).toEqual(mockUserTokens);

			expect(backendCanisterMock.listUserTokens).toHaveBeenCalledExactlyOnceWith({ certified });
		});

		it('should throw an error if identity is undefined', async () => {
			await expect(listUserTokens({ ...mockParams, identity: undefined })).rejects.toThrow();
		});

		it('should throw an error if listUserTokens throws', async () => {
			vi.spyOn(BackendCanister, 'create').mockImplementation(() => {
				throw new Error('mock-error');
			});

			await expect(listUserTokens({ ...mockParams, identity: undefined })).rejects.toThrow();
		});
	});

	describe('listCustomTokens', () => {});

	describe('setManyCustomTokens', () => {});

	describe('setCustomToken', () => {});

	describe('removeUserToken', () => {});

	describe('removeCustomToken', () => {});

	describe('setManyUserTokens', () => {});

	describe('setUserToken', () => {});

	describe('createUserProfile', () => {});

	describe('getUserProfile', () => {});

	describe('addUserCredential', () => {});

	describe('addPendingBtcTransaction', () => {});

	describe('getPendingBtcTransactions', () => {});

	describe('selectUserUtxosFee', () => {});

	describe('getCurrentBtcFeePercentiles', () => {});

	describe('createPowChallenge', () => {});

	describe('getAllowedCycles', () => {});

	describe('allowSigning', () => {});

	describe('addUserHiddenDappId', () => {});

	describe('setUserShowTestnets', () => {});

	describe('updateUserNetworkSettings', () => {});

	describe('updateUserAgreements', () => {});

	describe('getContact', () => {});

	describe('getContacts', () => {});

	describe('createContact', () => {});

	describe('updateContact', () => {});

	describe('deleteContact', () => {});
});
