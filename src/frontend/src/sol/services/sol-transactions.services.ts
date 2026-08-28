import { USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED } from '$env/user-transactions.env';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { ZERO } from '$lib/constants/app.constants';
import { solAddressDevnet, solAddressLocal, solAddressMainnet } from '$lib/derived/address.derived';
import type { NullishIdentity } from '$lib/types/identity';
import type { Token, TokenId } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
import { findOldestTransaction } from '$lib/utils/transactions.utils';
import { fetchTransactionDetailForSignature, getAccountOwner } from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import {
	loadSolUserTransactions,
	saveSolFinalizedTransactions
} from '$sol/services/sol-user-transactions.services';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { LoadNextSolTransactionsParams, LoadSolTransactionsParams } from '$sol/types/sol-api';
import type {
	ParsedAccount,
	SolRpcTransaction,
	SolSignature,
	SolTransactionUi
} from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { mapSolInstructionSummaries } from '$sol/utils/sol-instruction-summary.utils';
import { mapSolNetBalanceChanges } from '$sol/utils/sol-net-changes.utils';
import { deriveSolTransactionSummary } from '$sol/utils/sol-transaction-summary.utils';
import { isTokenSpl } from '$sol/utils/spl.utils';
import {
	requiresStoredSplOwnerRefresh,
	solBackendTokenId
} from '$sol/utils/user-transactions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { findAssociatedTokenPda } from '@solana-program/token';
import { address as solAddress } from '@solana/kit';
import { get } from 'svelte/store';

// The fee payer is always the first signer
// https://solana.com/docs/core/fees#base-transaction-fee
export const extractFeePayer = (accountKeys: ParsedAccount[]): ParsedAccount | undefined =>
	accountKeys.length > 0 ? accountKeys.filter(({ signer }) => signer)[0] : undefined;

const solBackendPaginationCursors = new Map<TokenId, bigint>();

const setSolBackendPaginationCursor = ({
	tokenId,
	nextStart
}: {
	tokenId: TokenId;
	nextStart: bigint | undefined;
}) => {
	if (nonNullish(nextStart)) {
		solBackendPaginationCursors.set(tokenId, nextStart);
		return;
	}

	solBackendPaginationCursors.delete(tokenId);
};

const mapSolCertifiedTransactions = (transactions: SolTransactionUi[]): SolCertifiedTransaction[] =>
	transactions.map((transaction) => ({
		data: transaction,
		certified: false
	}));

interface SolTokenAccountMetadata {
	addressToOwner: Record<SolAddress, SolAddress>;
	addressToToken: Record<SolAddress, SplTokenAddress>;
}

type SolTokenBalance = NonNullable<
	NonNullable<SolRpcTransaction['meta']>['preTokenBalances']
>[number];

const emptySolTokenAccountMetadata: SolTokenAccountMetadata = {
	addressToOwner: {},
	addressToToken: {}
};

const extractTokenBalanceMetadata = ({
	accountKeys,
	tokenBalances
}: {
	accountKeys: ParsedAccount[];
	tokenBalances: SolTokenBalance[];
}): SolTokenAccountMetadata =>
	tokenBalances.reduce<SolTokenAccountMetadata>(
		({ addressToOwner, addressToToken }, { accountIndex, mint, owner }) => {
			const account = accountKeys[Number(accountIndex)]?.pubkey;

			if (isNullish(account) || isNullish(owner)) {
				return { addressToOwner, addressToToken };
			}

			return {
				addressToOwner: { ...addressToOwner, [account]: owner },
				addressToToken: { ...addressToToken, [account]: mint }
			};
		},
		emptySolTokenAccountMetadata
	);

