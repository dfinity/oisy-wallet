<script lang="ts">
	import { fade } from 'svelte/transition';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
	import { transactionsNotInitialized } from '$eth/derived/transactions.derived';
	import { ckEthMinterInfoNotInitialized } from '$icp-eth/derived/cketh.derived';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
</script>

{#if ($erc20UserTokensNotInitialized && $tokenNotInitialized) || $transactionsNotInitialized || $ckEthMinterInfoNotInitialized}
	<SkeletonCards rows={5} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
