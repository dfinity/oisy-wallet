import { USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED } from '$env/user-transactions.env';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { solAddressDevnet, solAddressLocal, solAddressMainnet } from '$lib/derived/address.derived';
import { enabledSplTokens } from '$lib/derived/tokens.derived';
import type { Token, TokenId } from '$lib/types/token';
import type {
	LoadOlderTransactions,
	LoadOlderTransactionsParams
} from '$lib/types/transactions-pagination';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
import { SOLANA_MAX_SKIPPED_SIGNATURE_PAGES } from '$sol/constants/sol.constants';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { cleanUpStaleSolTransactions } from '$sol/services/sol-listener.services';
import {
	mapSolSourcesToTokens,
	resolveSolSignatures
} from '$sol/services/sol-resolve-signatures.services';
import { getSolSignatures } from '$sol/services/sol-signatures.services';
import { saveSolFinalizedTransactions } from '$sol/services/sol-user-transactions.services';
import { calculateAssociatedTokenAddress } from '$sol/services/spl-accounts.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolSignaturesCursor } from '$sol/types/sol-api';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplToken } from '$sol/types/spl';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { solBackendTokenId } from '$sol/utils/user-transactions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

interface SolPager {
	// What the cursor was made for. A cursor is only valid for the sources it was made for, so a
	// pager whose key no longer matches starts over rather than resuming.
	key: string;
	cursor?: SolSignaturesCursor;
	ended: boolean;
	// The oldest block time among the signatures the pager has returned. Every one of its sources has
	// handed over everything newer, so this, and never the oldest record a store holds, is what a
	// floor is compared with.
	oldestTimestamp?: bigint;
	inFlight?: Promise<ResultSuccess>;
	// Every token that paged through this pager, so that the end reaches all of them at once.
	signalEnds: Map<TokenId, () => void>;
}

interface SolPagerSource {
	key: string;
	network: SolanaNetworkType;
	wallet: SolAddress;
	// The tokens of the network: every record is derived with all their accounts as the user's.
	splTokens: SplToken[];
	// The tokens this pager writes to.
	tokens: Token[];
	// Every token of the network, whose records the pager reuses rather than fetching them again.
	networkTokens: Token[];
	// What the pager pages through, as `getSolSignatures` takes it: its first source, plus the
	// associated token account of each token in `tokensList`.
	signatures: () => Promise<{ address: SolAddress; tokensList: SplToken[] }>;
	// The tokens a record belongs to, from the sources that returned its signature (spec 3.2).
	route: () => Promise<(sources: SolAddress[]) => Token[]>;
}

// One pager per Solana network for the Activity list, one per token for the token's own page. Kept
// here rather than derived from the store: the store is filled from several places, and "its
// oldest record" as a cursor has already stopped history loading once.
const networkPagers = new Map<SolanaNetworkType, SolPager>();
const tokenPagers = new Map<TokenId, SolPager>();

export const resetSolHistoryPagers = () => {
	networkPagers.clear();
	tokenPagers.clear();
};

const solWalletOf = (networkId: Token['network']['id']): SolAddress | undefined =>
	(isNetworkIdSOLDevnet(networkId)
		? get(solAddressDevnet)
		: isNetworkIdSOLLocal(networkId)
			? get(solAddressLocal)
			: get(solAddressMainnet)) ?? undefined;

const networkTokensOf = (
	networkId: Token['network']['id']
): { native: Token | undefined; splTokens: SplToken[] } => ({
	native: get(enabledSolanaTokens).find(({ network: { id } }) => id === networkId),
	splTokens: get(enabledSplTokens).filter(({ network: { id } }) => id === networkId)
});

const splTokensKey = (splTokens: SplToken[]): string =>
	splTokens
		.map(({ address, owner }) => `${address}/${owner}`)
		.sort()
		.join(',');

const networkPagerSource = (token: Token): SolPagerSource | undefined => {
	const {
		network: { id: networkId }
	} = token;

	const network = mapNetworkIdToNetwork(networkId);
	const wallet = solWalletOf(networkId);

	if (isNullish(network) || isNullish(wallet)) {
		return;
	}

	const { native, splTokens } = networkTokensOf(networkId);

	const tokens = [...(nonNullish(native) ? [native] : []), ...splTokens];

	return {
		key: `${wallet}:${splTokensKey(splTokens)}`,
		network,
		wallet,
		splTokens,
		tokens,
		networkTokens: tokens,
		signatures: () => Promise.resolve({ address: wallet, tokensList: splTokens }),
		route: async () => {
			const sourceToMint = await mapSolSourcesToTokens({ address: wallet, tokens: splTokens });
			const tokenByMint = new Map(splTokens.map((splToken) => [splToken.address, splToken]));

			return (sources) =>
				sources.reduce<Token[]>((acc, source) => {
					const mint = sourceToMint.get(source);

					const owner =
						mint === null ? native : nonNullish(mint) ? tokenByMint.get(mint) : undefined;

					return nonNullish(owner) && !acc.includes(owner) ? [...acc, owner] : acc;
				}, []);
		}
	};
};

