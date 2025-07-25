<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
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

	interface Props {
		token: OptionToken;
		children?: Snippet;
	}

	let { token, children }: Props = $props();
</script>

{#if isNullish(token) || $authNotSignedIn}
	{@render children?.()}
{:else if isNetworkIdICP(token.network.id)}
	{@render children?.()}
{:else if isNetworkIdBitcoin(token.network.id)}
	<BitcoinListener>
		{@render children?.()}
	</BitcoinListener>
{:else if isNetworkIdEthereum(token.network.id) || isNetworkIdEvm(token.network.id)}
	<EthListener {token}>
		{@render children?.()}
	</EthListener>
{:else}
	{@render children?.()}
{/if}
