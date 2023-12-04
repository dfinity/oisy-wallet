<script lang="ts">
	import { erc20TokensNotInitialized } from '$lib/derived/erc20.derived';
	import { fade } from 'svelte/transition';
	import { ERC20_CONTRACTS_ADDRESSES } from '$lib/constants/erc20.constants';
	import Card from '$lib/components/ui/Card.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';

	let cards: number[];
	$: cards = Array.from({ length: ERC20_CONTRACTS_ADDRESSES.length + 1 }, (_, i) => i);
</script>

{#if $erc20TokensNotInitialized}
	{#each cards as _}
		<Card>
			<span class="inline-block max-w-full w-[120px] sm:w-[200px]"><SkeletonText /></span>

			<span class="inline-block w-full max-w-[100px]" slot="amount"><SkeletonText /></span>

			<SkeletonLogo slot="icon" />
		</Card>
	{/each}
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
