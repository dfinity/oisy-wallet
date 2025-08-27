<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadErc20Balances, loadEthBalances } from '$eth/services/eth-balance.services';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';
	import { syncBalancesFromCache } from '$lib/services/listener.services';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	let loading = $state(false);

	const onLoad = async () => {
		if (loading) {
			return;
		}
		loading = true;

		if (isNullish($ethAddress)) {
			return;
		}

		await Promise.allSettled([
			// We might require Ethereum balance on IC network as well given that one can convert ckETH to ETH.
			loadEthBalances([...$enabledEthereumTokens, ...$enabledEvmTokens]),
			loadErc20Balances({
				address: $ethAddress,
				erc20Tokens: $enabledErc20Tokens
			})
		]);

		loading = false;
	};

	const debounceLoad = debounce(onLoad, 1000);

	$effect(() => {
		// To trigger the load function when any of the dependencies change.
		[$ethAddress, $enabledEthereumTokens, $enabledEvmTokens, $enabledErc20Tokens];
		debounceLoad();
	});

	onMount(async () => {
		const principal = $authIdentity?.getPrincipal();

		if (isNullish(principal)) {
			return;
		}

		await Promise.allSettled(
			[...$enabledEthereumTokens, ...$enabledEvmTokens, ...$enabledErc20Tokens].map(
				async ({ id: tokenId, network: { id: networkId } }) => {
					await syncBalancesFromCache({
						principal,
						tokenId,
						networkId
					});
				}
			)
		);
	});
</script>

<IntervalLoader interval={WALLET_TIMER_INTERVAL_MILLIS} {onLoad}>
	{@render children?.()}
</IntervalLoader>
