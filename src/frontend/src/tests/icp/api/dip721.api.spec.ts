import { balance, getTokensByOwner, transfer } from '$icp/api/dip721.api';
import { Dip721Canister } from '$icp/canisters/dip721.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import { ZERO } from '$lib/constants/app.constants';
import { mockDip721TokenCanisterId } from '$tests/mocks/dip721-tokens.mock';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
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

	describe('getTokensByOwner', () => {
		const mockTokens = [123n, 456n, 789n];

		const params = {
			identity: mockIdentity,
			owner: mockPrincipal,
			canisterId: mockDip721TokenCanisterId
		};

		const expectedParams = {
			principal: mockPrincipal
		};

		beforeEach(() => {
			tokenCanisterMock.getTokensByOwner.mockResolvedValue(mockTokens);
		});

		it('should call successfully getTokensByOwner endpoint', async () => {
			const result = await getTokensByOwner(params);

			expect(result).toEqual(mockTokens);

			expect(tokenCanisterMock.getTokensByOwner).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should return an empty array if identity is nullish', async () => {
			await expect(getTokensByOwner({ ...params, identity: undefined })).resolves.toEqual([]);

			await expect(getTokensByOwner({ ...params, identity: null })).resolves.toEqual([]);

			expect(tokenCanisterMock.getTokensByOwner).not.toHaveBeenCalled();
		});

		it('should throw an error if getTokensByOwner fails', async () => {
			const mockError = new CanisterInternalError('Generic error');

			tokenCanisterMock.getTokensByOwner.mockRejectedValueOnce(mockError);

			await expect(getTokensByOwner(params)).rejects.toThrowError(mockError);

			expect(tokenCanisterMock.getTokensByOwner).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});
	});

	describe('transfer', () => {
		const mockTokenId = 987_456_123n;

		const params = {
			identity: mockIdentity,
			owner: mockPrincipal,
			canisterId: mockDip721TokenCanisterId,
			to: mockPrincipal2,
			tokenIdentifier: mockTokenId
		};

		const expectedParams = {
			to: mockPrincipal2,
			tokenIdentifier: mockTokenId
		};

		beforeEach(() => {
			tokenCanisterMock.transfer.mockResolvedValue(123n);
		});

		it('should call successfully transfer endpoint', async () => {
			await transfer(params);

			expect(tokenCanisterMock.transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should throw an error if transfer fails', async () => {
			const mockError = new CanisterInternalError('Generic error');

			tokenCanisterMock.transfer.mockRejectedValueOnce(mockError);

			await expect(transfer(params)).rejects.toThrowError(mockError);

			expect(tokenCanisterMock.transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});
	});
});
