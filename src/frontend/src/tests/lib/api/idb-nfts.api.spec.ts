import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { clearIdbNfts, getIdbAllNfts, setIdbAllNfts } from '$lib/api/idb-nfts.api';
import type { SerializableNft } from '$lib/types/idb-nfts';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { mockValidErc1155Nft, mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import * as idbKeyval from 'idb-keyval';

vi.mock('$app/environment', () => ({
	browser: true
}));

describe('idb-nfts.api', () => {
	const mockNfts = [mockValidErc721Nft, mockValidErc1155Nft];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('setIdbAllNfts', () => {
		it('should not set NFTs in IDB if identity is nullish', async () => {
			await setIdbAllNfts({ identity: null, nfts: mockNfts });

			expect(idbKeyval.set).not.toHaveBeenCalled();

			await setIdbAllNfts({ identity: undefined, nfts: mockNfts });

			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should serialize and store NFTs in IDB', async () => {
			await setIdbAllNfts({ identity: mockIdentity, nfts: mockNfts });

			expect(idbKeyval.set).toHaveBeenCalledOnce();

			const [[key, storedNfts]] = vi.mocked(idbKeyval.set).mock.calls;

			expect(key).toBe(mockPrincipal.toText());

			const serialized = storedNfts as SerializableNft[];

			expect(serialized).toHaveLength(2);

			expect(typeof serialized[0].collection.id).toBe('string');
			expect(typeof serialized[0].collection.network.id).toBe('string');
			expect(serialized[0].collection.id).toBe(`${mockValidErc721Nft.collection.id.description}`);
			expect(serialized[0].collection.network.id).toBe(
				`${mockValidErc721Nft.collection.network.id.description}`
			);
		});

		it('should handle empty NFTs list', async () => {
			await setIdbAllNfts({ identity: mockIdentity, nfts: [] });

			expect(idbKeyval.set).toHaveBeenCalledOnce();

			const [[, storedNfts]] = vi.mocked(idbKeyval.set).mock.calls;

			expect(storedNfts).toEqual([]);
		});

		it('should preserve non-symbol fields during serialization', async () => {
			await setIdbAllNfts({ identity: mockIdentity, nfts: [mockValidErc1155Nft] });

			const [[, storedNfts]] = vi.mocked(idbKeyval.set).mock.calls;
			const [serialized] = storedNfts as SerializableNft[];

			expect(serialized.id).toBe(mockValidErc1155Nft.id);
			expect(serialized.name).toBe(mockValidErc1155Nft.name);
			expect(serialized.balance).toBe(mockValidErc1155Nft.balance);
			expect(serialized.imageUrl).toBe(mockValidErc1155Nft.imageUrl);
			expect(serialized.acquiredAt).toEqual(mockValidErc1155Nft.acquiredAt);
			expect(serialized.collection.address).toBe(mockValidErc1155Nft.collection.address);
			expect(serialized.collection.name).toBe(mockValidErc1155Nft.collection.name);
			expect(serialized.collection.symbol).toBe(mockValidErc1155Nft.collection.symbol);
		});
	});

	describe('getIdbAllNfts', () => {
		it('should return undefined when no cached data exists', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(undefined);

			const result = await getIdbAllNfts(mockPrincipal);

			expect(result).toBeUndefined();
			expect(idbKeyval.get).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});

		it('should deserialize NFTs restoring Symbol IDs', async () => {
			const serialized: SerializableNft[] = [
				{
					...mockValidErc721Nft,
					collection: {
						...mockValidErc721Nft.collection,
						id: `${mockValidErc721Nft.collection.id.description}`,
						network: {
							...mockValidErc721Nft.collection.network,
							id: `${mockValidErc721Nft.collection.network.id.description}`
						}
					}
				}
			];

			vi.mocked(idbKeyval.get).mockResolvedValue(serialized);

			const result = await getIdbAllNfts(mockPrincipal);

			expect(result).toHaveLength(1);
			expect(typeof result?.[0].collection.id).toBe('symbol');
			expect(typeof result?.[0].collection.network.id).toBe('symbol');
			expect(result?.[0].collection.id.description).toBe(
				mockValidErc721Nft.collection.id.description
			);
		});

		it('should restore singleton Network for known networks', async () => {
			const serialized: SerializableNft[] = [
				{
					...mockValidErc721Nft,
					collection: {
						...mockValidErc721Nft.collection,
						id: `${mockValidErc721Nft.collection.id.description}`,
						network: {
							...ETHEREUM_NETWORK,
							id: `${ETHEREUM_NETWORK.id.description}`
						}
					}
				}
			];

			vi.mocked(idbKeyval.get).mockResolvedValue(serialized);

			const result = await getIdbAllNfts(mockPrincipal);

			expect(result?.[0].collection.network.id).toBe(ETHEREUM_NETWORK.id);
		});

		it('should preserve non-symbol fields during deserialization', async () => {
			const serialized: SerializableNft[] = [
				{
					...mockValidErc1155Nft,
					collection: {
						...mockValidErc1155Nft.collection,
						id: `${mockValidErc1155Nft.collection.id.description}`,
						network: {
							...mockValidErc1155Nft.collection.network,
							id: `${mockValidErc1155Nft.collection.network.id.description}`
						}
					}
				}
			];

			vi.mocked(idbKeyval.get).mockResolvedValue(serialized);

			const result = await getIdbAllNfts(mockPrincipal);
			const [nft] = result ?? [];

			expect(nft.id).toBe(mockValidErc1155Nft.id);
			expect(nft.name).toBe(mockValidErc1155Nft.name);
			expect(nft.balance).toBe(mockValidErc1155Nft.balance);
			expect(nft.acquiredAt).toEqual(mockValidErc1155Nft.acquiredAt);
			expect(nft.collection.address).toBe(mockValidErc1155Nft.collection.address);
			expect(nft.collection.name).toBe(mockValidErc1155Nft.collection.name);
		});

		it('should roundtrip serialize then deserialize correctly', async () => {
			await setIdbAllNfts({ identity: mockIdentity, nfts: mockNfts });

			const [[, storedNfts]] = vi.mocked(idbKeyval.set).mock.calls;

			vi.mocked(idbKeyval.get).mockResolvedValue(storedNfts);

			const result = await getIdbAllNfts(mockPrincipal);

			expect(result).toHaveLength(mockNfts.length);

			result?.forEach((nft, i) => {
				expect(nft.id).toBe(mockNfts[i].id);
				expect(nft.name).toBe(mockNfts[i].name);
				expect(typeof nft.collection.id).toBe('symbol');
				expect(typeof nft.collection.network.id).toBe('symbol');
				expect(nft.collection.id.description).toBe(mockNfts[i].collection.id.description);
				expect(nft.collection.network.id.description).toBe(
					mockNfts[i].collection.network.id.description
				);
			});
		});
	});

	describe('clearIdbNfts', () => {
		it('should clear the NFTs IDB store', async () => {
			await clearIdbNfts();

			expect(idbKeyval.clear).toHaveBeenCalledExactlyOnceWith(expect.any(Object));
		});
	});
});
