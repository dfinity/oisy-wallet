import type { _SERVICE as Icrc7Service } from '$declarations/icrc7/icrc7.did';
import { Icrc7Canister } from '$icp/canisters/icrc7.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import {
	mockIcrc7Account,
	mockIcrc7CollectionMetadata,
	mockIcrc7TokenMetadata
} from '$tests/mocks/icrc7-token.mock';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('icrc7.canister', () => {
	const certified = false;

	const createIcrc7Canister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<Icrc7Service>, 'serviceOverride'>): Promise<Icrc7Canister> =>
		Icrc7Canister.create({
			canisterId: Principal.fromText(mockIcrc7CanisterId),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<Icrc7Service>>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('collectionMetadata', () => {
		const mockParams = { certified };

		it('should correctly call icrc7_collection_metadata', async () => {
			service.icrc7_collection_metadata.mockResolvedValue(mockIcrc7CollectionMetadata);

			const { collectionMetadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await collectionMetadata(mockParams);

			expect(res).toStrictEqual(mockIcrc7CollectionMetadata);
			expect(service.icrc7_collection_metadata).toHaveBeenCalledExactlyOnceWith();
		});

		it('should throw an error if icrc7_collection_metadata throws', async () => {
			const mockError = new Error('Test response error');
			service.icrc7_collection_metadata.mockRejectedValue(mockError);

			const { collectionMetadata } = await createIcrc7Canister({ serviceOverride: service });

			await expect(collectionMetadata(mockParams)).rejects.toThrow(mockError);
			expect(service.icrc7_collection_metadata).toHaveBeenCalledExactlyOnceWith();
		});
	});

	describe('getTokensByOwner', () => {
		const mockTokenIds = [12345n, 54321n];

		it('should correctly call icrc7_tokens_of with no pagination', async () => {
			service.icrc7_tokens_of.mockResolvedValue(mockTokenIds);

			const { getTokensByOwner } = await createIcrc7Canister({ serviceOverride: service });

			const res = await getTokensByOwner({ certified, owner: mockIcrc7Account });

			expect(res).toEqual(mockTokenIds);
			expect(service.icrc7_tokens_of).toHaveBeenCalledExactlyOnceWith(mockIcrc7Account, [], []);
		});

		it('should pass prev/take when provided', async () => {
			service.icrc7_tokens_of.mockResolvedValue(mockTokenIds);

			const { getTokensByOwner } = await createIcrc7Canister({ serviceOverride: service });

			await getTokensByOwner({ certified, owner: mockIcrc7Account, prev: 10n, take: 50n });

			expect(service.icrc7_tokens_of).toHaveBeenCalledExactlyOnceWith(
				mockIcrc7Account,
				[10n],
				[50n]
			);
		});

		it('should throw if icrc7_tokens_of throws', async () => {
			const mockError = new Error('tokens_of failed');
			service.icrc7_tokens_of.mockRejectedValue(mockError);

			const { getTokensByOwner } = await createIcrc7Canister({ serviceOverride: service });

			await expect(getTokensByOwner({ certified, owner: mockIcrc7Account })).rejects.toThrow(
				mockError
			);
		});
	});

	describe('getOwnersOf', () => {
		const mockTokenIds = [1n, 2n];

		it('should correctly call icrc7_owner_of', async () => {
			const mockOwners: Array<[] | [typeof mockIcrc7Account]> = [[mockIcrc7Account], []];
			service.icrc7_owner_of.mockResolvedValue(mockOwners);

			const { getOwnersOf } = await createIcrc7Canister({ serviceOverride: service });

			const res = await getOwnersOf({ certified, tokenIds: mockTokenIds });

			expect(res).toStrictEqual(mockOwners);
			expect(service.icrc7_owner_of).toHaveBeenCalledExactlyOnceWith(mockTokenIds);
		});

		it('should throw if icrc7_owner_of throws', async () => {
			const mockError = new Error('owner_of failed');
			service.icrc7_owner_of.mockRejectedValue(mockError);

			const { getOwnersOf } = await createIcrc7Canister({ serviceOverride: service });

			await expect(getOwnersOf({ certified, tokenIds: mockTokenIds })).rejects.toThrow(mockError);
		});
	});

	describe('tokenMetadata', () => {
		const mockTokenIds = [1n];

		it('should correctly call icrc7_token_metadata', async () => {
			const mockResponse: Array<[] | [typeof mockIcrc7TokenMetadata]> = [[mockIcrc7TokenMetadata]];
			service.icrc7_token_metadata.mockResolvedValue(mockResponse);

			const { tokenMetadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await tokenMetadata({ certified, tokenIds: mockTokenIds });

			expect(res).toStrictEqual(mockResponse);
			expect(service.icrc7_token_metadata).toHaveBeenCalledExactlyOnceWith(mockTokenIds);
		});

		it('should throw if icrc7_token_metadata throws', async () => {
			const mockError = new Error('token_metadata failed');
			service.icrc7_token_metadata.mockRejectedValue(mockError);

			const { tokenMetadata } = await createIcrc7Canister({ serviceOverride: service });

			await expect(tokenMetadata({ certified, tokenIds: mockTokenIds })).rejects.toThrow(mockError);
		});
	});

	describe('metadata', () => {
		const mockTokenId = 1n;

		it('should map the first icrc7_token_metadata result', async () => {
			service.icrc7_token_metadata.mockResolvedValue([[mockIcrc7TokenMetadata]]);

			const { metadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await metadata({ certified, tokenId: mockTokenId });

			expect(res).toEqual({
				name: 'Mock ICRC-7 NFT #1'
			});
			expect(service.icrc7_token_metadata).toHaveBeenCalledExactlyOnceWith([mockTokenId]);
		});

		it('should return undefined when metadata is missing', async () => {
			service.icrc7_token_metadata.mockResolvedValue([[]]);

			const { metadata } = await createIcrc7Canister({ serviceOverride: service });

			await expect(metadata({ certified, tokenId: mockTokenId })).resolves.toBeUndefined();
		});
	});

	describe('transfer', () => {
		const mockTokenId = 12345n;
		const mockBlockIndex = 7n;
		const mockParams = { certified, to: mockIcrc7Account, tokenId: mockTokenId };

		const expectedArg = [
			{
				to: mockIcrc7Account,
				token_id: mockTokenId,
				memo: [],
				from_subaccount: [],
				created_at_time: []
			}
		];

		it('should call icrc7_transfer with a single TransferArg and return the block index', async () => {
			service.icrc7_transfer.mockResolvedValue([[{ Ok: mockBlockIndex }]]);

			const { transfer } = await createIcrc7Canister({ serviceOverride: service });

			const res = await transfer(mockParams);

			expect(res).toEqual(mockBlockIndex);
			expect(service.icrc7_transfer).toHaveBeenCalledExactlyOnceWith(expectedArg);
		});

		it('should throw a CanisterInternalError mapped from a `Unauthorized` Err arm', async () => {
			service.icrc7_transfer.mockResolvedValue([[{ Err: { Unauthorized: null } }]]);

			const { transfer } = await createIcrc7Canister({ serviceOverride: service });

			await expect(transfer(mockParams)).rejects.toThrow(
				new CanisterInternalError('Unauthorized to transfer this NFT')
			);
		});

		it('should format `bigint` payloads in `Duplicate` Err without crashing', async () => {
			service.icrc7_transfer.mockResolvedValue([[{ Err: { Duplicate: { duplicate_of: 42n } } }]]);

			const { transfer } = await createIcrc7Canister({ serviceOverride: service });

			await expect(transfer(mockParams)).rejects.toThrow(
				new CanisterInternalError('Duplicate of transaction 42')
			);
		});

		it('should format `bigint` payloads in `GenericError` Err without crashing', async () => {
			service.icrc7_transfer.mockResolvedValue([
				[{ Err: { GenericError: { error_code: 9001n, message: 'broken' } } }]
			]);

			const { transfer } = await createIcrc7Canister({ serviceOverride: service });

			await expect(transfer(mockParams)).rejects.toThrow(
				new CanisterInternalError('Generic error (code 9001): broken')
			);
		});

		it('should throw a CanisterInternalError when the canister returns an empty result', async () => {
			service.icrc7_transfer.mockResolvedValue([[]]);

			const { transfer } = await createIcrc7Canister({ serviceOverride: service });

			await expect(transfer(mockParams)).rejects.toThrow(
				new CanisterInternalError('ICRC-7 transfer returned no result')
			);
		});

		it('should throw when icrc7_transfer rejects', async () => {
			const mockError = new Error('transfer failed');
			service.icrc7_transfer.mockRejectedValue(mockError);

			const { transfer } = await createIcrc7Canister({ serviceOverride: service });

			await expect(transfer(mockParams)).rejects.toThrow(mockError);
		});
	});
});
