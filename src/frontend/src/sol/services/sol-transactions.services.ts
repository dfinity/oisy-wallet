import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { ZERO } from '$lib/constants/app.constants';
import { solAddressDevnet, solAddressLocal, solAddressMainnet } from '$lib/derived/address.derived';
import type { SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
import { findOldestTransaction } from '$lib/utils/transactions.utils';
import { fetchTransactionDetailForSignature, getAccountOwner } from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import type { SolanaNetworkType } from '$sol/types/network';
import type { LoadNextSolTransactionsParams, LoadSolTransactionsParams } from '$sol/types/sol-api';
import type {
	ParsedAccount,
	SolMappedTransaction,
	SolRpcTransaction,
	SolSignature,
	SolTransactionUi
} from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { mapSolParsedInstruction } from '$sol/utils/sol-instructions.utils';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { findAssociatedTokenPda } from '@solana-program/token';
import { address as solAddress } from '@solana/kit';
import { get } from 'svelte/store';

// The fee payer is always the first signer
// https://solana.com/docs/core/fees#base-transaction-fee
const extractFeePayer = (accountKeys: ParsedAccount[]): ParsedAccount | undefined =>
	accountKeys.length > 0 ? accountKeys.filter(({ signer }) => signer)[0] : undefined;

export const fetchSolTransactionsForSignature = async ({
	identity,
	signature,
	network,
	address,
	tokenAddress,
	tokenOwnerAddress
}: {
	identity: OptionIdentity;
	signature: SolSignature;
	network: SolanaNetworkType;
	address: SolAddress;
	tokenAddress?: SplTokenAddress;
	tokenOwnerAddress?: SolAddress;
}): Promise<SolTransactionUi[]> => {
	const transactionDetail: SolRpcTransaction | null = await fetchTransactionDetailForSignature({
		signature,
		network
	});

	if (isNullish(transactionDetail)) {
		return [];
	}

	const {
		blockTime,
		confirmationStatus: status,
		transaction: {
			message: { instructions, accountKeys }
		},
		meta
	} = transactionDetail;

	const { fee } = meta ?? {};
	const { pubkey: feePayer } = extractFeePayer([...(accountKeys ?? [])]) ?? {};

	const putativeInnerInstructions = meta?.innerInstructions ?? [];

	// Inside the instructions there could be some that we are unable to decode, but that may have
	// simpler (and decoded) inner instructions. We should try to map those as well.
	// They are inserted in the instructions array in the order they refer to the main instruction.
	const { allInstructions } = [...putativeInnerInstructions]
		.sort((a, b) => a.index - b.index)
		.reduce(
			({ allInstructions, offset }, { index, instructions }) => {
				const insertIndex = index + offset + 1;
				allInstructions.splice(insertIndex, 0, ...instructions);
				return { allInstructions, offset: offset + instructions.length };
			},
			{ allInstructions: [...instructions], offset: 0 }
		);

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
			addressToToken: Record<SolAddress, SplTokenAddress>;
		}>
	>(
		async (acc, instruction, idx) => {
			const {
				parsedTransactions,
				cumulativeBalances: accCumulativeBalances,
				addressToToken: accAddressToToken
			} = await acc;

			const mappedTransaction = await mapSolParsedInstruction({
				identity,
				instruction: {
					...instruction,
					programAddress: instruction.programId
				},
				network,
				cumulativeBalances: accCumulativeBalances,
				addressToToken: accAddressToToken
			});

			if (isNullish(mappedTransaction)) {
				return acc;
			}

			const { value, from, to, tokenAddress: mappedTokenAddress } = mappedTransaction;

			// To avoid an excessive amount of call to the Solana RPC, we keep track of the token address
			// associated with a certain address. This way, we can skip the call to request the account info
			// for mapping a certain transaction to its specific token.
			const addressToToken = {
				...accAddressToToken,
				...(nonNullish(mappedTokenAddress) && {
					[from]: mappedTokenAddress,
					[to]: mappedTokenAddress
				})
			};

			// The cumulative balances are updated for every instruction, so we can keep track of the
			// SOL balance of the address and its associated token account at any given time.
			// It is useful when mapping for example a `closeAccount` instruction, where the redeemed value
			// is not provided in the data and must be calculated as the latest total SOL balance of the Associated Token Account.
			const cumulativeBalances = {
				...accCumulativeBalances,
				// We include WSOL in the calculation, because it is used to affect the SOL balance of the ATA.
				...((isNullish(mappedTokenAddress) || mappedTokenAddress === WSOL_TOKEN.address) && {
					[from]: (accCumulativeBalances[from] ?? ZERO) - value,
					[to]: (accCumulativeBalances[to] ?? ZERO) + value
				})
			};

			// Ignoring the instruction if the transaction is not related to the address or its associated token account.
			if (from !== address && to !== address && from !== ataAddress && to !== ataAddress) {
				return { parsedTransactions, cumulativeBalances, addressToToken };
			}

			// If the token address is not the one we are looking for, we can skip this instruction.
			// In case of Solana native tokens, the token address is undefined.
			if (mappedTokenAddress !== tokenAddress) {
				return { parsedTransactions, cumulativeBalances, addressToToken };
			}

			const fromOwner: SolTransactionUi['fromOwner'] = await getAccountOwner({
				address: from,
				network
			});

			const toOwner: SolTransactionUi['toOwner'] = nonNullish(to)
				? await getAccountOwner({ address: to, network })
				: undefined;

			const newTransaction: SolTransactionUi = {
				id: `${signature.signature}-${idx}-${instruction.programId}`,
				signature: signature.signature,
				timestamp: blockTime ?? ZERO,
				value,
				type: address === from || ataAddress === from ? 'send' : 'receive',
				from,
				...(nonNullish(fromOwner) && { fromOwner }),
				to,
				...(nonNullish(toOwner) && { toOwner }),
				status,
				// Since the fee is assigned to a single signature, it is not entirely correct to assign it to each transaction.
				// Particularly, we are repeating the same fee for each instruction in the transaction.
				// However, we should have it anyway saved in the transaction, so we can display it in the UI.
				...(nonNullish(fee) && nonNullish(feePayer) && { fee: address === feePayer ? fee : ZERO })
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
				cumulativeBalances,
				addressToToken
			};
		},
		Promise.resolve({ parsedTransactions: [], cumulativeBalances: {}, addressToToken: {} })
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
	token,
	signalEnd,
	...rest
}: LoadNextSolTransactionsParams): Promise<void> => {
	const {
		network: { id: networkId }
	} = token;

	const address = isNetworkIdSOLDevnet(networkId)
		? get(solAddressDevnet)
		: isNetworkIdSOLLocal(networkId)
			? get(solAddressLocal)
			: get(solAddressMainnet);

	const network = mapNetworkIdToNetwork(token.network.id);

	if (isNullish(network) || isNullish(address)) {
		return;
	}

	const { address: tokenAddress, owner: tokenOwnerAddress } = isTokenSpl(token)
		? token
		: { address: undefined, owner: undefined };

	const transactions = await loadSolTransactions({
		token,
		network,
		address,
		tokenAddress,
		tokenOwnerAddress,
		...rest
	});

	if (transactions.length === 0) {
		signalEnd();
	}
};

