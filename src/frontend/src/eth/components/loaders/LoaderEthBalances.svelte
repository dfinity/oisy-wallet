<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { enabledEthEvmNativeTokens } from '$eth/derived/native-tokens.derived';
	import { loadErc20Balances, loadEthBalances } from '$eth/services/eth-balance.services';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { MOBILE_SHELL } from '$lib/constants/mobile.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledErc20Tokens, enabledErc4626Tokens } from '$lib/derived/tokens.derived';
	import { syncBalancesFromCache } from '$lib/services/listener.services';
	import { registerWalletRefresh } from '$lib/services/wallet-refresh.services';

	let loading = $state(false);
	let destroyed = false;
	let balanceLoad: Promise<boolean> | undefined;
	let timer = $state<NodeJS.Timeout | undefined>();

	const resetTimer = () => {
		if (nonNullish(timer)) {
			clearTimeout(timer);
			timer = undefined;
		}
	};

	const onLoad = async () => {
		if (destroyed || isNullish($ethAddress)) {
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

		const work = Promise.allSettled([
			loadEthBalances($enabledEthEvmNativeTokens),
			loadErc20Balances({
				address: $ethAddress,
				tokens: [...$enabledErc20Tokens, ...$enabledErc4626Tokens]
			})
		]).then((results) =>
			results.every((result) => result.status === 'fulfilled' && result.value?.success === true)
		);
		balanceLoad = work;
		await work;
		if (balanceLoad === work) {
			balanceLoad = undefined;
		}

		loading = false;
	};

	onMount(() =>
		MOBILE_SHELL
			? registerWalletRefresh({
					kind: 'evm',
					refresh: async (signal) => {
						if (
							!$enabledEthEvmNativeTokens.length &&
							!$enabledErc20Tokens.length &&
							!$enabledErc4626Tokens.length
						) {
							return;
						}
						if (isNullish($ethAddress)) {
							throw new Error('Ethereum address unavailable');
						}
						const address = $ethAddress;
						// Cache loading is not a network refresh and must not count as one.
						if (loading && !balanceLoad) {
							throw new Error('Ethereum balances are not ready');
						}
						let work = balanceLoad;
						if (!work) {
							const started = onLoad();
							work = balanceLoad;
							await started;
						}
						const success = await work;
						signal.throwIfAborted();
						if (!success || address !== $ethAddress) {
							throw new Error('Ethereum balance refresh failed');
						}
					}
				})
			: undefined
	);

	onDestroy(() => {
		destroyed = true;
		resetTimer();
	});

	const debounceLoad = debounce(onLoad, 1000);

	$effect(() => {
		// To trigger the load function when any of the dependencies change.
		[$ethAddress, $enabledEthEvmNativeTokens, $enabledErc20Tokens, $enabledErc4626Tokens];

		debounceLoad();
	});

	onMount(async () => {
		const principal = $authIdentity?.getPrincipal();

		if (isNullish(principal)) {
			return;
		}

		loading = true;

		await Promise.allSettled(
			[...$enabledEthEvmNativeTokens, ...$enabledErc20Tokens, ...$enabledErc4626Tokens].map(
				async ({ id: tokenId, network: { id: networkId } }) => {
					await syncBalancesFromCache({
						principal,
						tokenId,
						networkId
					});
				}
			)
		);

		loading = false;
	});
</script>

<IntervalLoader interval={WALLET_TIMER_INTERVAL_MILLIS} {onLoad} />
