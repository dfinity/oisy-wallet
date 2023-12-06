<script lang="ts">
	import { erc20TokensNotInitialized } from '$lib/derived/erc20.derived';
	import { fade } from 'svelte/transition';
	import { ERC20_CONTRACTS_ADDRESSES } from '$lib/constants/erc20.constants';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
</script>

{#if $erc20TokensNotInitialized}
	<SkeletonCards rows={ERC20_CONTRACTS_ADDRESSES.length + 1} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
