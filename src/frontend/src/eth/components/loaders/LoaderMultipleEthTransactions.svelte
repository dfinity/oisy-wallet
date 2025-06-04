<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import {
		batchLoadTransactions,
		batchResultsToTokenId
	} from '$eth/services/eth-transactions-batch.services';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';
	import type { TokenId } from '$lib/types/token';

	// TODO: make it more functional
	let tokensAlreadyLoaded: TokenId[] = [];

	let loading = false;

	const onLoad = async () => {
		if (loading) {
			return;
		}

		loading = true;

		if (
			isNullish($enabledEthereumTokens) ||
			isNullish($enabledErc20Tokens) ||
			isNullish($enabledEvmTokens)
		) {
			return;
		}

		const loader = batchLoadTransactions({
			tokens: [...$enabledEthereumTokens, ...$enabledErc20Tokens, ...$enabledEvmTokens],
			tokensAlreadyLoaded
		});

		for await (const results of loader) {
			tokensAlreadyLoaded = [...tokensAlreadyLoaded, ...batchResultsToTokenId(results)];
		}

		loading = false;
	};

	const debounceLoad = debounce(onLoad, 1000);

	$: $enabledEthereumTokens, $enabledErc20Tokens, $enabledEvmTokens, debounceLoad();
</script>

<IntervalLoader {onLoad} interval={WALLET_TIMER_INTERVAL_MILLIS}>
	<slot />
</IntervalLoader>