const tokenPagerSource = (token: Token): SolPagerSource | undefined => {
	const {
		network: { id: networkId }
	} = token;

	const network = mapNetworkIdToNetwork(networkId);
	const wallet = solWalletOf(networkId);

	if (isNullish(network) || isNullish(wallet)) {
		return;
	}

	const { native, splTokens: networkSplTokens } = networkTokensOf(networkId);

	const splTokens =
		isTokenSpl(token) && !networkSplTokens.some(({ id }) => id === token.id)
			? [...networkSplTokens, token]
			: networkSplTokens;

	const networkTokens = [...(nonNullish(native) ? [native] : []), ...splTokens];

	return {
		key: wallet,
		network,
		wallet,
		splTokens,
		tokens: [token],
		networkTokens: networkTokens.some(({ id }) => id === token.id)
			? networkTokens
			: [...networkTokens, token],
		// Only the token's own source, so that scrolling a token does not page through the history
		// of the others. `getSolSignatures` pages its first address as a source of its own.
		signatures: async () => ({
			address: isTokenSpl(token)
				? await calculateAssociatedTokenAddress({
						owner: wallet,
						tokenAddress: token.address,
						tokenOwnerAddress: token.owner
					})
				: wallet,
			tokensList: []
		}),
		route: () => Promise.resolve(() => [token])
	};
};

const pagerFor = ({
	pagers,
	id,
	key
}: {
	pagers: Map<SolanaNetworkType | TokenId, SolPager>;
	id: SolanaNetworkType | TokenId;
	key: string;
}): SolPager => {
	const existing = pagers.get(id);

	if (nonNullish(existing) && existing.key === key) {
		return existing;
	}

	const pager: SolPager = { key, ended: false, signalEnds: new Map() };

	pagers.set(id, pager);

	return pager;
};

const reachedFloor = ({
	pager: { oldestTimestamp },
	minTimestamp
}: {
	pager: SolPager;
	minTimestamp?: number;
}): boolean =>
	nonNullish(minTimestamp) &&
	nonNullish(oldestTimestamp) &&
	normalizeTimestampToSeconds(oldestTimestamp) <= normalizeTimestampToSeconds(minTimestamp);

// The records the tokens already hold, by signature. Only records kept under their signature id
// count: a per-instruction row of the older shape is fetched again, so that it gets replaced.
const heldSolRecords = (tokens: Token[]): Map<string, SolTransactionUi> => {
	const store = get(solTransactionsStore);

	return new Map(
		tokens.flatMap(({ id: tokenId }) =>
			(store?.[tokenId] ?? [])
				.filter(({ data: { id, signature } }) => `${id}` === String(signature))
				.map(({ data }) => [String(data.signature), data] as const)
		)
	);
};

// Writes each token the records it does not hold yet. Resolves to how many were written.
const writeSolRecords = ({
	recordsByToken,
	network,
	identity
}: {
	recordsByToken: Map<Token, SolTransactionUi[]>;
	network: SolanaNetworkType;
	identity: LoadOlderTransactionsParams['identity'];
}): number =>
	[...recordsByToken].reduce((written, [token, records]) => {
		const { id: tokenId } = token;

		const heldIds = new Set(
			(get(solTransactionsStore)?.[tokenId] ?? []).map(({ data: { id } }) => `${id}`)
		);

		const newRecords = records.filter(({ id }) => !heldIds.has(`${id}`));

		if (newRecords.length === 0) {
			return written;
		}

		cleanUpStaleSolTransactions({ tokenId, transactions: newRecords });

		solTransactionsStore.append({
			tokenId,
			transactions: newRecords.map((data) => ({ data, certified: false }))
		});

		if (USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED) {
			saveSolFinalizedTransactions({
				identity,
				tokenId: solBackendTokenId({
					network,
					tokenAddress: isTokenSpl(token) ? token.address : undefined
				}),
				transactions: newRecords
			}).catch((err) => consoleError('Background save of finalized SOL transactions failed:', err));
		}

		return written + newRecords.length;
	}, 0);

