import type {
	BalanceRequest,
	_SERVICE as ExtV2TokenService,
	Transaction
} from '$declarations/ext_v2_token/ext_v2_token.did';
import { ExtV2TokenCanister } from '$icp/canisters/ext-v2-token.canister';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { CanisterInternalError } from '$lib/canisters/errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import {
	mockExtLegacyMetadata,
	mockExtMetadata,
	mockExtV2TokenCanisterId,
	mockExtV2TokenIdentifier,
	mockExtV2TokenIndexes,
	mockExtV2TokensListing,
	mockExtV2Transactions
} from '$tests/mocks/ext-v2-token.mock';
import {
	mockIcrcAccount,
	mockIdentity,
	mockPrincipal,
	mockPrincipal2
} from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
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

			await expect(res).rejects.toThrowError(mockError);
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

			await expect(balance(mockParams)).rejects.toThrowError(
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

			await expect(balance(mockParams)).rejects.toThrowError(
				new CanisterInternalError('other error')
			);

			expect(service.balance).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should handle a generic canister error', async () => {
			// @ts-expect-error we test this on purpose
			service.balance.mockResolvedValue({ err: { CanisterError: null } });

			const { balance } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(balance(mockParams)).rejects.toThrowError(
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

			await expect(res).rejects.toThrowError(mockError);
		});
	});

	describe('getTokensByOwner', () => {
		const mockParams = {
			certified,
			...mockIcrcAccount
		};

		const expectedIcrcAddress = getAccountIdentifier(mockPrincipal).toHex();

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

			await expect(getTokensByOwner(mockParams)).rejects.toThrowError(
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

			await expect(getTokensByOwner(mockParams)).rejects.toThrowError(
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

			await expect(getTokensByOwner(mockParams)).rejects.toThrowError(
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

			await expect(res).rejects.toThrowError(mockError);
		});
	});

	describe('transfer', () => {
		const mockParams = {
			certified,
			from: mockPrincipal,
			to: mockPrincipal2,
			tokenIdentifier: mockExtV2TokenIdentifier,
			amount: 123n
		};

		const expectedParams = {
			from: { principal: mockPrincipal },
			to: { principal: mockPrincipal2 },
			token: mockExtV2TokenIdentifier,
			amount: 123n,
			notify: false,
			memo: new Uint8Array(),
			subaccount: toNullable()
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should correctly call the ext_transfer method', async () => {
			service.ext_transfer.mockResolvedValue({ ok: 456n });

			const { transfer } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await transfer(mockParams);

			expect(res).toEqual(456n);
			expect(service.ext_transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should handle cannot notify error', async () => {
			const mockAccountIdentifier = encodeIcrcAccount({ owner: mockParams.to });

			service.ext_transfer.mockResolvedValue({
				err: { CannotNotify: mockAccountIdentifier }
			});

			const { transfer } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(transfer(mockParams)).rejects.toThrowError(
				new CanisterInternalError(`Cannot notify account: ${mockAccountIdentifier}`)
			);

			expect(service.ext_transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should handle insufficient balance error', async () => {
			service.ext_transfer.mockResolvedValue({
				err: { InsufficientBalance: null }
			});

			const { transfer } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(transfer(mockParams)).rejects.toThrowError(
				new CanisterInternalError('Insufficient balance for the transfer')
			);

			expect(service.ext_transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should handle reject error', async () => {
			service.ext_transfer.mockResolvedValue({
				err: { Rejected: null }
			});

			const { transfer } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(transfer(mockParams)).rejects.toThrowError(
				new CanisterInternalError('The transfer was rejected')
			);

			expect(service.ext_transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should handle unauthorized error', async () => {
			const mockAccountIdentifier = encodeIcrcAccount({ owner: mockParams.from });

			service.ext_transfer.mockResolvedValue({
				err: { Unauthorized: mockAccountIdentifier }
			});

			const { transfer } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(transfer(mockParams)).rejects.toThrowError(
				new CanisterInternalError(`Unauthorized account: ${mockAccountIdentifier}`)
			);

			expect(service.ext_transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should handle invalid token error', async () => {
			service.ext_transfer.mockResolvedValue({
				err: { InvalidToken: mockExtV2TokenIdentifier }
			});

			const { transfer } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(transfer(mockParams)).rejects.toThrowError(
				new CanisterInternalError(`The specified token is invalid: ${mockExtV2TokenIdentifier}`)
			);

			expect(service.ext_transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should handle other unexpected errors', async () => {
			service.ext_transfer.mockResolvedValue({
				err: { Other: 'other error' }
			});

			const { transfer } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(transfer(mockParams)).rejects.toThrowError(
				new CanisterInternalError('other error')
			);

			expect(service.ext_transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should handle a generic canister error', async () => {
			// @ts-expect-error we test this on purpose
			service.ext_transfer.mockResolvedValue({ err: { CanisterError: null } });

			const { transfer } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(transfer(mockParams)).rejects.toThrowError(
				new CanisterInternalError('Unknown ExtV2TokenCanisterError')
			);

			expect(service.ext_transfer).toHaveBeenCalledExactlyOnceWith(expectedParams);
		});

		it('should throw an error if ext_transfer throws', async () => {
			const mockError = new Error('Test response error');
			service.ext_transfer.mockRejectedValue(mockError);

			const { transfer } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = transfer(mockParams);

			await expect(res).rejects.toThrowError(mockError);
		});
	});

	describe('metadata', () => {
		const mockParams = {
			tokenIdentifier: mockExtV2TokenIdentifier,
			certified
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should correctly call the ext_metadata method', async () => {
			service.ext_metadata.mockResolvedValue({ ok: mockExtMetadata });
			service.metadata.mockResolvedValue({ ok: mockExtLegacyMetadata });

			const { metadata } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await metadata(mockParams);

			expect(res).toEqual(mockExtMetadata);
			expect(service.ext_metadata).toHaveBeenCalledExactlyOnceWith(mockExtV2TokenIdentifier);
			expect(service.metadata).not.toHaveBeenCalled();
		});

		it('should fall back to the legacy metadata method if the first fails', async () => {
			service.ext_metadata.mockRejectedValue(new Error('ext_metadata not supported'));
			service.metadata.mockResolvedValue({ ok: mockExtLegacyMetadata });

			const { metadata } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await metadata(mockParams);

			expect(res).toEqual(mockExtLegacyMetadata);
			expect(service.ext_metadata).toHaveBeenCalledExactlyOnceWith(mockExtV2TokenIdentifier);
			expect(service.metadata).toHaveBeenCalledExactlyOnceWith(mockExtV2TokenIdentifier);
		});

		it('should handle gracefully both methods failing', async () => {
			service.ext_metadata.mockRejectedValue(new Error('ext_metadata not supported'));
			service.metadata.mockRejectedValue(new Error('metadata not supported'));

			const { metadata } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			const res = await metadata(mockParams);

			expect(res).toBeUndefined();
			expect(service.ext_metadata).toHaveBeenCalledExactlyOnceWith(mockExtV2TokenIdentifier);
			expect(service.metadata).toHaveBeenCalledExactlyOnceWith(mockExtV2TokenIdentifier);
		});

		it('should handle invalid token error', async () => {
			service.ext_metadata.mockResolvedValue({
				err: { InvalidToken: mockExtV2TokenIdentifier }
			});

			const { metadata } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(metadata(mockParams)).resolves.toBeUndefined();

			expect(service.ext_metadata).toHaveBeenCalledExactlyOnceWith(mockExtV2TokenIdentifier);
		});

		it('should handle other unexpected errors', async () => {
			service.ext_metadata.mockResolvedValue({
				err: { Other: 'other error' }
			});

			const { metadata } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(metadata(mockParams)).resolves.toBeUndefined();

			expect(service.ext_metadata).toHaveBeenCalledExactlyOnceWith(mockExtV2TokenIdentifier);
		});

		it('should handle a generic canister error', async () => {
			// @ts-expect-error we test this on purpose
			service.ext_metadata.mockResolvedValue({ err: { CanisterError: null } });

			const { metadata } = await createExtV2TokenCanister({
				serviceOverride: service
			});

			await expect(metadata(mockParams)).resolves.toBeUndefined();

			expect(service.ext_metadata).toHaveBeenCalledExactlyOnceWith(mockExtV2TokenIdentifier);
		});
	});
});
