import type {
	BalanceRequest,
	_SERVICE as ExtV2TokenService,
	Transaction
} from '$declarations/ext_v2_token/ext_v2_token.did';
import { ExtV2TokenCanister } from '$icp/canisters/ext-v2-token.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import {
	mockExtV2TokenCanisterId,
	mockExtV2TokenIdentifier,
	mockExtV2TokenIndexes,
	mockExtV2TokensListing,
	mockExtV2Transactions
} from '$tests/mocks/ext-v2-token.mock';
import { mockIcrcAccount, mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('ext-v2-token.canister', () => {
	const certified = false;

	const createExtV2TokenCanister = ({
		serviceOverride
	}: Pick<
		CreateCanisterOptions<ExtV2TokenService>,
		'serviceOverride'
	>): Promise<ExtV2TokenCanister> =>
		ExtV2TokenCanister.create({
			canisterId: Principal.fromText(mockExtV2TokenCanisterId),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<ExtV2TokenService>>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('transactions', () => {
		const mockParams = { certified };

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should correctly call the transactions method', async () => {
			service.transactions.mockResolvedValue(mockExtV2Transactions);

			const { transactions } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await transactions(mockParams);

			expect(res).toEqual(mockExtV2Transactions);
			expect(service.transactions).toHaveBeenCalledExactlyOnceWith();
		});

		it('should handle an empty array as response', async () => {
			const mockTransactions: Transaction[] = [];
			service.transactions.mockResolvedValue(mockTransactions);

			const { transactions } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await transactions(mockParams);

			expect(res).toEqual(mockTransactions);
			expect(service.transactions).toHaveBeenCalledExactlyOnceWith();
		});

		it('should throw an error if transactions throws', async () => {
			const mockError = new Error('Test response error');
			service.transactions.mockRejectedValue(mockError);

			const { transactions } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = transactions(mockParams);

			await expect(res).rejects.toThrow(mockError);
		});
	});

	describe('balance', () => {
		const mockParams = {
			tokenIdentifier: mockExtV2TokenIdentifier,
			account: mockPrincipal,
			certified
		};

		const expectedParams: BalanceRequest = {
			token: mockExtV2TokenIdentifier,
			user: {
				principal: mockPrincipal
			}
		};

		const mockBalance = 12345n;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should correctly call the balance method', async () => {
			service.balance.mockResolvedValue({ ok: mockBalance });

			const { balance } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await balance(mockParams);

			expect(res).toEqual(mockBalance);
			expect(service.balance).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should handle invalid token error', async () => {
			service.balance.mockResolvedValue({
				err: { InvalidToken: mockExtV2TokenIdentifier }
			});

			const { balance } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(balance(mockParams)).rejects.toThrow(
				new CanisterInternalError(`The specified token is invalid: ${mockExtV2TokenIdentifier}`)
			);

			expect(service.balance).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should handle other unexpected errors', async () => {
			service.balance.mockResolvedValue({
				err: { Other: 'other error' }
			});

			const { balance } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(balance(mockParams)).rejects.toThrow(new CanisterInternalError('other error'));

			expect(service.balance).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should handle a generic canister error', async () => {
			// @ts-expect-error we test this on purpose
			service.balance.mockResolvedValue({ err: { CanisterError: null } });

			const { balance } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(balance(mockParams)).rejects.toThrow(
				new CanisterInternalError('Unknown ExtV2TokenCanisterError')
			);

			expect(service.balance).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should throw an error if balance throws', async () => {
			const mockError = new Error('Test response error');
			service.balance.mockRejectedValue(mockError);

			const { balance } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = balance(mockParams);

			await expect(res).rejects.toThrow(mockError);
		});
	});

	describe('getTokensByOwner', () => {
		const mockParams = {
			certified,
			...mockIcrcAccount
		};

		const expectedIcrcAddress = encodeIcrcAccount(mockIcrcAccount);

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should correctly call the tokens_ext method', async () => {
			service.tokens_ext.mockResolvedValue({ ok: mockExtV2TokensListing });

			const { getTokensByOwner } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await getTokensByOwner(mockParams);

			expect(res).toEqual(mockExtV2TokenIndexes);
			expect(service.tokens_ext).toHaveBeenCalledExactlyOnceWith(expectedIcrcAddress);
		});

		it('should handle an empty response', async () => {
			service.tokens_ext.mockResolvedValue({ ok: mockExtV2TokensListing });

			const { getTokensByOwner } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await getTokensByOwner(mockParams);

			expect(res).toEqual(mockExtV2TokenIndexes);
			expect(service.tokens_ext).toHaveBeenCalledExactlyOnceWith(expectedIcrcAddress);
		});

		it('should handle invalid token error', async () => {
			service.tokens_ext.mockResolvedValue({
				err: { InvalidToken: mockExtV2TokenIdentifier }
			});

			const { getTokensByOwner } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(getTokensByOwner(mockParams)).rejects.toThrow(
				new CanisterInternalError(`The specified token is invalid: ${mockExtV2TokenIdentifier}`)
			);

			expect(service.tokens_ext).toHaveBeenCalledExactlyOnceWith(expectedIcrcAddress);
		});

		it('should handle other unexpected errors', async () => {
			service.tokens_ext.mockResolvedValue({
				err: { Other: 'other error' }
			});

			const { getTokensByOwner } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(getTokensByOwner(mockParams)).rejects.toThrow(
				new CanisterInternalError('other error')
			);

			expect(service.tokens_ext).toHaveBeenCalledExactlyOnceWith(expectedIcrcAddress);
		});

		it('should return an empty list if it is a no-tokens Other error', async () => {
			service.tokens_ext.mockResolvedValue({
				err: { Other: 'No tokens' }
			});

			const { getTokensByOwner } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await getTokensByOwner(mockParams);

			expect(res).toEqual([]);
			expect(service.tokens_ext).toHaveBeenCalledExactlyOnceWith(expectedIcrcAddress);
		});

		it('should handle a generic canister error', async () => {
			// @ts-expect-error we test this on purpose
			service.tokens_ext.mockResolvedValue({ err: { CanisterError: null } });

			const { getTokensByOwner } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(getTokensByOwner(mockParams)).rejects.toThrow(
				new CanisterInternalError('Unknown ExtV2TokenCanisterError')
			);

			expect(service.tokens_ext).toHaveBeenCalledExactlyOnceWith(expectedIcrcAddress);
		});

		it('should throw an error if tokens_ext throws', async () => {
			const mockError = new Error('Test response error');
			service.tokens_ext.mockRejectedValue(mockError);

			const { getTokensByOwner } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = getTokensByOwner(mockParams);

			await expect(res).rejects.toThrow(mockError);
		});
	});
});
