<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import BitcoinListener from '$btc/components/core/BitcoinListener.svelte';
	import EthListener from '$eth/components/core/EthListener.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import type { OptionToken } from '$lib/types/token';
	import {
		isNetworkIdBitcoin,
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdICP
	} from '$lib/utils/network.utils';

	export let token: OptionToken;
</script>

{#if isNullish(token) || $authNotSignedIn}
	<slot />
{:else if isNetworkIdICP(token.network.id)}
	<slot />
{:else if isNetworkIdBitcoin(token.network.id)}
	<BitcoinListener>
		<slot />
	</BitcoinListener>
{:else if isNetworkIdEthereum(token.network.id) || isNetworkIdEvm(token.network.id)}
	<EthListener {token}>
		<slot />
	</EthListener>
{:else}
	<slot />
{/if}
