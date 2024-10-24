<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { ComponentType } from 'svelte';
	import BitcoinListener from '$btc/components/core/BitcoinListener.svelte';
	import EthListener from '$eth/components/core/EthListener.svelte';
	import NoListener from '$lib/components/core/NoListener.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import type { OptionToken } from '$lib/types/token';
	import { isNetworkIdBitcoin, isNetworkIdICP } from '$lib/utils/network.utils';

	export let token: OptionToken;

	let cmp: ComponentType;
	$: cmp =
		isNullish(token) || $authNotSignedIn
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
