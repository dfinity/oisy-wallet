import type { _SERVICE as Icrc7Service, Value } from '$declarations/icrc7/icrc7.did';
import { Icrc7Canister } from '$icp/canisters/icrc7.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import {
	mockIcrc7Account,
	mockIcrc7CollectionMetadata,
	mockIcrc7TokenIds,
	mockIcrc7TokenMetadata,
	mockIcrc7TokenMetadataEntries,
	mockIcrc7TransferErrUnauthorized,
	mockIcrc7TransferOk
} from '$tests/mocks/icrc7-token.mock';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
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

	describe('getTokensByOwner', () => {
		const mockParams = { principal: mockPrincipal, certified };

		it('should correctly call icrc7_tokens_of with an Account wrapping the principal', async () => {
			service.icrc7_tokens_of.mockResolvedValue(mockIcrc7TokenIds);

			const { getTokensByOwner } = await createIcrc7Canister({ serviceOverride: service });

			const res = await getTokensByOwner(mockParams);

			expect(res).toEqual(mockIcrc7TokenIds);
			expect(service.icrc7_tokens_of).toHaveBeenCalledExactlyOnceWith(mockIcrc7Account, [], []);
		});

		it('should throw an error if icrc7_tokens_of throws', async () => {
			const mockError = new Error('Test response error');
			service.icrc7_tokens_of.mockRejectedValue(mockError);

			const { getTokensByOwner } = await createIcrc7Canister({ serviceOverride: service });

			await expect(getTokensByOwner(mockParams)).rejects.toThrow(mockError);
		});
	});

	describe('transfer', () => {
		const mockTokenId = 12345n;
		const mockParams = { certified, to: mockPrincipal, tokenIdentifier: mockTokenId };

		it('should unwrap an Ok TransferResult', async () => {
			service.icrc7_transfer.mockResolvedValue([[mockIcrc7TransferOk]]);

			const { transfer } = await createIcrc7Canister({ serviceOverride: service });

			const res = await transfer(mockParams);

			expect(res).toStrictEqual(mockIcrc7TransferOk);
			expect(service.icrc7_transfer).toHaveBeenCalledExactlyOnceWith([
				{
					from_subaccount: [],
					to: mockIcrc7Account,
					token_id: mockTokenId,
					memo: [],
					created_at_time: []
				}
			]);
		});

		it('should pass Err TransferResult variants straight through', async () => {
			service.icrc7_transfer.mockResolvedValue([[mockIcrc7TransferErrUnauthorized]]);

			const { transfer } = await createIcrc7Canister({ serviceOverride: service });

			const res = await transfer(mockParams);

			expect(res).toStrictEqual(mockIcrc7TransferErrUnauthorized);
		});

		it('should throw when icrc7_transfer returns no result for the batch entry', async () => {
			service.icrc7_transfer.mockResolvedValue([[]]);

			const { transfer } = await createIcrc7Canister({ serviceOverride: service });

			await expect(transfer(mockParams)).rejects.toThrow('ICRC-7 transfer returned no result');
		});

		it('should throw if icrc7_transfer throws', async () => {
			const mockError = new Error('Test response error');
			service.icrc7_transfer.mockRejectedValue(mockError);

			const { transfer } = await createIcrc7Canister({ serviceOverride: service });

			await expect(transfer(mockParams)).rejects.toThrow(mockError);
		});
	});

	describe('metadata', () => {
		const mockTokenId = 12345n;
		const mockParams = { certified, tokenIdentifier: mockTokenId };

		it('should parse icrc7_token_metadata entries into name/description/image/attributes', async () => {
			service.icrc7_token_metadata.mockResolvedValue([[mockIcrc7TokenMetadataEntries]]);

			const { metadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await metadata(mockParams);

			expect(res).toStrictEqual(mockIcrc7TokenMetadata);
			expect(service.icrc7_token_metadata).toHaveBeenCalledExactlyOnceWith([mockTokenId]);
		});

		it('should return only attributes when no recognised keys are present', async () => {
			const entries: Array<[string, Value]> = [['rarity', { Nat: 42n }]];

			service.icrc7_token_metadata.mockResolvedValue([[entries]]);

			const { metadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await metadata(mockParams);

			expect(res).toStrictEqual({ attributes: [{ name: 'rarity', value: '42' }] });
		});

		it('should treat an empty optional entry as no metadata', async () => {
			service.icrc7_token_metadata.mockResolvedValue([[]]);

			const { metadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await metadata(mockParams);

			expect(res).toStrictEqual({ attributes: [] });
		});

		it('should support unprefixed name/description/image keys', async () => {
			const entries: Array<[string, Value]> = [
				['name', { Text: 'Plain name' }],
				['description', { Text: 'Plain description' }],
				['image', { Text: 'https://example.com/plain.png' }]
			];

			service.icrc7_token_metadata.mockResolvedValue([[entries]]);

			const { metadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await metadata(mockParams);

			expect(res).toStrictEqual({
				name: 'Plain name',
				description: 'Plain description',
				imageUrl: 'https://example.com/plain.png',
				attributes: []
			});
		});

		it('should fall back to icrc7:logo when no image key is present', async () => {
			const entries: Array<[string, Value]> = [
				['icrc7:logo', { Text: 'https://example.com/logo.png' }]
			];

			service.icrc7_token_metadata.mockResolvedValue([[entries]]);

			const { metadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await metadata(mockParams);

			expect(res).toStrictEqual({
				imageUrl: 'https://example.com/logo.png',
				attributes: []
			});
		});

		it('should throw if icrc7_token_metadata throws', async () => {
			const mockError = new Error('Test response error');
			service.icrc7_token_metadata.mockRejectedValue(mockError);

			const { metadata } = await createIcrc7Canister({ serviceOverride: service });

			await expect(metadata(mockParams)).rejects.toThrow(mockError);
		});
	});

	describe('collectionMetadata', () => {
		const mockParams = { certified };

		const fullBulkEntries: Array<[string, Value]> = [
			['icrc7:symbol', { Text: mockIcrc7CollectionMetadata.symbol }],
			['icrc7:name', { Text: mockIcrc7CollectionMetadata.name }],
			['icrc7:description', { Text: mockIcrc7CollectionMetadata.description }],
			['icrc7:logo', { Text: mockIcrc7CollectionMetadata.icon }]
		];

		beforeEach(() => {
			service.icrc7_symbol.mockResolvedValue(mockIcrc7CollectionMetadata.symbol);
			service.icrc7_name.mockResolvedValue(mockIcrc7CollectionMetadata.name);
			service.icrc7_description.mockResolvedValue([mockIcrc7CollectionMetadata.description]);
			service.icrc7_logo.mockResolvedValue([mockIcrc7CollectionMetadata.icon]);
		});

		it('should use icrc7_collection_metadata as the primary source', async () => {
			service.icrc7_collection_metadata.mockResolvedValue(fullBulkEntries);

			const { collectionMetadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await collectionMetadata(mockParams);

			expect(res).toStrictEqual(mockIcrc7CollectionMetadata);
			expect(service.icrc7_collection_metadata).toHaveBeenCalledExactlyOnceWith();
			expect(service.icrc7_symbol).not.toHaveBeenCalled();
			expect(service.icrc7_name).not.toHaveBeenCalled();
			expect(service.icrc7_description).not.toHaveBeenCalled();
			expect(service.icrc7_logo).not.toHaveBeenCalled();
		});

		it('should fall back to individual getters for keys absent from the bulk entries', async () => {
			service.icrc7_collection_metadata.mockResolvedValue([
				['icrc7:symbol', { Text: mockIcrc7CollectionMetadata.symbol }],
				['icrc7:name', { Text: mockIcrc7CollectionMetadata.name }]
			]);

			const { collectionMetadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await collectionMetadata(mockParams);

			expect(res).toStrictEqual(mockIcrc7CollectionMetadata);
			expect(service.icrc7_symbol).not.toHaveBeenCalled();
			expect(service.icrc7_name).not.toHaveBeenCalled();
			expect(service.icrc7_description).toHaveBeenCalledExactlyOnceWith();
			expect(service.icrc7_logo).toHaveBeenCalledExactlyOnceWith();
		});

		it('should fall back to every individual getter when the bulk call rejects', async () => {
			service.icrc7_collection_metadata.mockRejectedValue(new Error('no bulk metadata'));

			const { collectionMetadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await collectionMetadata(mockParams);

			expect(res).toStrictEqual(mockIcrc7CollectionMetadata);
			expect(service.icrc7_symbol).toHaveBeenCalledExactlyOnceWith();
			expect(service.icrc7_name).toHaveBeenCalledExactlyOnceWith();
			expect(service.icrc7_description).toHaveBeenCalledExactlyOnceWith();
			expect(service.icrc7_logo).toHaveBeenCalledExactlyOnceWith();
		});

		it('should omit description and icon when both bulk and individual getters return them empty', async () => {
			service.icrc7_description.mockResolvedValue([]);
			service.icrc7_logo.mockResolvedValue([]);

			const { collectionMetadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await collectionMetadata(mockParams);

			expect(res).toStrictEqual({
				symbol: mockIcrc7CollectionMetadata.symbol,
				name: mockIcrc7CollectionMetadata.name
			});
		});

		it('should omit description and icon when they are empty strings', async () => {
			service.icrc7_description.mockResolvedValue(['']);
			service.icrc7_logo.mockResolvedValue(['']);

			const { collectionMetadata } = await createIcrc7Canister({ serviceOverride: service });

			const res = await collectionMetadata(mockParams);

			expect(res).toStrictEqual({
				symbol: mockIcrc7CollectionMetadata.symbol,
				name: mockIcrc7CollectionMetadata.name
			});
		});

		it.each(['icrc7_description', 'icrc7_logo'] as const)(
			'should silently skip optional %s when it rejects (e.g. canister did not implement it)',
			async (method) => {
				service[method].mockRejectedValue(new Error(`${method} method not implemented`));

				const { collectionMetadata } = await createIcrc7Canister({ serviceOverride: service });

				const res = await collectionMetadata(mockParams);

				expect(res.symbol).toBe(mockIcrc7CollectionMetadata.symbol);
				expect(res.name).toBe(mockIcrc7CollectionMetadata.name);
			}
		);

		it.each(['icrc7_symbol', 'icrc7_name'] as const)(
			'should throw if mandatory %s throws and is missing from the bulk entries',
			async (method) => {
				const mockError = new Error(`${method} error`);
				service[method].mockRejectedValue(mockError);

				const { collectionMetadata } = await createIcrc7Canister({ serviceOverride: service });

				await expect(collectionMetadata(mockParams)).rejects.toThrow(mockError);
			}
		);
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
