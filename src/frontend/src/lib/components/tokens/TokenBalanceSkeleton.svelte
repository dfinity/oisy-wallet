<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { failedAddressNetworkIds } from '$lib/derived/failed-addresses.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CardData } from '$lib/types/token-card';

	interface Props {
		data: CardData;
		children: Snippet;
	}

	let { data, children }: Props = $props();

	// A chain with no address can never produce a balance, so its row must not keep shimmering as if
	// one were on the way. Decided from the failed address rather than from the balance, because the
	// balance cannot express it: a chain that is merely slow and a chain that will never derive both
	// have no balance, and a chain whose balance was restored from the IDB cache has a *stale* one
	// that would otherwise be presented as current.
	//
	// Token groups are deliberately excluded: a group spanning a failed chain and a working one has a
	// partial balance rather than an absent one, which is the open question PRODUCT.md already
	// records for the hero total.
	let addressUnavailable = $derived(
		nonNullish(data.network) && $failedAddressNetworkIds.includes(data.network.id)
	);
</script>

{#if addressUnavailable}
	<output class="break-all">{$i18n.tokens.balance.error.not_applicable}</output>
{:else if data.balance === undefined}
	<span class="mt-1 block w-full max-w-[50px]"><SkeletonText /></span>
{:else}
	{@render children()}
{/if}
