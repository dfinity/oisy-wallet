import { USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED } from '$env/user-transactions.env';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { ZERO } from '$lib/constants/app.constants';
import { solAddressDevnet, solAddressLocal, solAddressMainnet } from '$lib/derived/address.derived';
import type { NullishIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { absBigInt } from '$lib/utils/bigint.utils';
import { consoleError } from '$lib/utils/console.utils';
import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
import { findOldestTransaction } from '$lib/utils/transactions.utils';
import { fetchTransactionDetailForSignature, getAccountOwner } from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import { saveSolFinalizedTransactions } from '$sol/services/sol-user-transactions.services';
import { loadSplTokenMetadata } from '$sol/services/spl-token-metadata.services';
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
import { solBackendTokenId } from '$sol/utils/user-transactions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { findAssociatedTokenPda } from '@solana-program/token';
import { address as solAddress } from '@solana/kit';
import { get } from 'svelte/store';

// The fee payer is always the first signer
// https://solana.com/docs/core/fees#base-transaction-fee
export const extractFeePayer = (accountKeys: ParsedAccount[]): ParsedAccount | undefined =>
	accountKeys.length > 0 ? accountKeys.filter(({ signer }) => signer)[0] : undefined;

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
	signature,
	network,
	address,
	tokenAddress,
	tokenOwnerAddress,
	ownedTokenAccounts = []
}: {
	signature: SolSignature;
	network: SolanaNetworkType;
	address: SolAddress;
	tokenAddress?: SplTokenAddress;
	tokenOwnerAddress?: SolAddress;
	// Token accounts of the user that may hold no balance yet, known without deriving them here: a
	// caller resolving a signature for every token of a network passes all their accounts at once.
	ownedTokenAccounts?: SolAddress[];
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
	// theirs, and the associated token accounts the caller asked about, which may hold no balance
	// yet. Accounts the transaction itself opens for the user are learnt by the derivation.
	const ownedAddresses = [
		address,
		...Object.entries(addressToOwner)
			.filter(([, owner]) => owner === address)
			.map(([account]) => account),
		...(nonNullish(ataAddress) ? [ataAddress] : []),
		...ownedTokenAccounts
	];

	// What each account held going in, so a close can say what it hands back: the instruction
	// itself states no amount, and for a wrapped SOL account it is the wrapped SOL too.
	const balances = preBalances ?? [];

	const accountLamports = parsedAccountKeys.reduce<Record<SolAddress, bigint>>(
		(acc, { pubkey }, index) => {
			const lamports = balances[index];

			if (nonNullish(lamports)) {
				acc[pubkey] = lamports;
			}

			return acc;
		},
		{}
	);

	const instructionSummaries = mapSolInstructionSummaries({
		instructions: [...instructions],
		innerInstructions: [...putativeInnerInstructions].map(({ index, instructions: inner }) => ({
			index: Number(index),
			instructions: [...inner]
		})),
		ownedAddresses,
		addressToToken,
		accountLamports
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

	// Name the mints this record mentions. Best effort: an unnamed token still renders, and the
	// loader skips mints it has already asked about, so a busy wallet does not re-ask per page.
	await loadSplTokenMetadata({
		tokenAddresses: netChanges.map(({ tokenAddress }) => tokenAddress).filter(nonNullish),
		network
	});

	const summary = deriveSolTransactionSummary({
		netChanges,
		instructions: instructionSummaries
	});

	const { counterparty } = summary;

	const counterpartyOwner = nonNullish(counterparty)
		? (addressToOwner[counterparty] ?? (await getAccountOwner({ address: counterparty, network })))
		: undefined;

	// The shared type only speaks send and receive, so a swap is typed by its outgoing half and an
	// approval or authority change falls back to send too; what the transaction actually was is the
	// summary's to say, and the UI reads the summary first.
	const type: SolTransactionUi['type'] = summary.kind === 'receive' ? 'receive' : 'send';

	// A transaction that reduces to none of the three kinds has no counterparty to name: writing
	// the wallet into `to` would fabricate a transfer to self that never happened.
	const directional = summary.kind !== 'other';

	const amount = summary.spent ?? summary.received;

	// One record per signature: the transaction is the unit the user thinks in, and the summary,
	// the net and the instruction list travel with it for the modal's three tabs.
	const record: SolTransactionUi = {
		id: signature.signature,
		signature: signature.signature,
		blockNumber: Number(slot),
		timestamp: blockTime ?? ZERO,
		...(nonNullish(amount) && { value: absBigInt(amount.delta) }),
		type,
		from: type === 'send' ? address : (counterparty ?? address),
		...(directional && { to: type === 'send' ? (counterparty ?? address) : address }),
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
}: LoadNextSolTransactionsParams): Promise<ResultSuccess> => {
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
		return { success: false };
	}

	const { address: tokenAddress, owner: tokenOwnerAddress } = isTokenSpl(token)
		? token
		: { address: undefined, owner: undefined };

	const result = await loadSolTransactions({
		token,
		network,
		address,
		tokenAddress,
		tokenOwnerAddress,
		...rest
	});

	// A page that could not be fetched is not the end of the history. Signalling the end here would
	// retire the token from the Activity list for as long as it stays mounted, which is why a
	// transient RPC failure used to hide transactions until the user re-entered the page. The error
	// travels up so the caller can tell this apart from an ordinary stop and ask again later.
	if ('err' in result) {
		return { success: false, err: result.err };
	}

	if (result.transactions.length === 0) {
		signalEnd();
	}

	return { success: true };
};

const loadSolTransactions = async ({
	token: { id: tokenId },
	network,
	identity,
	tokenAddress,
	before,
	...rest
}: LoadSolTransactionsParams): Promise<
	{ transactions: SolCertifiedTransaction[] } | { err: unknown }
> => {
	const isHeadLoad = isNullish(before);

	try {
		// Always from the chain, never from the backend copy: that copy cannot carry what a row is
		// shown from, and a wrong one is never replaced (see `saveSolFinalizedTransactions`).
		const transactions = await getSolTransactions({
			network,
			identity,
			tokenAddress,
			before,
			...rest
		});

		const certifiedTransactions = mapSolCertifiedTransactions(transactions);

		// A record re-derived under its signature id supersedes the per-instruction rows the store
		// may still hold for the same signature: same transaction, older shape, different ids.
		const incomingSignatures = new Set(transactions.map(({ signature }) => String(signature)));
		const incomingIds = new Set(transactions.map(({ id }) => `${id}`));
		const staleIds = (get(solTransactionsStore)?.[tokenId] ?? [])
			.filter(
				({ data }) =>
					incomingSignatures.has(String(data.signature)) && !incomingIds.has(`${data.id}`)
			)
			.map(({ data: { id } }) => `${id}`);

		if (staleIds.length > 0) {
			solTransactionsStore.cleanUp({ tokenId, transactionIds: staleIds });
		}

		solTransactionsStore.append({
			tokenId,
			transactions: certifiedTransactions
		});

		if (USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED && transactions.length > 0) {
			saveSolFinalizedTransactions({
				identity,
				tokenId: solBackendTokenId({ network, tokenAddress }),
				transactions
			}).catch((err) => consoleError('Background save of finalized SOL transactions failed:', err));
		}

		return { transactions: certifiedTransactions };
	} catch (error: unknown) {
		if (isHeadLoad) {
			solTransactionsStore.reset(tokenId);
		}

		consoleError(`Failed to load transactions for ${tokenId.description}:`, error);

		// Distinct from an empty page: the caller must not read a failure as the end of the history.
		return { err: error };
	}
};

export const loadNextSolTransactionsByOldest = async ({
	minTimestamp,
	...rest
}: {
	identity: NullishIdentity;
	minTimestamp?: number;
	token: Token;
	signalEnd: () => void;
}): Promise<ResultSuccess> => {
	// Read at call time rather than taken as a parameter: callers page in a loop, and each round has
	// to see what the previous one appended. A list handed in would be a snapshot from before the
	// first await.
	const transactions = (get(solTransactionsStore)?.[rest.token.id] ?? []).map(({ data }) => data);

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

	return await loadNextSolTransactions({
		...rest,
		before: lastSignature
	});
};
