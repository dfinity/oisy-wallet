<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, type Snippet, untrack } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
	import { ACTIVITY_LEVELLING_MAX_PAGES } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { transactionsStoreWithTokens } from '$lib/derived/transactions.derived';
	import {
		loadedTransactionsCount,
		loadOlderTransactionsFor
	} from '$lib/services/transactions-pagination.services';
	import type { Token, TokenId } from '$lib/types/token';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
	import { areTransactionsStoresLoaded } from '$lib/utils/transactions.utils';

	interface LoaderControls {
		/**
		 * Pages every token one step further back. Resolves to whether any new transaction was
		 * actually loaded, counted across the stores themselves so an active filter cannot make a
		 * successful fetch look empty.
		 */
		loadMore: () => Promise<boolean>;
		/** True once no enabled token has any history left to give. */
		exhausted: boolean;
	}

	interface Props {
		transactions: AllTransactionUiWithCmp[];
		children?: Snippet<[LoaderControls]>;
	}

	let { transactions, children }: Props = $props();

	let disableLoader: Record<TokenId, boolean> = $state({});

	let destroyed = $state(false);

	onDestroy(() => {
		destroyed = true;
	});

	const oldestTimestamp = (rows: AllTransactionUiWithCmp[]): number =>
		Math.min(
			...rows.map(({ transaction: { timestamp } }) =>
				nonNullish(timestamp) ? normalizeTimestampToSeconds(timestamp) : Infinity
			)
		);

	// The oldest transaction on screen across every token. Tokens whose history stops short of it
	// would leave gaps in the merged list, so they get paged down to it.
	const oldestLoadedTimestamp = (): number => oldestTimestamp(transactions);

	const pageToken = async ({
		token,
		minTimestamp
	}: {
		token: Token;
		minTimestamp?: number;
	}): Promise<boolean> => {
		const { id: tokenId } = token;

		if (destroyed || disableLoader[tokenId] || isNullish($authIdentity)) {
			return false;
		}

		const loadOlder = loadOlderTransactionsFor(token);

		if (isNullish(loadOlder)) {
			// Nothing to page for this chain; treat it as done rather than retrying every intersection.
			disableLoader[tokenId] = true;

			return false;
		}

		const { success } = await loadOlder({
			token,
			identity: $authIdentity,
			...(nonNullish(minTimestamp) && { minTimestamp }),
			signalEnd: () => (disableLoader[tokenId] = true)
		});

		return success;
	};

	// Levelling in flight per token. A run for a token already being levelled is chained after the
	// current one instead of started alongside it, so the two never fetch the same page.
	const levellingByToken = new SvelteMap<TokenId, Promise<void>>();

	// Pulls a token back until it reaches `minTimestamp`, runs out of history, or hits the page cap.
	const levelToken = ({
		token,
		minTimestamp
	}: {
		token: Token;
		minTimestamp: number;
	}): Promise<void> => {
		const run = async () => {
			// Each chain loader ends the run by returning `success: false` once its oldest loaded
			// transaction has reached the floor. The cap only guards against one that never does.
			for (let page = 0; page < ACTIVITY_LEVELLING_MAX_PAGES; page++) {
				if (!(await pageToken({ token, minTimestamp }))) {
					return;
				}
			}
		};

		const inFlight = levellingByToken.get(token.id);

		// Started right away when nothing is in flight, so the first page is requested within the same
		// update rather than a microtask later.
		const next = (isNullish(inFlight) ? run() : inFlight.then(run))
			// A failed page only ends this token's run; the others carry on.
			.catch(() => undefined);

		levellingByToken.set(token.id, next);

		return next;
	};

	const levelTokens = async ({
		tokens,
		minTimestamp
	}: {
		tokens: Token[];
		minTimestamp: number;
	}) => {
		await Promise.all(tokens.map((token) => levelToken({ token, minTimestamp })));
	};

	// The floor every token is levelled to. Set from the oldest row on screen when levelling first
	// runs, deepened by `loadMore`, and lowered by a token whose history arrives late with older rows.
	// Rows a token pages in while being levelled never move it: if they did, each run would overshoot
	// the floor, lower it, and set every other token off again, until all of them had walked back to
	// the start of their history.
	let levelFloor: number | undefined;

	// Tokens whose rows the floor already accounts for.
	const accountedTokenIds = new SvelteSet<TokenId>();

	// Stores fill at different times. Without a warm IndexedDB cache a token with little history can
	// bring in a row from months ago while a busier token still holds only its first, recent page, or
	// nothing at all yet. Levelling once after mount missed whatever arrived after it, and the scroll
	// reveals rows already in memory without asking for more, so the gap stayed on screen. Each token
	// is therefore levelled when its first rows arrive, and only then: at most once per token.
	const levelNewcomers = () => {
		if (destroyed || isNullish($authIdentity) || transactions.length === 0) {
			return;
		}

		const newcomers = $enabledFungibleNetworkTokens.filter(
			(token) => !accountedTokenIds.has(token.id) && loadedTransactionsCount(token) > 0
		);

		if (newcomers.length === 0) {
			return;
		}

		newcomers.forEach(({ id }) => accountedTokenIds.add(id));

		const newcomerIds = new Set(newcomers.map(({ id }) => id));

		const newcomersOldest = isNullish(levelFloor)
			? oldestLoadedTimestamp()
			: oldestTimestamp(transactions.filter(({ token: { id } }) => newcomerIds.has(id)));

		// Older than the current floor: every token has to reach the new one, not just the newcomers.
		if (isNullish(levelFloor) || newcomersOldest < levelFloor) {
			levelFloor = newcomersOldest;

			levelTokens({ tokens: $enabledFungibleNetworkTokens, minTimestamp: levelFloor });

			return;
		}

		levelTokens({ tokens: newcomers, minTimestamp: levelFloor });
	};

	const totalLoaded = (): number =>
		$enabledFungibleNetworkTokens.reduce(
			(total, token) => total + loadedTransactionsCount(token),
			0
		);

	const loadMore = async (): Promise<boolean> => {
		if (isNullish($authIdentity) || transactions.length === 0) {
			return false;
		}

		const loadedBefore = totalLoaded();

		// Let running levelling settle first, so the page below starts from where it left each token
		// rather than fetching the same page twice.
		await Promise.all(levellingByToken.values());

		// One unconditional page per token first: without it every token already sits at the floor
		// and levelling alone would find nothing left to do.
		await Promise.allSettled($enabledFungibleNetworkTokens.map((token) => pageToken({ token })));

		levelFloor = oldestLoadedTimestamp();

		await levelTokens({ tokens: $enabledFungibleNetworkTokens, minTimestamp: levelFloor });

		return totalLoaded() > loadedBefore;
	};

	let allStoresAreLoaded = $derived(areTransactionsStoresLoaded($transactionsStoreWithTokens));

	$effect(() => {
		if (!allStoresAreLoaded) {
			return;
		}

		[transactions];

		untrack(levelNewcomers);
	});

	let exhausted = $derived(
		$enabledFungibleNetworkTokens.length > 0 &&
			$enabledFungibleNetworkTokens.every(({ id }) => disableLoader[id] === true)
	);
</script>

{@render children?.({ loadMore, exhausted })}
