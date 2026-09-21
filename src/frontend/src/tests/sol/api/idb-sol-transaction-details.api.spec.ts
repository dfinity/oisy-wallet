import { SOLANA_TRANSACTION_DETAILS_CACHE_SIZE } from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
import { type SolanaNetworkType, SolanaNetworks } from '$sol/types/network';
import type { SolRpcTransaction } from '$sol/types/sol-transaction';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import { mockSolTransactionDetail } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';

// The suite mocks `idb-keyval` away for every spec. This one is about what actually survives a
// round trip through IndexedDB, so it runs against the real thing on `fake-indexeddb`.
vi.mock('idb-keyval', async () => await vi.importActual('idb-keyval'));

describe('idb-sol-transaction-details.api', () => {
	// A realm (the worker, the main thread, or either after a reload) loads its own copy of the
	// module. IndexedDB itself is shared.
	const loadRealm = async () => {
		vi.resetModules();

		return await import('$sol/api/idb-sol-transaction-details.api');
	};

	type Realm = Awaited<ReturnType<typeof loadRealm>>;

	const detailAt = ({ slot }: { slot: bigint }): SolRpcTransaction => {
		const signature = mockSolSignature();

		return {
			...mockSolTransactionDetail,
			// Spreading the details drops the version of the transaction, as it does in the API itself.
			version: mockSolTransactionDetail.version,
			slot,
			id: signature,
			signature,
			confirmationStatus: 'finalized'
		};
	};

	const address = mockSolAddress;
	const otherAddress = mockSolAddress2;

	const read = ({
		realm,
		network = SolanaNetworks.mainnet,
		transaction,
		address: readAddress = address
	}: {
		realm: Realm;
		network?: SolanaNetworkType;
		transaction: SolRpcTransaction;
		address?: SolAddress;
	}) => realm.getIdbSolTransactionDetail({ address: readAddress, network, signature: transaction });

	let realm: Realm;

	beforeEach(async () => {
		// Each test starts from an empty cache.
		await (await loadRealm()).clearIdbSolTransactionDetails();

		realm = await loadRealm();
	});

	it('should read back what it kept, with the values of the chain intact', async () => {
		const transaction = detailAt({ slot: 100n });

		await realm.setIdbSolTransactionDetail({
			address,
			network: SolanaNetworks.mainnet,
			transaction
		});

		const stored = await read({ realm, transaction });

		expect(stored).toEqual(transaction);
		// The details carry the slot, the block time and the fee as bigints, which a cache that went
		// through JSON would hand back as something else.
		expect(stored?.slot).toBe(100n);
		expect(stored?.meta?.fee).toBe(mockSolTransactionDetail.meta?.fee);
	});

	// The point of the cache: what one realm kept, another reads, a worker's fetch included.
	it('should hand what one realm kept to another', async () => {
		const transaction = detailAt({ slot: 100n });

		await realm.setIdbSolTransactionDetail({
			address,
			network: SolanaNetworks.mainnet,
			transaction
		});

		const other = await loadRealm();

		await expect(read({ realm: other, transaction })).resolves.toEqual(transaction);
	});

	it('should keep the networks apart', async () => {
		const transaction = detailAt({ slot: 100n });

		await realm.setIdbSolTransactionDetail({
			address,
			network: SolanaNetworks.mainnet,
			transaction
		});

		await expect(
			read({ realm, network: SolanaNetworks.devnet, transaction })
		).resolves.toBeUndefined();
	});

	it('should not keep a transaction that is not finalized yet', async () => {
		const finalized = detailAt({ slot: 100n });

		const transaction = {
			...finalized,
			version: finalized.version,
			confirmationStatus: 'confirmed' as const
		};

		await realm.setIdbSolTransactionDetail({
			address,
			network: SolanaNetworks.mainnet,
			transaction
		});

		await expect(read({ realm, transaction })).resolves.toBeUndefined();
	});

	it('should return nothing for a signature it never saw', async () => {
		await expect(read({ realm, transaction: detailAt({ slot: 100n }) })).resolves.toBeUndefined();
	});

	describe('once it is full', () => {
		const overCap = 3;

		const fill = async ({ network }: { network: SolanaNetworkType }) => {
			const transactions = Array.from(
				{ length: SOLANA_TRANSACTION_DETAILS_CACHE_SIZE + overCap },
				(_, index) => detailAt({ slot: BigInt(index + 1) })
			);

			// Concurrently, as the resolver writes the details of a page: a trim running alongside a
			// write must not leave anything behind that a later trim cannot see.
			await Promise.all(
				transactions.map((transaction) =>
					realm.setIdbSolTransactionDetail({ address, network, transaction })
				)
			);

			return transactions;
		};

		it('should keep the newest slots and drop the oldest', async () => {
			const transactions = await fill({ network: SolanaNetworks.mainnet });

			const stored = await Promise.all(
				transactions.map((transaction) => read({ realm, transaction }))
			);

			expect(stored.filter((detail) => detail !== undefined)).toHaveLength(
				SOLANA_TRANSACTION_DETAILS_CACHE_SIZE
			);

			// A slot of 1000 sorts after a slot of 999 only because the slot is padded in the key.
			expect(stored.slice(0, overCap).filter((detail) => detail !== undefined)).toEqual([]);
			expect(stored.slice(overCap).filter((detail) => detail === undefined)).toEqual([]);
		});

		// One busy network must not evict what another one holds: they are capped one by one.
		it('should leave the other network alone', async () => {
			const transaction = detailAt({ slot: 1n });

			await realm.setIdbSolTransactionDetail({
				address,
				network: SolanaNetworks.devnet,
				transaction
			});

			await fill({ network: SolanaNetworks.mainnet });

			await expect(read({ realm, network: SolanaNetworks.devnet, transaction })).resolves.toEqual(
				transaction
			);
		});
	});

	describe('at sign-out', () => {
		it('should hold nothing once it is cleared', async () => {
			const transaction = detailAt({ slot: 100n });

			await realm.setIdbSolTransactionDetail({
				address,
				network: SolanaNetworks.mainnet,
				transaction
			});

			await realm.clearIdbSolTransactionDetails();

			await expect(read({ realm: await loadRealm(), transaction })).resolves.toBeUndefined();
		});
	});

	// A finalized transaction is the same for everyone, so the entries could have been shared. They
	// are not: a shared key says nothing about who wrote it, so an entry left behind at sign-out could
	// not be told apart and revealed which transactions the previous user's wallet had looked at.
	describe('between wallets', () => {
		it('should not serve one wallet what another kept', async () => {
			const transaction = detailAt({ slot: 100n });

			await realm.setIdbSolTransactionDetail({
				address,
				network: SolanaNetworks.mainnet,
				transaction
			});

			await expect(read({ realm, transaction, address: otherAddress })).resolves.toBeUndefined();
		});

		it('should cap each wallet on its own', async () => {
			const transaction = detailAt({ slot: 1n });

			await realm.setIdbSolTransactionDetail({
				address: otherAddress,
				network: SolanaNetworks.mainnet,
				transaction
			});

			await Promise.all(
				Array.from({ length: SOLANA_TRANSACTION_DETAILS_CACHE_SIZE + 3 }, (_, index) =>
					detailAt({ slot: BigInt(index + 1) })
				).map((detail) =>
					realm.setIdbSolTransactionDetail({
						address,
						network: SolanaNetworks.mainnet,
						transaction: detail
					})
				)
			);

			await expect(read({ realm, transaction, address: otherAddress })).resolves.toEqual(
				transaction
			);
		});
	});
});
