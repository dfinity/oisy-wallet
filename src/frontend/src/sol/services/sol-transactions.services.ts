import {
	SOLANA_DEVNET_TOKEN_ID,
	SOLANA_LOCAL_TOKEN_ID,
	SOLANA_TESTNET_TOKEN_ID,
	SOLANA_TOKEN_ID
} from '$env/tokens/tokens.sol.env';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { SolAddress } from '$lib/types/address';
import { fetchSignatures, fetchTransactionDetailForSignature } from '$sol/api/solana.api';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import type { GetSolTransactionsParams } from '$sol/types/sol-api';
import type { SolRpcInstruction } from '$sol/types/sol-instructions';
import type { SolRpcTransaction, SolSignature, SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { mapSolParsedInstruction } from '$sol/utils/sol-instructions.utils';
import { getSolBalanceChange, mapSolTransactionUi } from '$sol/utils/sol-transactions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { address as solAddress } from '@solana/addresses';
import { signature } from '@solana/keys';

interface LoadNextSolTransactionsParams extends GetSolTransactionsParams {
	signalEnd: () => void;
}

export const fetchSolTransactionsForSignature = async ({
	signature,
	network,
	address,
	tokenAddress
}: {
	signature: SolSignature;
	network: SolanaNetworkType;
	address: SolAddress;
	tokenAddress?: SplTokenAddress;
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

	return await instructions.reduce(
		async (acc, instruction, idx) => {
			const innerInstructionsRaw =
				meta?.innerInstructions?.find(({ index }) => index === idx)?.instructions ?? [];

			const innerInstructions: SolRpcInstruction[] = innerInstructionsRaw.map(
				(innerInstruction) => ({
					...innerInstruction,
					programAddress: innerInstruction.programId
				})
			);

			const mappedTransaction = await mapSolParsedInstruction({
				instruction: {
					...instruction,
					programAddress: instruction.programId
				},
				innerInstructions,
				network
			});

			if (nonNullish(mappedTransaction) && mappedTransaction.tokenAddress === tokenAddress) {
				const { value, from, to } = mappedTransaction;

				const newTransaction: SolTransactionUi = {
					id: `${signature.signature}-${instruction.programId}`,
					signature: signature.signature,
					timestamp: blockTime ?? 0n,
					value,
					type: address === from ? 'send' : 'receive',
					from,
					to,
					status
				};

				return [
					...(await acc),
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
				];
			}

			return acc;
		},
		Promise.resolve([] as SolTransactionUi[])
	);
};

export const loadNextSolTransactions = async ({
	address,
	network,
	before,
	limit,
	signalEnd
}: LoadNextSolTransactionsParams): Promise<SolCertifiedTransaction[]> => {
	const transactions = await loadSolTransactions({
		address,
		network,
		before,
		limit
	});

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

/**
 * Fetches transactions without an error for a given wallet address.
 */
export const getSolTransactions = async ({
	address,
	network,
	before,
	limit = Number(WALLET_PAGINATION)
}: GetSolTransactionsParams): Promise<SolRpcTransaction[]> => {
	const wallet = solAddress(address);
	const beforeSignature = nonNullish(before) ? signature(before) : undefined;
	const signatures = await fetchSignatures({ network, wallet, before: beforeSignature, limit });

	const transactions = await signatures.reduce(
		async (accPromise, signature) => {
			const acc = await accPromise;
			const transactionDetail = await fetchTransactionDetailForSignature({ signature, network });
			if (
				nonNullish(transactionDetail) &&
				getSolBalanceChange({ transaction: transactionDetail, address })
			) {
				acc.push(transactionDetail);
			}
			return acc;
		},
		Promise.resolve([] as SolRpcTransaction[])
	);

	return transactions.slice(0, limit);
};

const loadSolTransactions = async ({
	address,
	network,
	before,
	limit
}: GetSolTransactionsParams): Promise<SolCertifiedTransaction[]> => {
	const solTokenIdForNetwork = networkToSolTokenIdMap[network];

	try {
		const transactions = await getSolTransactions({
			address,
			network,
			before,
			limit
		});

		const certifiedTransactions = transactions.map((transaction) => ({
			data: mapSolTransactionUi({ transaction, address }),
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
