<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { exchangeNotInitialized } from '$lib/derived/exchange.derived';
	import { failedAddressNetworkIds } from '$lib/derived/failed-addresses.derived';
	import type { CardData } from '$lib/types/token-card';

	interface Props {
		data: CardData;
		children: Snippet;
	}

	let { data, children }: Props = $props();

	let { balance } = $derived(data);

	// See `TokenBalanceSkeleton`: without a balance there is no USD value to state, and a stale
	// cached balance would otherwise be priced and shown as a current figure.
	let addressUnavailable = $derived(
		nonNullish(data.network) && $failedAddressNetworkIds.includes(data.network.id)
	);
</script>

{#if addressUnavailable}
	<output>-</output>
{:else if balance === undefined || $exchangeNotInitialized}
	<span class="mt-1 block w-full max-w-[50px]"><SkeletonText /></span>
{:else}
	{@render children()}
{/if}
