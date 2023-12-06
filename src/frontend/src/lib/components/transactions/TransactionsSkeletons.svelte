<script lang="ts">
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { transactionsNotInitialized } from '$lib/derived/transactions.derived';
	import { erc20Tokens, erc20TokensNotInitialized } from '$lib/derived/erc20.derived';
	import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import { nonNullish } from '@dfinity/utils';
	import { routeToken } from '$lib/derived/nav.derived';

	let tokenInitialized: boolean;
	$: tokenInitialized =
		$routeToken === ETHEREUM_TOKEN.name ||
		nonNullish($erc20Tokens.find(({ name }) => name === $routeToken));
</script>

{#if ($erc20TokensNotInitialized && !tokenInitialized) || $transactionsNotInitialized}
	<SkeletonCards rows={5} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
