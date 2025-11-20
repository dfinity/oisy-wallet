import { transactions } from '$icp/api/ext-v2-token.api';
import { ExtV2TokenCanister } from '$icp/canisters/ext-v2-token.canister';
import { mockExtV2TokenCanisterId, mockExtV2Transactions } from '$tests/mocks/ext-v2-token.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
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

		it('successfully calls transactions endpoint', async () => {
			const result = await transactions(params);

			expect(result).toEqual(mockExtV2Transactions);

			expect(tokenCanisterMock.transactions).toHaveBeenCalledExactlyOnceWith({});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(transactions({ ...params, identity: undefined })).rejects.toThrow();
		});
	});
});
