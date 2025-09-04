import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { NVDAX_TOKEN } from '$env/tokens/tokens-spl/tokens.nvdax.env';
import { POPCAT_TOKEN } from '$env/tokens/tokens-spl/tokens.popcat.env';
import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { last } from '$lib/utils/array.utils';
import * as solApi from '$sol/api/solana.api';
import {
	fetchSignatures,
	fetchTransactionDetailForSignature,
	loadSolLamportsBalance,
	loadTokenBalance
} from '$sol/api/solana.api';
import * as solSigSvc from '$sol/services/sol-signatures.services';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import { extractFeePayer } from '$sol/services/sol-transactions.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolRpcTransaction, SolSignature, SolTransactionUi } from '$sol/types/sol-transaction';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { loadJsonFixture, sigSlug } from '$tests/utils/fixture.test-utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import * as solProgramToken from '@solana-program/token';
import {
	lamports,
	signature,
	address as solAddress,
	type ProgramDerivedAddressBump
} from '@solana/kit';

const USE_FIXTURES = true;

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

describe('sol-signatures.services integration', () => {
	describe('getSolTransactions', () => {
		// We use real addresses to test the function. Ideally, the addresses are very active ones.
		const addresses = [
			'7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
			'GZvi7ndzTYkTrbvfiwfz9ZequdCMacHCzCtadruT3e5f',
			'EAQ6MUJMEEd42u9xHZ8XHrwabG5NNVhndKnTgBzZcMtt',
			'FLAevxSbe182oYzjNqDB53g11rbvhWMF1iUCoCHFfHV4'
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

			if (USE_FIXTURES) {
				// fetchSignatures → fixtures
				vi.spyOn(solApi, 'fetchSignatures').mockImplementation(
					// eslint-disable-next-line require-await
					async ({ wallet, before }) => {
						const addr = wallet.toString();

						const file = `${sigSlug(before?.toString())}.json`;

						return loadJsonFixture<SolSignature[]>('solana', addr, 'signatures', file);
					}
				);

				// getSolTransactions → fixtures
				vi.spyOn(solSigSvc, 'getSolTransactions').mockImplementation(
					// eslint-disable-next-line require-await
					async ({ address, before, tokenAddress }) => {
						const baseParts = nonNullish(tokenAddress)
							? ['solana', address, 'tokens', tokenAddress, 'transactions']
							: ['solana', address, 'transactions'];

						const file = `${sigSlug(before)}.json`;

						return loadJsonFixture<SolTransactionUi[]>(...baseParts, file);
					}
				);

				// SOL (lamports) balance -> fixtures
				vi.spyOn(solApi, 'loadSolLamportsBalance').mockImplementation(
					// eslint-disable-next-line require-await
					async ({ address, network: _ }) => {
						const data = loadJsonFixture<Readonly<{ lamports: string }>>(
							'solana',
							address,
							'balances',
							'lamports',
							'current.json'
						);

						return lamports(BigInt(data.lamports));
					}
				);

				// SPL token balance -> fixtures (keyed by ATA address)
				vi.spyOn(solApi, 'loadTokenBalance').mockImplementation(
					// eslint-disable-next-line require-await
					async ({ ataAddress }) => {
						const data = loadJsonFixture<Readonly<{ balance: string }>>(
							'solana',
							ataAddress,
							'balances',
							'spl',
							'current.json'
						);

						return BigInt(data.balance);
					}
				);
			}
		});

		it.each(addresses)(
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

				const loadSignatures = async (
					lastSignature?: string | undefined
				): Promise<SolSignature[]> => {
					const wallet = solAddress(address);

					const beforeSignature = nonNullish(lastSignature) ? signature(lastSignature) : undefined;

					const signatures: SolSignature[] = await fetchSignatures({
						wallet,
						network: SolanaNetworks.mainnet,
						before: beforeSignature,
						limit: 10
					});

					if (signatures.length === 0) {
						return signatures;
					}

					const nextSignatures: SolSignature[] = await loadSignatures(last(signatures)?.signature);

					return [...signatures, ...nextSignatures];
				};

				const transactions = await loadTransactions();

				const signatures = await loadSignatures();

				const totalFee = await signatures.reduce<Promise<bigint>>(async (acc, signature) => {
					const accTotalFee = await acc;

					const transactionDetail: SolRpcTransaction | null =
						await fetchTransactionDetailForSignature({
							signature,
							network: SolanaNetworks.mainnet
						});

					if (isNullish(transactionDetail)) {
						return acc;
					}

					const {
						transaction: {
							message: { accountKeys }
						},
						meta
					} = transactionDetail;

					const { fee } = meta ?? {};
					const { pubkey: feePayer } = extractFeePayer([...(accountKeys ?? [])]) ?? {};

					return accTotalFee + (feePayer === address ? (fee ?? 0n) : 0n);
				}, Promise.resolve(0n));

				const { solBalance: transactionSolBalance } = transactions.reduce<{
					solBalance: bigint;
					signatures: string[];
				}>(
					({ solBalance, signatures }, { value, type, signature }) => ({
						solBalance: solBalance + (value ?? 0n) * (type === 'send' ? -1n : 1n),
						signatures: [...signatures, signature]
					}),
					{
						solBalance: 0n,
						signatures: []
					}
				);

				const fetchedSolBalance = await loadSolLamportsBalance({
					address,
					network: SolanaNetworks.mainnet
				});

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
