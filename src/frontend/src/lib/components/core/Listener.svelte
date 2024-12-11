<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import BitcoinListener from '$btc/components/core/BitcoinListener.svelte';
	import EthListener from '$eth/components/core/EthListener.svelte';
	import NoListener from '$lib/components/core/NoListener.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import type { OptionToken } from '$lib/types/token';
	import { isNetworkIdBitcoin, isNetworkIdICP } from '$lib/utils/network.utils';

	export let token: OptionToken;
</script>

{#if isNullish(token) || $authNotSignedIn}
	<NoListener>
		<slot />
	</NoListener>
{:else if isNetworkIdICP(token.network.id)}
	<NoListener>
		<slot />
	</NoListener>
{:else if isNetworkIdBitcoin(token.network.id)}
	<BitcoinListener>
		<slot />
	</BitcoinListener>
{:else}
	<EthListener {token}>
		<slot />
	</EthListener>
{/if}
