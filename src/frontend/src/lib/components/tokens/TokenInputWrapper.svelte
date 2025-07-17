<script lang="ts">
	import {
		isNetworkIdArbitrum,
		isNetworkIdBase,
		isNetworkIdBsc,
		isNetworkIdICP,
		isNetworkIdPolygon
	} from '$lib/utils/network.utils';
	import { isNetworkIdETH } from '$icp/utils/ic-send.utils';
	import type { NetworkId } from '$lib/types/network';
	import type { Snippet } from 'svelte';

	interface Props {
		tokenNetworkId?: NetworkId;
		tokenInput: Snippet;
		showWrapper: boolean;
	}

	let { tokenNetworkId, tokenInput, showWrapper }: Props = $props();
</script>

{#if showWrapper}
	<div
		class="bg-linear-to-b relative z-0 mb-2 rounded-xl py-0.5 pl-1.5 pr-0.5"
		class:from-eth-0={isNetworkIdETH(tokenNetworkId)}
		class:to-eth-100={isNetworkIdETH(tokenNetworkId)}
		class:from-base-0={isNetworkIdBase(tokenNetworkId)}
		class:to-base-100={isNetworkIdBase(tokenNetworkId)}
		class:from-bsc-0={isNetworkIdBsc(tokenNetworkId)}
		class:to-bsc-100={isNetworkIdBsc(tokenNetworkId)}
		class:from-polygon-0={isNetworkIdPolygon(tokenNetworkId)}
		class:to-polygon-100={isNetworkIdPolygon(tokenNetworkId)}
		class:from-arbitrum-0={isNetworkIdArbitrum(tokenNetworkId)}
		class:to-arbitrum-100={isNetworkIdArbitrum(tokenNetworkId)}
		class:from-icp-0={isNetworkIdICP(tokenNetworkId)}
		class:to-icp-100={isNetworkIdICP(tokenNetworkId)}
	>
		{@render tokenInput?.()}
		<div class="-z-1 absolute bottom-0.5 left-1.5 right-0.5 top-0.5 rounded-xl bg-secondary"></div>
	</div>
{:else}
	<div class="mb-2">
		{@render tokenInput?.()}
	</div>
{/if}