const pageOnce = async ({
	pager,
	source: { network, wallet, splTokens, networkTokens, signatures: signaturesOf, route },
	identity
}: {
	pager: SolPager;
	source: SolPagerSource;
	identity: LoadOlderTransactionsParams['identity'];
}): Promise<number> => {
	const { address, tokensList } = await signaturesOf();

	const { signatures, cursor } = await getSolSignatures({
		address,
		network,
		tokensList,
		cursor: pager.cursor
	});

	// A record the network already holds under one token is handed to the others as it is, rather
	// than fetched and derived again.
	const held = heldSolRecords(networkTokens);

	const resolved = await resolveSolSignatures({
		address: wallet,
		network,
		tokens: splTokens,
		signatures,
		known: new Set(held.keys())
	});

	const records = new Map([
		...held,
		...resolved.map(({ transaction }) => [String(transaction.signature), transaction] as const)
	]);

	const tokensOf = await route();

	const recordsByToken = signatures.reduce<Map<Token, SolTransactionUi[]>>(
		(acc, { signature, sources }) => {
			const record = records.get(String(signature));

			if (isNullish(record)) {
				return acc;
			}

			tokensOf(sources).forEach((token) => acc.set(token, [...(acc.get(token) ?? []), record]));

			return acc;
		},
		new Map()
	);

	const written = writeSolRecords({ recordsByToken, network, identity });

	// Moved only once the page is written, so that a failure leaves the cursor where it was and the
	// same page is asked for again.
	pager.cursor = cursor;
	pager.ended = isNullish(cursor);

	const oldestTimestamp = signatures.reduce<bigint | undefined>(
		(acc, { blockTime }) =>
			isNullish(blockTime) ? acc : isNullish(acc) || blockTime < acc ? BigInt(blockTime) : acc,
		undefined
	);

	if (nonNullish(oldestTimestamp)) {
		pager.oldestTimestamp = oldestTimestamp;
	}

	return written;
};

// A page can bring nothing new: it can be empty while a source walks through a crowded slot, or
// hold only signatures the tokens already have. Neither is the end, and returning on it would leave
// the caller with no progress, so a few more pages are asked for in the same call.
const pageUntilRecords = async ({
	pager,
	source,
	identity,
	minTimestamp
}: {
	pager: SolPager;
	source: SolPagerSource;
	identity: LoadOlderTransactionsParams['identity'];
	minTimestamp?: number;
}): Promise<ResultSuccess> => {
	try {
		for (let page = 0; page <= SOLANA_MAX_SKIPPED_SIGNATURE_PAGES; page++) {
			const written = await pageOnce({ pager, source, identity });

			if (pager.ended) {
				pager.signalEnds.forEach((signalEnd) => signalEnd());

				break;
			}

			if (written > 0 || reachedFloor({ pager, minTimestamp })) {
				break;
			}
		}

		return { success: true };
	} catch (err: unknown) {
		// Not the end of the history: the cursor is kept, and the next call asks for the same page.
		consoleError('Failed to load older Solana transactions:', err);

		return { success: false };
	}
};

const loadOlder = async ({
	pagers,
	id,
	source,
	token: { id: tokenId },
	identity,
	minTimestamp,
	signalEnd
}: LoadOlderTransactionsParams & {
	pagers: Map<SolanaNetworkType | TokenId, SolPager>;
	id: SolanaNetworkType | TokenId;
	source: SolPagerSource | undefined;
}): Promise<ResultSuccess> => {
	// Signed out, or no address yet: whatever the pager held was for a wallet that is gone.
	if (isNullish(source)) {
		pagers.delete(id);

		return { success: false };
	}

	const pager = pagerFor({ pagers, id, key: source.key });

	pager.signalEnds.set(tokenId, signalEnd);

	if (pager.ended) {
		signalEnd();

		return { success: false };
	}

	// Several tokens paging in the same round share the page in flight rather than each asking for
	// the next one.
	if (nonNullish(pager.inFlight)) {
		return await pager.inFlight;
	}

	if (reachedFloor({ pager, minTimestamp })) {
		return { success: false };
	}

	const inFlight = pageUntilRecords({ pager, source, identity, minTimestamp }).finally(() => {
		if (pager.inFlight === inFlight) {
			pager.inFlight = undefined;
		}
	});

	pager.inFlight = inFlight;

	return await inFlight;
};

/**
 * Pages the history of a token's whole network, for the Activity list: every token of a network
 * shares one pager, so a record reaches all the tokens it belongs to in the same page, and both
 * sides of a swap arrive together. The end is signalled to every token that paged through it.
 */
export const loadOlderSolTransactions: LoadOlderTransactions = async (params) => {
	const {
		token,
		token: {
			network: { id: networkId }
		}
	} = params;

	const network = mapNetworkIdToNetwork(networkId);

	if (isNullish(network)) {
		return { success: false };
	}

	return await loadOlder({
		...params,
		pagers: networkPagers,
		id: network,
		source: networkPagerSource(token)
	});
};

/**
 * Pages the history of one token, for its own page: over that token's source only, so that it does
 * not page through the history of the others. A record found this way reaches that token only; the
 * network pager hands it to the others when it gets there.
 */
export const loadOlderSolTokenTransactions = (
	params: Omit<LoadOlderTransactionsParams, 'minTimestamp'>
): Promise<ResultSuccess> =>
	loadOlder({
		...params,
		pagers: tokenPagers,
		id: params.token.id,
		source: tokenPagerSource(params.token)
	});
