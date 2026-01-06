import { balance } from '$icp/api/dip721.api';
import { Dip721Canister } from '$icp/canisters/dip721.canister';
import { ZERO } from '$lib/constants/app.constants';
import { mockDip721TokenCanisterId } from '$tests/mocks/dip721-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { mock } from 'vitest-mock-extended';

describe('dip721.api', () => {
	const tokenCanisterMock = mock<Dip721Canister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(Dip721Canister, 'create').mockResolvedValue(tokenCanisterMock);
	});

	describe('balance', () => {
		const mockBalance = 123n;

		const params = {
			identity: mockIdentity,
			canisterId: mockDip721TokenCanisterId
		};

		const expectedParams = {
			principal: mockPrincipal
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
