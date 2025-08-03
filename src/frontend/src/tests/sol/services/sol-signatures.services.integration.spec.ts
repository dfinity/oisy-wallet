import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { NVDAX_TOKEN } from '$env/tokens/tokens-spl/tokens.nvdax.env';
import { POPCAT_TOKEN } from '$env/tokens/tokens-spl/tokens.popcat.env';
import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { last } from '$lib/utils/array.utils';
import { loadSolLamportsBalance, loadTokenBalance } from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { notEmptyString } from '@dfinity/utils';
import * as solProgramToken from '@solana-program/token';
import { address as solAddress, type ProgramDerivedAddressBump } from '@solana/kit';

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

describe('sol-signatures.services integration', () => {
	describe('getSolTransactions', () => {
		// We use a real address to test the function. Ideally, the address is a very active one.
		// https://solscan.io/account/7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1
		// https://solscan.io/account/GZvi7ndzTYkTrbvfiwfz9ZequdCMacHCzCtadruT3e5f
		const addresses = [
			'7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
			'GZvi7ndzTYkTrbvfiwfz9ZequdCMacHCzCtadruT3e5f'
		];
		const ataAddresses = [
			{
				address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
				ataAddress: '7xSNhASWK77oZtPyVQf1HFUXU1xxXjqkpkxVTULBmcMD',
				token: USDC_TOKEN
			},
			{
				address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
				ataAddress: 'CTZFRs7fNtgEastyD6XoBsc9ySDuZTtuRvaFbH86WRb',
				token: BONK_TOKEN
			},
			{
				address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
				ataAddress: '8E2dYm7NXBSb7qS3zRtxKDw7mjzPCqVKQCy2EDeujUC2',
				token: POPCAT_TOKEN
			},
			{
				address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
				ataAddress: '7t8FwZRQTRaqtaeGLGij4FBsH9t9Cf918inTz3BYpuA7',
				token: JUP_TOKEN
			},
			{
				address: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				ataAddress: 'EF7heUqwgeSQ153PAdH9fR3tXn8QzbnMCdbshdpraFnA',
				token: NVDAX_TOKEN
			}
		];

		beforeAll(() => {
			// If the Alchemy API is empty, the test will fail, since it is required to fetch real data.
			assert(
				notEmptyString(ALCHEMY_API_KEY),
				'`ALCHEMY_API_KEY` is empty, please provide a valid key in the `.env.test` file as `VITE_ALCHEMY_API_KEY`'
			);
		});

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();
		});

		it.skip.each(addresses)(
			'should match the total SOL balance of an account (for example, %s)',
			async (address) => {
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
			},
			600000
		);

		it.each(ataAddresses)(
			'should match the total SPL balance of an account (for example, ATA address $ataAddress for token $token.symbol)',
			async ({
				address,
				ataAddress,
				token: { address: tokenAddress, owner: tokenOwnerAddress }
			}) => {
				vi.spyOn(solProgramToken, 'findAssociatedTokenPda').mockResolvedValue([
					solAddress(ataAddress),
					123 as ProgramDerivedAddressBump
				]);

				const loadTransactions = async (
					lastSignature?: string | undefined
				): Promise<SolTransactionUi[]> => {
					const transactions = await getSolTransactions({
						identity: mockIdentity,
						address,
						network: SolanaNetworks.mainnet,
						tokenAddress,
						tokenOwnerAddress,
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

				const { balance: transactionBalance } = transactions.reduce<{
					balance: bigint;
					signatures: string[];
				}>(
					({ balance, signatures }, { value, type, signature }) => ({
						balance: balance + (value ?? 0n) * (type === 'send' ? -1n : 1n),
						signatures: [...signatures, signature]
					}),
					{ balance: 0n, signatures: [] }
				);

				const fetchedBalance = await loadTokenBalance({
					ataAddress,
					network: SolanaNetworks.mainnet
				});

				expect(transactionBalance).toBe(fetchedBalance);
			},
			600000
		);
	});
});
