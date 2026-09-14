import { SOLANA_TRANSACTION_DETAIL_CONCURRENCY } from '$sol/constants/sol.constants';
import { findSolTokenAccounts, mergeSignatureSources } from '$sol/services/sol-signatures.services';
import { fetchSolTransactionsForSignature } from '$sol/services/sol-transactions.services';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type {
	SolResolvedTransaction,
	SolSignatureWithSources,
	SolTransactionUi
} from '$sol/types/sol-transaction';
import type { SplToken, SplTokenAddress } from '$sol/types/spl';
import { nonNullish } from '@dfinity/utils';

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
 * The result keeps the page's order, one entry per signature that derives to a record, with the
 * sources the pager tagged it with. A signature that derives to nothing (an associated token
 * account lookup returns transactions that never touched anything of the user's) is left out, and
 * so is every signature in `known`. A failed fetch rejects the call, so that the caller retries
 * rather than taking a partial page for a complete one.
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
}): Promise<SolResolvedTransaction[]> => {
	const toResolve = [...mergeSignatureSources(signatures).values()].filter(
		({ signature }) => !(known?.has(signature) ?? false)
	);

	if (toResolve.length === 0) {
		return [];
	}

	const sourcesToTokens = await mapSolSourcesToTokens({ address, tokens });

	const ownedTokenAccounts = [...sourcesToTokens.keys()].filter((source) => source !== address);

	const records = await mapWithConcurrency<SolSignatureWithSources, SolTransactionUi | undefined>({
		items: toResolve,
		concurrency: SOLANA_TRANSACTION_DETAIL_CONCURRENCY,
		task: async (signature) => {
			const [transaction] = await fetchSolTransactionsForSignature({
				signature,
				network,
				address,
				ownedTokenAccounts
			});

			return transaction;
		}
	});

	return toResolve.reduce<SolResolvedTransaction[]>((acc, { sources }, index) => {
		const transaction = records[index];

		return nonNullish(transaction) ? [...acc, { transaction, sources }] : acc;
	}, []);
};
