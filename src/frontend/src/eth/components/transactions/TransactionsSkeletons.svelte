<script lang="ts">
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { transactionsNotInitialized } from '$eth/derived/transactions.derived';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
</script>

{#if ($erc20UserTokensNotInitialized && $tokenNotInitialized) || $transactionsNotInitialized}
	<SkeletonCards rows={5} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
