import type { _SERVICE as Icrc7Service } from '$declarations/icrc7/icrc7.did';
import { Icrc7Canister } from '$icp/canisters/icrc7.canister';
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
});
