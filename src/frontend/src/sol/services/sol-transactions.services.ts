import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import {
	SOLANA_DEVNET_TOKEN_ID,
	SOLANA_LOCAL_TOKEN_ID,
	SOLANA_TESTNET_TOKEN_ID,
	SOLANA_TOKEN_ID
} from '$env/tokens/tokens.sol.env';
import type { SolAddress } from '$lib/types/address';
import { fetchTransactionDetailForSignature } from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import type { GetSolTransactionsParams } from '$sol/types/sol-api';
import type {
	SolMappedTransaction,
	SolSignature,
	SolTransactionUi
} from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { mapSolParsedInstruction } from '$sol/utils/sol-instructions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { findAssociatedTokenPda } from '@solana-program/token';
import { address as solAddress } from '@solana/addresses';

interface LoadNextSolTransactionsParams extends GetSolTransactionsParams {
	signalEnd: () => void;
}

export const fetchSolTransactionsForSignature = async ({
	signature,
	network,
	address,
	tokenAddress,
	tokenOwnerAddress
}: {
	signature: SolSignature;
	network: SolanaNetworkType;
	address: SolAddress;
	tokenAddress?: SplTokenAddress;
	tokenOwnerAddress?: SolAddress;
}): Promise<SolTransactionUi[]> => {
	const transactionDetail = await fetchTransactionDetailForSignature({ signature, network });

	if (isNullish(transactionDetail)) {
		return [];
	}

	const {
		blockTime,
		confirmationStatus: status,
		transaction: {
			message: { instructions }
		},
		meta
	} = transactionDetail;

	const putativeInnerInstructions = meta?.innerInstructions ?? [];

	// Inside the instructions there could be some that we are unable to decode, but that may have
	// simpler (and decoded) inner instructions. We should try to map those as well.
	// They are inserted in the instructions array in the order they refer to the main instruction.
	const allInstructions = [...putativeInnerInstructions]
		.sort((a, b) => a.index - b.index)
		.reduce((acc, { index, instructions }, offset) => {
			const insertIndex = index + 1 + offset;
			return [...acc.slice(0, insertIndex), ...instructions, ...acc.slice(insertIndex)];
		}, instructions);

	const [ataAddress] =
		nonNullish(tokenAddress) && nonNullish(tokenOwnerAddress)
			? await findAssociatedTokenPda({
					owner: solAddress(address),
					tokenProgram: solAddress(tokenOwnerAddress),
					mint: solAddress(tokenAddress)
				})
			: [undefined];

	const { parsedTransactions } = await allInstructions.reduce<
		Promise<{
			parsedTransactions: SolTransactionUi[];
			cumulativeBalances: Record<SolAddress, SolMappedTransaction['value']>;
		}>
	>(
		async (acc, instruction, idx) => {
			const { parsedTransactions, cumulativeBalances: accCumulativeBalances } = await acc;

			const mappedTransaction = await mapSolParsedInstruction({
				instruction: {
					...instruction,
					programAddress: instruction.programId
				},
				network,
				cumulativeBalances: accCumulativeBalances
			});

			if (isNullish(mappedTransaction)) {
				return acc;
			}

			const { value, from, to, tokenAddress: mappedTokenAddress } = mappedTransaction;

			// The cumulative balances are updated for every instruction, so we can keep track of the
			// SOL balance of the address and its associated token account at any given time.
			// It is useful when mapping for example a `closeAccount` instruction, where the redeemed value
			// is not provided in the data and must be calculated as the latest total SOL balance of the Associated Token Account.
			const cumulativeBalances = {
				...accCumulativeBalances,
				// We include WSOL in the calculation, because it is used to affect the SOL balance of the ATA.
				...((isNullish(mappedTokenAddress) || mappedTokenAddress === WSOL_TOKEN.address) && {
					[from]: (accCumulativeBalances[from] ?? 0n) - value,
					[to]: (accCumulativeBalances[to] ?? 0n) + value
				})
			};

			// Ignoring the instruction if the transaction is not related to the address or its associated token account.
			if (from !== address && to !== address && from !== ataAddress && to !== ataAddress) {
				return { parsedTransactions, cumulativeBalances };
			}

			// If the token address is not the one we are looking for, we can skip this instruction.
			// In case of Solana native tokens, the token address is undefined.
			if (mappedTokenAddress !== tokenAddress) {
				return { parsedTransactions, cumulativeBalances };
			}

			const newTransaction: SolTransactionUi = {
				id: `${signature.signature}-${idx}-${instruction.programId}`,
				signature: signature.signature,
				timestamp: blockTime ?? 0n,
				value,
				type: address === from || ataAddress === from ? 'send' : 'receive',
				from,
				to,
				status
			};

			return {
				parsedTransactions: [
					...parsedTransactions,
					newTransaction,
					...(from === to
						? [
								{
									...newTransaction,
									id: `${newTransaction.id}-self`,
									type: newTransaction.type === 'send' ? 'receive' : 'send'
								} as SolTransactionUi
							]
						: [])
				],
				cumulativeBalances
			};
		},
		Promise.resolve({ parsedTransactions: [], cumulativeBalances: {} })
	);

	// The instructions are received in the order they were executed, meaning the first instruction
	// in the list was executed first, and the last instruction was executed last.
	// However, since they all share the same timestamp, we want to display them in reverse
	// order—from the last executed instruction to the first. This ensures that when shown,
	// the most recently executed instruction appears first, maintaining a more intuitive,
	// backward-looking view of execution history.
	return parsedTransactions.reverse();
};

export const loadNextSolTransactions = async ({
	signalEnd,
	...rest
}: LoadNextSolTransactionsParams): Promise<SolCertifiedTransaction[]> => {
	const transactions = await loadSolTransactions(rest);

	if (transactions.length === 0) {
		signalEnd();
		return [];
	}

	return transactions;
};

const networkToSolTokenIdMap = {
	[SolanaNetworks.mainnet]: SOLANA_TOKEN_ID,
	[SolanaNetworks.testnet]: SOLANA_TESTNET_TOKEN_ID,
	[SolanaNetworks.devnet]: SOLANA_DEVNET_TOKEN_ID,
	[SolanaNetworks.local]: SOLANA_LOCAL_TOKEN_ID
};

const loadSolTransactions = async ({
	network,
	...rest
}: GetSolTransactionsParams): Promise<SolCertifiedTransaction[]> => {
	const solTokenIdForNetwork = networkToSolTokenIdMap[network];

	try {
		const transactions = await getSolTransactions({
			network,
			...rest
		});

		const certifiedTransactions = transactions.map((transaction) => ({
			data: transaction,
			certified: false
		}));

		solTransactionsStore.append({
			tokenId: solTokenIdForNetwork,
			transactions: certifiedTransactions
		});

		return certifiedTransactions;
	} catch (error: unknown) {
		solTransactionsStore.reset(solTokenIdForNetwork);

		console.error(`Failed to load transactions for ${solTokenIdForNetwork.description}:`, error);
		return [];
	}
};