const loadSolTransactions = async ({
	token: { id: tokenId },
	network,
	...rest
}: LoadSolTransactionsParams): Promise<SolCertifiedTransaction[]> => {
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
			tokenId,
			transactions: certifiedTransactions
		});

		return certifiedTransactions;
	} catch (error: unknown) {
		solTransactionsStore.reset(tokenId);

		console.error(`Failed to load transactions for ${tokenId.description}:`, error);
		return [];
	}
};

export const loadNextSolTransactionsByOldest = async ({
	minTimestamp,
	transactions,
	...rest
}: {
	identity: OptionIdentity;
	minTimestamp: number;
	transactions: SolTransactionUi[];
	token: Token;
	signalEnd: () => void;
}): Promise<ResultSuccess> => {
	// If there are no transactions, we let the worker load the first ones
	if (transactions.length === 0) {
		return { success: false };
	}

	const lastTransaction = findOldestTransaction(transactions);

	const { timestamp: minIcTimestamp, signature: lastSignature } = lastTransaction ?? {};

	if (
		nonNullish(minIcTimestamp) &&
		normalizeTimestampToSeconds(minIcTimestamp) <= normalizeTimestampToSeconds(minTimestamp)
	) {
		return { success: false };
	}

	await loadNextSolTransactions({
		...rest,
		before: lastSignature
	});

	return { success: true };
};
