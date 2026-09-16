import {
	clearIdbSolTransactionDetails,
	getIdbSolTransactionDetail,
	setIdbSolTransactionDetail
} from '$sol/api/idb-sol-transaction-details.api';
import {
	SOLANA_TRANSACTION_DETAILS_CACHE_SIZE,
	SOLANA_TRANSACTION_DETAILS_CACHE_SLACK
} from '$sol/constants/sol.constants';
import { type SolanaNetworkType, SolanaNetworks } from '$sol/types/network';
import type { SolRpcTransaction } from '$sol/types/sol-transaction';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import { mockSolTransactionDetail } from '$tests/mocks/sol-transactions.mock';

// The suite mocks `idb-keyval` away for every spec. This one is about what actually survives a
// round trip through IndexedDB, so it runs against the real thing on `fake-indexeddb`.
vi.mock('idb-keyval', async () => await vi.importActual('idb-keyval'));

describe('idb-sol-transaction-details.api', () => {
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

	beforeEach(async () => {
		await clearIdbSolTransactionDetails();
	});

	it('should read back what it kept, with the values of the chain intact', async () => {
		const transaction = detailAt({ slot: 100n });

		await setIdbSolTransactionDetail({ network: SolanaNetworks.mainnet, transaction });

		const stored = await getIdbSolTransactionDetail({
			network: SolanaNetworks.mainnet,
			signature: transaction.signature
		});

		expect(stored).toEqual(transaction);
		// The details carry the slot, the block time and the fee as bigints, which a cache that went
		// through JSON would hand back as something else.
		expect(stored?.slot).toBe(100n);
		expect(stored?.meta?.fee).toBe(mockSolTransactionDetail.meta?.fee);
	});

	it('should keep the networks apart', async () => {
		const transaction = detailAt({ slot: 100n });

		await setIdbSolTransactionDetail({ network: SolanaNetworks.mainnet, transaction });

		const stored = await getIdbSolTransactionDetail({
			network: SolanaNetworks.devnet,
			signature: transaction.signature
		});

		expect(stored).toBeUndefined();
	});

	it('should not keep a transaction that is not finalized yet', async () => {
		const finalized = detailAt({ slot: 100n });

		const transaction = {
			...finalized,
			version: finalized.version,
			confirmationStatus: 'confirmed' as const
		};

		await setIdbSolTransactionDetail({ network: SolanaNetworks.mainnet, transaction });

		const stored = await getIdbSolTransactionDetail({
			network: SolanaNetworks.mainnet,
			signature: transaction.signature
		});

		expect(stored).toBeUndefined();
	});

	it('should return nothing for a signature it never saw', async () => {
		const stored = await getIdbSolTransactionDetail({
			network: SolanaNetworks.mainnet,
			signature: mockSolSignature()
		});

		expect(stored).toBeUndefined();
	});

	describe('once it is full', () => {
		// Trimming starts once the cache runs past its size by the slack, and takes it back to the size.
		const overCap = SOLANA_TRANSACTION_DETAILS_CACHE_SLACK + 3;

		const fill = async ({ network }: { network: SolanaNetworkType }) => {
			const transactions = Array.from(
				{ length: SOLANA_TRANSACTION_DETAILS_CACHE_SIZE + overCap },
				(_, index) => detailAt({ slot: BigInt(index + 1) })
			);

			// In batches: a thousand writes one after the other are slow enough to matter here, and the
			// cache is written concurrently in the app as well, by the pages of a resolver.
			for (let index = 0; index < transactions.length; index += 50) {
				await Promise.all(
					transactions
						.slice(index, index + 50)
						.map((transaction) => setIdbSolTransactionDetail({ network, transaction }))
				);
			}

			return transactions;
		};

		it('should drop the oldest slots and keep the newest', async () => {
			const transactions = await fill({ network: SolanaNetworks.mainnet });

			const oldest = transactions.slice(0, overCap);
			const newest = transactions.slice(overCap);

			const storedOldest = await Promise.all(
				oldest.map(({ signature }) =>
					getIdbSolTransactionDetail({ network: SolanaNetworks.mainnet, signature })
				)
			);

			expect(storedOldest.filter((stored) => stored !== undefined)).toEqual([]);

			const storedNewest = await Promise.all(
				newest.map(({ signature }) =>
					getIdbSolTransactionDetail({ network: SolanaNetworks.mainnet, signature })
				)
			);

			expect(storedNewest.filter((stored) => stored === undefined)).toEqual([]);
		});

		// One busy network must not evict what another one holds: they are capped one by one.
		it('should leave the other network alone', async () => {
			const transaction = detailAt({ slot: 1n });

			await setIdbSolTransactionDetail({ network: SolanaNetworks.devnet, transaction });

			await fill({ network: SolanaNetworks.mainnet });

			const stored = await getIdbSolTransactionDetail({
				network: SolanaNetworks.devnet,
				signature: transaction.signature
			});

			expect(stored).toEqual(transaction);
		});
	});

	it('should hold nothing once it is cleared', async () => {
		const transaction = detailAt({ slot: 100n });

		await setIdbSolTransactionDetail({ network: SolanaNetworks.mainnet, transaction });

		await clearIdbSolTransactionDetails();

		const stored = await getIdbSolTransactionDetail({
			network: SolanaNetworks.mainnet,
			signature: transaction.signature
		});

		expect(stored).toBeUndefined();
	});
});
