<script lang="ts">
	import { erc20TokensNotInitialized } from '$eth/derived/erc20.derived';
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { ERC20_CONTRACTS } from '$env/tokens.erc20.env';
</script>

{#if $erc20TokensNotInitialized}
	<SkeletonCards rows={ERC20_CONTRACTS.length + 1} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
