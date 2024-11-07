<script lang="ts">
	import { fade } from 'svelte/transition';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import { ethTransactionsNotInitialized } from '$eth/derived/eth-transactions.derived';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
</script>

{#if ($erc20UserTokensNotInitialized && $tokenNotInitialized) || $ethTransactionsNotInitialized}
	<SkeletonCards rows={5} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
