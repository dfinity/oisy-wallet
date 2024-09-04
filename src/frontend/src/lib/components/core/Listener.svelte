<script lang="ts">
	import type { ComponentType } from 'svelte';
	import type { OptionToken } from '$lib/types/token';
	import EthListener from '$eth/components/core/EthListener.svelte';
	import { isNetworkIdBitcoin, isNetworkIdICP } from '$lib/utils/network.utils';
	import { isNullish } from '@dfinity/utils';
	import NoListener from '$lib/components/core/NoListener.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import BitcoinListener from '$btc/components/BitcoinListener.svelte';

	export let token: OptionToken;

	let cmp: ComponentType;
	$: cmp =
		isNullish(token) || !$authSignedIn
			? NoListener
			: isNetworkIdICP(token.network.id)
				? NoListener
				: isNetworkIdBitcoin(token.network.id)
					? BitcoinListener
					: EthListener;
</script>

<svelte:component this={cmp} {token}>
	<slot />
</svelte:component>
