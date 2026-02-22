<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadErc20Balances, loadEthBalances } from '$eth/services/eth-balance.services';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledErc20Tokens, enabledErc4626Tokens } from '$lib/derived/tokens.derived';
	import { syncBalancesFromCache } from '$lib/services/listener.services';

	let loading = $state(false);
	let timer = $state<NodeJS.Timeout | undefined>();

	const resetTimer = () => {
		if (nonNullish(timer)) {
			clearTimeout(timer);
			timer = undefined;
		}
	};

	const onLoad = async () => {
		if (isNullish($ethAddress)) {
			return;
		}

		if (loading) {
			resetTimer();

			timer = setTimeout(() => {
				resetTimer();

				onLoad();
			}, 500);

			return;
		}

		loading = true;

		await Promise.allSettled([
			// We might require Ethereum balance on IC network as well given that one can convert ckETH to ETH.
			loadEthBalances([...$enabledEthereumTokens, ...$enabledEvmTokens]),
			loadErc20Balances({
				address: $ethAddress,
				tokens: [...$enabledErc20Tokens, ...$enabledErc4626Tokens]
			})
		]);

		loading = false;
	};

	const debounceLoad = debounce(onLoad, 1000);

	$effect(() => {
		// To trigger the load function when any of the dependencies change.
		[
			$ethAddress,
			$enabledEthereumTokens,
			$enabledEvmTokens,
			$enabledErc20Tokens,
			$enabledErc4626Tokens
		];

		debounceLoad();
	});

	onMount(async () => {
		const principal = $authIdentity?.getPrincipal();

		if (isNullish(principal)) {
			return;
		}

		loading = true;

		await Promise.allSettled(
			[
				...$enabledEthereumTokens,
				...$enabledEvmTokens,
				...$enabledErc20Tokens,
				...$enabledErc4626Tokens
			].map(async ({ id: tokenId, network: { id: networkId } }) => {
				await syncBalancesFromCache({
					principal,
					tokenId,
					networkId
				});
			})
		);

		loading = false;
	});
</script>

<IntervalLoader interval={WALLET_TIMER_INTERVAL_MILLIS} {onLoad} />
