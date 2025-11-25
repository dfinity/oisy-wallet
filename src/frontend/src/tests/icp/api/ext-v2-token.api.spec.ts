import { balance, transactions } from '$icp/api/ext-v2-token.api';
import { ExtV2TokenCanister } from '$icp/canisters/ext-v2-token.canister';
import { ZERO } from '$lib/constants/app.constants';
import {
	mockExtV2TokenCanisterId,
	mockExtV2TokenIdentifier,
	mockExtV2Transactions
} from '$tests/mocks/ext-v2-token.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { mock } from 'vitest-mock-extended';

describe('ext-v2-token.api', () => {
	const tokenCanisterMock = mock<ExtV2TokenCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(ExtV2TokenCanister, 'create').mockResolvedValue(tokenCanisterMock);
	});

	describe('transactions', () => {
		const params = {
			identity: mockIdentity,
			canisterId: mockExtV2TokenCanisterId
		};

		beforeEach(() => {
			tokenCanisterMock.transactions.mockResolvedValue(mockExtV2Transactions);
		});

		it('should call successfully transactions endpoint', async () => {
			const result = await transactions(params);

			expect(result).toEqual(mockExtV2Transactions);

			expect(tokenCanisterMock.transactions).toHaveBeenCalledExactlyOnceWith({});
		});

		it('should throw an error if identity is nullish', async () => {
			await expect(transactions({ ...params, identity: undefined })).rejects.toThrow();

			await expect(transactions({ ...params, identity: null })).rejects.toThrow();
		});
	});

	describe('balance', () => {
		const mockBalance = 123n;

		const params = {
			identity: mockIdentity,
			canisterId: mockExtV2TokenCanisterId,
			tokenIdentifier: mockExtV2TokenIdentifier
		};

		const expectedParams = {
			account: mockPrincipal,
			tokenIdentifier: mockExtV2TokenIdentifier
		};

		beforeEach(() => {
			tokenCanisterMock.balance.mockResolvedValue(mockBalance);
		});

		it('should call successfully balance endpoint', async () => {
			const result = await balance(params);

			expect(result).toEqual(mockBalance);

			expect(tokenCanisterMock.balance).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should return zero balance if identity is nullish', async () => {
			await expect(balance({ ...params, identity: undefined })).resolves.toEqual(ZERO);

			await expect(balance({ ...params, identity: null })).resolves.toEqual(ZERO);

			expect(tokenCanisterMock.balance).not.toHaveBeenCalled();
		});
	});
});
