<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, type Snippet, untrack } from 'svelte';
	import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
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

	// The oldest transaction on screen across every token. Tokens whose history stops short of it
	// would leave gaps in the merged list, so they get paged down to it.
	const oldestLoadedTimestamp = (): number =>
		Math.min(
			...transactions.map(({ transaction: { timestamp } }) =>
				nonNullish(timestamp) ? normalizeTimestampToSeconds(timestamp) : Infinity
			)
		);

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

	// Pulls each token back until it reaches `minTimestamp` or runs out of history.
	const levelToOldest = async (minTimestamp: number) => {
		const levelOne = async (token: Token) => {
			// We call the function again in case the last transaction is not the last one that we need
			while (await pageToken({ token, minTimestamp })) {
				// Each chain loader stops the loop by returning `success: false` once its oldest loaded
				// transaction has reached the floor.
			}
		};

		await Promise.allSettled($enabledFungibleNetworkTokens.map(levelOne));
	};

	let levelling: Promise<void> | undefined;

	let relevelRequested = false;

	const levelLoadedSet = async () => {
		do {
			relevelRequested = false;

			if (destroyed || isNullish($authIdentity) || transactions.length === 0) {
				return;
			}

			await levelToOldest(oldestLoadedTimestamp());
		} while (relevelRequested);
	};

	// One levelling pass at a time. A change landing mid-pass is not lost: it earns exactly one more
	// pass once the current one ends, which then sees everything that arrived in between.
	const loadMissingTransactions = (): Promise<void> => {
		if (nonNullish(levelling)) {
			relevelRequested = true;

			return levelling;
		}

		levelling = levelLoadedSet().finally(() => {
			levelling = undefined;
		});

		return levelling;
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

		// Let a running pass settle first, so the page below starts from where it left each token
		// rather than fetching the same page twice.
		await levelling;

		// One unconditional page per token first: without it every token already sits at the floor
		// and levelling alone would find nothing left to do.
		await Promise.allSettled($enabledFungibleNetworkTokens.map((token) => pageToken({ token })));

		await loadMissingTransactions();

		return totalLoaded() > loadedBefore;
	};

	let allStoresAreLoaded = $derived(areTransactionsStoresLoaded($transactionsStoreWithTokens));

	// Levelled again on every change to the loaded set, not once after mount. Stores fill at different
	// times: without a warm IndexedDB cache a token with little history can bring in a row from
	// months ago while a busier token still holds only its first, recent page, or nothing yet. A
	// single pass taken before that settles never pages the busier token down to the old row, and
	// the scroll reveals rows already in memory without asking for more, so the gap stayed on screen.
	$effect(() => {
		if (!allStoresAreLoaded) {
			return;
		}

		[transactions];

		untrack(() => loadMissingTransactions());
	});

	let exhausted = $derived(
		$enabledFungibleNetworkTokens.length > 0 &&
			$enabledFungibleNetworkTokens.every(({ id }) => disableLoader[id] === true)
	);
</script>

{@render children?.({ loadMore, exhausted })}
