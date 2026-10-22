import { consoleError } from '$lib/utils/console.utils';
import { SOLANA_TRANSACTION_DETAIL_CONCURRENCY } from '$sol/constants/sol.constants';
import { findSolTokenAccounts, mergeSignatureSources } from '$sol/services/sol-signatures.services';
import { fetchSolTransactionsForSignature } from '$sol/services/sol-transactions.services';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import {
	SolTransactionReadError,
	type SolResolvedSignatures,
	type SolSignatureWithSources,
	type SolTransactionUi,
	type SolUnreadableTransaction
} from '$sol/types/sol-transaction';
import type { SplToken, SplTokenAddress } from '$sol/types/spl';
import { nonNullish } from '@dfinity/utils';
import {
	isSolanaError,
	SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION
} from '@solana/kit';

type SolUnreadableOutcome = Pick<SolUnreadableTransaction, 'reason' | 'errorCode'>;

// The failures that retrying cannot change: only an OISY that reads the transaction can. The RPC
// refusing it, or OISY failing to read what the RPC returned. A network error or a rate limit is
// neither.
const unreadableOutcome = (err: unknown): SolUnreadableOutcome | undefined => {
	if (isSolanaError(err, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION)) {
		return { reason: 'refused', errorCode: err.context.__code };
	}

	if (err instanceof SolTransactionReadError) {
		// What went wrong is ours to fix, and the event that reports it does not carry it.
		consoleError('Reading a Solana transaction failed:', err.cause);

		return { reason: 'unparsable' };
	}
};

/**
 * Which token each source address belongs to: the wallet maps to `null` (native SOL), the
 * associated token account of each token to its mint. The accounts come from the same derivation
 * the signature pager pages, so a source always maps to the token it was paged for.
 */
export const mapSolSourcesToTokens = async ({
	address,
	tokens
}: {
	address: SolAddress;
	tokens: Pick<SplToken, 'address' | 'owner'>[];
}): Promise<Map<SolAddress, SplTokenAddress | null>> => {
	const tokenAccounts = await findSolTokenAccounts({ wallet: address, tokens });

	return new Map<SolAddress, SplTokenAddress | null>([
		[address, null],
		...tokenAccounts.map(({ tokenAccount, tokenAddress }) => [tokenAccount, tokenAddress] as const)
	]);
};

// Runs `task` over every item with at most `concurrency` of them in flight, and keeps the input
// order in the result. After a failure no further item is started, since the call rejects anyway.
const mapWithConcurrency = async <T, R>({
	items,
	concurrency,
	task
}: {
	items: T[];
	concurrency: number;
	task: (item: T) => Promise<R>;
}): Promise<R[]> => {
	const results: R[] = new Array(items.length);

	let next = 0;
	let failed = false;

	const worker = async () => {
		while (!failed && next < items.length) {
			const index = next++;

			try {
				results[index] = await task(items[index]);
			} catch (err: unknown) {
				failed = true;

				throw err;
			}
		}
	};

	// `Promise.all` subscribes to every worker, so a second failure does not surface as an unhandled
	// rejection once the first one has rejected the call.
	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));

	return results;
};

/**
 * Turns a page of the merged signature pager into records, fetching and deriving each signature
 * once however many sources returned it. Every associated token account of the network is seeded as
 * the user's, so one derivation serves every token the signature belongs to.
 *
 * The transactions keep the page's order, one entry per signature that derives to a record, with
 * the sources the pager tagged it with. A signature that derives to nothing (an associated token
 * account lookup returns transactions that never touched anything of the user's) is left out, and
 * so is every signature in `known`.
 *
 * A transaction the RPC refuses to return, or that OISY fails to read, is left out too, and listed
 * in `unreadable`: retrying cannot change either, and failing the page on it would stop the history
 * of every token it belongs to for as long as it stays on that page. Any other failure rejects the
 * call, so that the caller retries rather than taking a partial page for a complete one.
 */
export const resolveSolSignatures = async ({
	address,
	network,
	tokens,
	signatures,
	known
}: {
	address: SolAddress;
	network: SolanaNetworkType;
	tokens: Pick<SplToken, 'address' | 'owner'>[];
	signatures: SolSignatureWithSources[];
	known?: ReadonlySet<string>;
}): Promise<SolResolvedSignatures> => {
	const toResolve = [...mergeSignatureSources(signatures).values()].filter(
		({ signature }) => !(known?.has(signature) ?? false)
	);

	if (toResolve.length === 0) {
		return { transactions: [], unreadable: [] };
	}

	const sourcesToTokens = await mapSolSourcesToTokens({ address, tokens });

	const ownedTokenAccounts = [...sourcesToTokens.keys()].filter((source) => source !== address);

	const outcomes = await mapWithConcurrency<
		SolSignatureWithSources,
		{ transaction: SolTransactionUi | undefined } | { unreadable: SolUnreadableOutcome }
	>({
		items: toResolve,
		concurrency: SOLANA_TRANSACTION_DETAIL_CONCURRENCY,
		task: async (signature) => {
			try {
				const [transaction] = await fetchSolTransactionsForSignature({
					signature,
					network,
					address,
					ownedTokenAccounts
				});

				return { transaction };
			} catch (err: unknown) {
				const unreadable = unreadableOutcome(err);

				if (nonNullish(unreadable)) {
					return { unreadable };
				}

				throw err;
			}
		}
	});

	return toResolve.reduce<SolResolvedSignatures>(
		(acc, { signature, sources }, index) => {
			const outcome = outcomes[index];

			if ('unreadable' in outcome) {
				const { unreadable } = outcome;

				return { ...acc, unreadable: [...acc.unreadable, { signature, sources, ...unreadable }] };
			}

			const { transaction } = outcome;

			return nonNullish(transaction)
				? { ...acc, transactions: [...acc.transactions, { transaction, sources }] }
				: acc;
		},
		{ transactions: [], unreadable: [] }
	);
};
