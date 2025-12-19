import {
	balance,
	getTokensByOwner,
	metadata,
	transactions,
	transfer
} from '$icp/api/ext-v2-token.api';
import { ExtV2TokenCanister } from '$icp/canisters/ext-v2-token.canister';
import { ZERO } from '$lib/constants/app.constants';
import {
	mockExtMetadata,
	mockExtV2TokenCanisterId,
	mockExtV2TokenIdentifier,
	mockExtV2Transactions
} from '$tests/mocks/ext-v2-token.mock';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
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
			await expect(transactions({ ...params, identity: undefined })).rejects.toThrowError();

			await expect(transactions({ ...params, identity: null })).rejects.toThrowError();
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

	describe('getTokensByOwner', () => {
		const mockTokens = [123, 456, 789];

		const params = {
			identity: mockIdentity,
			owner: mockPrincipal,
			canisterId: mockExtV2TokenCanisterId
		};

		const expectedParams = {
			owner: mockPrincipal
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
	});

	describe('transfer', () => {
		const mockBalance = 456n;

		const params = {
			identity: mockIdentity,
			canisterId: mockExtV2TokenCanisterId,
			from: mockPrincipal,
			to: mockPrincipal2,
			tokenIdentifier: mockExtV2TokenIdentifier,
			amount: 123n
		};

		const expectedParams = {
			from: mockPrincipal,
			to: mockPrincipal2,
			tokenIdentifier: mockExtV2TokenIdentifier,
			amount: 123n
		};

		beforeEach(() => {
			tokenCanisterMock.transfer.mockResolvedValue(mockBalance);

			tokenCanisterMock.transferLegacy.mockResolvedValue(mockBalance);
		});

		it('should call successfully transfer endpoint', async () => {
			await transfer(params);

			expect(tokenCanisterMock.transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should raise an error if identity is nullish', async () => {
			await expect(transfer({ ...params, identity: undefined })).rejects.toThrowError();

			await expect(transfer({ ...params, identity: null })).rejects.toThrowError();

			expect(tokenCanisterMock.transfer).not.toHaveBeenCalled();
		});

		it('should fallback to legacy method if first transfer fails', async () => {
			tokenCanisterMock.transfer.mockRejectedValueOnce(new Error('First transfer error'));

			await transfer(params);

			expect(tokenCanisterMock.transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);

			expect(tokenCanisterMock.transferLegacy).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should raise the error of the first transfer if fallback fails', async () => {
			const mockError = new Error('First transfer error');

			tokenCanisterMock.transfer.mockRejectedValueOnce(mockError);

			tokenCanisterMock.transferLegacy.mockRejectedValueOnce(new Error('Legacy transfer error'));

			await expect(transfer(params)).rejects.toThrowError(mockError);

			expect(tokenCanisterMock.transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);

			expect(tokenCanisterMock.transferLegacy).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});
	});

	describe('metadata', () => {
		const params = {
			identity: mockIdentity,
			canisterId: mockExtV2TokenCanisterId,
			tokenIdentifier: mockExtV2TokenIdentifier
		};

		const expectedParams = {
			tokenIdentifier: mockExtV2TokenIdentifier
		};

		beforeEach(() => {
			tokenCanisterMock.metadata.mockResolvedValue(mockExtMetadata);
		});

		it('should call successfully metadata endpoint', async () => {
			const result = await metadata(params);

			expect(result).toEqual(mockExtMetadata);

			expect(tokenCanisterMock.metadata).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should raise an error if identity is nullish', async () => {
			await expect(metadata({ ...params, identity: undefined })).rejects.toThrowError();

			await expect(metadata({ ...params, identity: null })).rejects.toThrowError();

			expect(tokenCanisterMock.metadata).not.toHaveBeenCalled();
		});
	});
});
