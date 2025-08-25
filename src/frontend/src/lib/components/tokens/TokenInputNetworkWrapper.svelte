<script lang="ts">
	import type { Snippet } from 'svelte';
	import { isNetworkIdETH } from '$icp/utils/ic-send.utils';
	import type { NetworkId } from '$lib/types/network';
	import {
		isNetworkIdArbitrum,
		isNetworkIdBase,
		isNetworkIdBsc,
		isNetworkIdICP,
		isNetworkIdPolygon
	} from '$lib/utils/network.utils';

	interface Props {
		tokenNetworkId?: NetworkId;
		tokenInput: Snippet;
		showGradient: boolean;
	}

	let { tokenNetworkId, tokenInput, showGradient }: Props = $props();
</script>

{#if showGradient}
	<div
		class="bg-linear-to-b relative z-0 mb-2 rounded-xl py-0.5 pl-1.5 pr-0.5"
		class:from-arbitrum-0={isNetworkIdArbitrum(tokenNetworkId)}
		class:from-base-0={isNetworkIdBase(tokenNetworkId)}
		class:from-bsc-0={isNetworkIdBsc(tokenNetworkId)}
		class:from-eth-0={isNetworkIdETH(tokenNetworkId)}
		class:from-icp-0={isNetworkIdICP(tokenNetworkId)}
		class:from-polygon-0={isNetworkIdPolygon(tokenNetworkId)}
		class:to-arbitrum-100={isNetworkIdArbitrum(tokenNetworkId)}
		class:to-base-100={isNetworkIdBase(tokenNetworkId)}
		class:to-bsc-100={isNetworkIdBsc(tokenNetworkId)}
		class:to-eth-100={isNetworkIdETH(tokenNetworkId)}
		class:to-icp-100={isNetworkIdICP(tokenNetworkId)}
		class:to-polygon-100={isNetworkIdPolygon(tokenNetworkId)}
	>
		{@render tokenInput?.()}
		<div class="-z-1 absolute inset-0.5 left-1.5 rounded-xl bg-secondary"></div>
	</div>
{:else}
	<div class="mb-2">
		{@render tokenInput?.()}
	</div>
{/if}