export const fetchSolTransactionsForSignature = async ({
	identity: _identity,
	signature,
	network,
	address,
	tokenAddress,
	tokenOwnerAddress
}: {
	identity: NullishIdentity;
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
		slot,
		blockTime,
		confirmationStatus: status,
		transaction: {
			message: { instructions, accountKeys }
		},
		meta
	} = transactionDetail;

	const { fee, preBalances, postBalances, preTokenBalances, postTokenBalances } = meta ?? {};
	const parsedAccountKeys = [...(accountKeys ?? [])];
	const { pubkey: feePayer } = extractFeePayer([...(accountKeys ?? [])]) ?? {};
	const tokenBalanceMetadata = extractTokenBalanceMetadata({
		accountKeys: parsedAccountKeys,
		tokenBalances: [...(preTokenBalances ?? []), ...(postTokenBalances ?? [])]
	});

	const putativeInnerInstructions = meta?.innerInstructions ?? [];

	const [ataAddress] =
		nonNullish(tokenAddress) && nonNullish(tokenOwnerAddress)
			? await findAssociatedTokenPda({
					owner: solAddress(address),
					tokenProgram: solAddress(tokenOwnerAddress),
					mint: solAddress(tokenAddress)
				})
			: [undefined];

	const { addressToOwner, addressToToken } = tokenBalanceMetadata;

	// The accounts the user owns going in: the wallet, every token account the balances name as
	// theirs, and the associated token account the caller asked about, which may hold no balance
	// yet. Accounts the transaction itself opens for the user are learnt by the derivation.
	const ownedAddresses = [
		address,
		...Object.entries(addressToOwner)
			.filter(([, owner]) => owner === address)
			.map(([account]) => account),
		...(nonNullish(ataAddress) ? [ataAddress] : [])
	];

	const instructionSummaries = mapSolInstructionSummaries({
		instructions: [...instructions],
		innerInstructions: [...putativeInnerInstructions].map(({ index, instructions: inner }) => ({
			index: Number(index),
			instructions: [...inner]
		})),
		ownedAddresses,
		addressToToken
	});

	const netChanges = mapSolNetBalanceChanges({
		address,
		fee,
		feePayer,
		accountKeys: parsedAccountKeys,
		preBalances: [...(preBalances ?? [])],
		postBalances: [...(postBalances ?? [])],
		preTokenBalances: [...(preTokenBalances ?? [])],
		postTokenBalances: [...(postTokenBalances ?? [])]
	});

	// Nothing of the user's moved and nothing they own was touched: one of the false positives an
	// ATA signature lookup produces, and there is nothing to show for it.
	if (instructionSummaries.length === 0 && netChanges.length === 0) {
		return [];
	}

	const summary = deriveSolTransactionSummary({
		netChanges,
		instructions: instructionSummaries
	});

	const { counterparty } = summary;

	const counterpartyOwner = nonNullish(counterparty)
		? (addressToOwner[counterparty] ?? (await getAccountOwner({ address: counterparty, network })))
		: undefined;

	const type: SolTransactionUi['type'] = summary.kind === 'receive' ? 'receive' : 'send';

	const amount = summary.spent ?? summary.received;

	// One record per signature: the transaction is the unit the user thinks in, and the summary,
	// the net and the instruction list travel with it for the modal's three tabs.
	const record: SolTransactionUi = {
		id: signature.signature,
		signature: signature.signature,
		blockNumber: Number(slot),
		timestamp: blockTime ?? ZERO,
		...(nonNullish(amount) && { value: amount.delta < ZERO ? -amount.delta : amount.delta }),
		type,
		from: type === 'send' ? address : (counterparty ?? address),
		to: type === 'send' ? (counterparty ?? address) : address,
		...(type === 'receive' && nonNullish(counterpartyOwner) && { fromOwner: counterpartyOwner }),
		...(type === 'send' && nonNullish(counterpartyOwner) && { toOwner: counterpartyOwner }),
		status,
		...(nonNullish(fee) && nonNullish(feePayer) && { fee: address === feePayer ? fee : ZERO }),
		summary,
		netChanges,
		instructions: instructionSummaries
	};

	return [record];
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
	identity,
	address,
	tokenAddress,
	before,
	...rest
}: LoadSolTransactionsParams): Promise<SolCertifiedTransaction[]> => {
	const isHeadLoad = isNullish(before);

	try {
		const backendTokenId = solBackendTokenId({ network, tokenAddress });
		const backendCursor = solBackendPaginationCursors.get(tokenId);

		if (USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED && !isHeadLoad && nonNullish(backendCursor)) {
			const storedPage = await loadSolUserTransactions({
				identity,
				tokenId: backendTokenId,
				address,
				start: backendCursor
			});

			setSolBackendPaginationCursor({ tokenId, nextStart: storedPage?.nextStart });

			if (nonNullish(storedPage) && storedPage.transactions.length > 0) {
				const certifiedTransactions = mapSolCertifiedTransactions(storedPage.transactions);

				solTransactionsStore.append({
					tokenId,
					transactions: certifiedTransactions
				});

				return certifiedTransactions;
			}
		}

		const stored =
			USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED && isHeadLoad
				? await loadSolUserTransactions({
						identity,
						tokenId: backendTokenId,
						address
					})
				: undefined;

		if (isHeadLoad) {
			setSolBackendPaginationCursor({ tokenId, nextStart: stored?.nextStart });
		}

		const storedTransactions = stored?.transactions ?? [];

		const storedRefreshSignatures = new Set(
			storedTransactions
				.filter((transaction) =>
					requiresStoredSplOwnerRefresh({ transaction, address, tokenAddress })
				)
				.map(({ signature }) => String(signature))
		);
		const shouldRefreshStoredTransactions = storedRefreshSignatures.size > 0;

		const exitIfFirstSignatureMatches =
			USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED &&
			!shouldRefreshStoredTransactions &&
			isNullish(before) &&
			storedTransactions.length > 0 &&
			nonNullish(storedTransactions[0]?.signature)
				? String(storedTransactions[0].signature)
				: undefined;

		const newTransactions = await getSolTransactions({
			network,
			identity,
			address,
			tokenAddress,
			before,
			exitIfFirstSignatureMatches,
			...rest
		});
		const newestStoredSlot = stored?.newestBlockIndex;

		// On head loads, keep only RPC transactions newer than the backend cache.
		// Cursor pagination already asks RPC for older transactions, so those pages must not use this filter.
		const freshTransactions =
			nonNullish(newestStoredSlot) && isHeadLoad
				? newTransactions.filter(
						({ blockNumber, signature }) =>
							isNullish(blockNumber) ||
							blockNumber > Number(newestStoredSlot) ||
							storedRefreshSignatures.has(String(signature))
					)
				: newTransactions;

		const freshSignatures = new Set(freshTransactions.map(({ signature }) => String(signature)));
		const refreshedSignatures = new Set(
			[...storedRefreshSignatures].filter((signature) => freshSignatures.has(signature))
		);

		const storedTransactionsToUse = isHeadLoad
			? storedTransactions.filter(({ signature }) => !refreshedSignatures.has(String(signature)))
			: storedTransactions;

		const allTransactions = isHeadLoad
			? [...freshTransactions, ...storedTransactionsToUse]
			: freshTransactions;

		const certifiedTransactions = mapSolCertifiedTransactions(allTransactions);

		solTransactionsStore.append({
			tokenId,
			transactions: certifiedTransactions
		});

		if (USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED && freshTransactions.length > 0) {
			saveSolFinalizedTransactions({
				identity,
				tokenId: backendTokenId,
				transactions: freshTransactions
			}).catch((err) => consoleError('Background save of finalized SOL transactions failed:', err));
		}

		return mapSolCertifiedTransactions(freshTransactions);
	} catch (error: unknown) {
		if (isHeadLoad) {
			solTransactionsStore.reset(tokenId);
		}

		consoleError(`Failed to load transactions for ${tokenId.description}:`, error);
		return [];
	}
};

export const loadNextSolTransactionsByOldest = async ({
	minTimestamp,
	transactions,
	...rest
}: {
	identity: NullishIdentity;
	minTimestamp?: number;
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

	// Without a floor the caller wants one page regardless, which is how the floor gets deeper.
	if (
		nonNullish(minTimestamp) &&
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
