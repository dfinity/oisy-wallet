import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { last } from '$lib/utils/array.utils';
import { loadSolLamportsBalance } from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { notEmptyString } from '@dfinity/utils';

describe('sol-signatures.services integration', () => {
	describe('getSolTransactions', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();
		});

		it('should match the total balance of an account', async () => {
			// If the Alchemy API is empty, the test will fail, since it is required to fetch real data.
			assert(
				notEmptyString(ALCHEMY_API_KEY),
				'`ALCHEMY_API_KEY` is empty, please provide a valid key in the `.env.test` file as `VITE_ALCHEMY_API_KEY`'
			);

			// We use a real address to test the function. Ideally, the address is a very active one.
			// https://solscan.io/account/7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1
			const address = 'GZvi7ndzTYkTrbvfiwfz9ZequdCMacHCzCtadruT3e5f';

			const loadTransactions = async (
				lastSignature?: string | undefined
			): Promise<SolTransactionUi[]> => {
				const transactions = await getSolTransactions({
					identity: mockIdentity,
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

			// FIXME: I already verified that transactionSolBalance matches the sum of the amounts in the Transfer page https://solscan.io/account/GZvi7ndzTYkTrbvfiwfz9ZequdCMacHCzCtadruT3e5f#transfers
			// FIXME: The fetched balance matches too
			// FIXME: The issue is that the total fee is not correctly calculated
			expect(transactionSolBalance - totalFee).toBe(fetchedSolBalance);
		}, 600000);
	});
});
