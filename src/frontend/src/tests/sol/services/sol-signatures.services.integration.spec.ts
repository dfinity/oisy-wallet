import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { last } from '$lib/utils/array.utils';
import { loadSolLamportsBalance } from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { notEmptyString } from '@dfinity/utils';

describe('sol-signatures.services', () => {
	describe('getSolTransactions', () => {
		it('should match the total balance of an account', async () => {
			// If the Alchemy API is empty, the test will fail, since it is required to fetch real data.
			assert(
				notEmptyString(ALCHEMY_API_KEY),
				'`ALCHEMY_API_KEY` is empty, please provide a valid key in the `.env.test` file as `VITE_ALCHEMY_API_KEY`'
			);

			// We use a real address to test the function. Ideally, the address is a very active one.
			const address = '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1';

			const loadTransactions = async (
				lastSignature?: string | undefined
			): Promise<SolTransactionUi[]> => {
				const transactions = await getSolTransactions({
					address,
					network: SolanaNetworks.mainnet,
					before: lastSignature,
					limit: 10
				});

				if (transactions.length === 0) {
					return transactions;
				}

				const nextTransactions: SolTransactionUi[] = await loadTransactions(
					last(transactions)?.signature
				);

				return [...transactions, ...nextTransactions];
			};

			const transactions = await loadTransactions();

			const { solBalance: transactionSolBalance, totalFee } = transactions.reduce<{
				solBalance: bigint;
				totalFee: bigint;
				signatures: string[];
			}>(
				({ solBalance, totalFee, signatures }, { value, type, fee, signature }) => ({
					solBalance: solBalance + (value ?? 0n) * (type === 'send' ? -1n : 1n),
					totalFee: signatures.includes(signature) ? totalFee : totalFee + (fee ?? 0n),
					signatures: [...signatures, signature]
				}),
				{
					solBalance: 0n,
					totalFee: 0n,
					signatures: []
				}
			);

			const fetchedSolBalance = await loadSolLamportsBalance({
				address,
				network: SolanaNetworks.mainnet
			});

			expect(transactionSolBalance - totalFee).toBe(fetchedSolBalance);
		}, 600000);
	});
});
