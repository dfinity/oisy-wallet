<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import RecentlyUsedDestination from '$lib/components/send/RecentlyUsedDestination.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { RecentlyUsedDestinations } from '$lib/types/transactions';

	interface Props {
		recentlyUsedDestinations?: RecentlyUsedDestinations;
		destination: string;
	}
	let { recentlyUsedDestinations, destination = $bindable() }: Props = $props();

	const dispatch = createEventDispatcher();

	let sortedRecentlyUsedDestinations = $derived(
		nonNullish(recentlyUsedDestinations)
			? Object.values(recentlyUsedDestinations).sort(
					(destinationA, destinationB) =>
						(destinationB.timestamp ?? 0) - (destinationA.timestamp ?? 0)
				)
			: []
	);

	let filteredRecentlyUsedDestinations = $derived(
		sortedRecentlyUsedDestinations.filter(({ address }) =>
			address.toLowerCase().includes(destination.toLowerCase())
		)
	);
</script>

{#if nonNullish(recentlyUsedDestinations) && filteredRecentlyUsedDestinations.length > 0}
	<div class="mb-2 mt-8" in:fade>
		<div class="mb-2 font-bold">
			{$i18n.send.text.recently_used}
		</div>

		<div class="flex flex-col overflow-y-hidden sm:max-h-[13.5rem]">
			<ul class="list-none overflow-y-auto overscroll-contain">
				{#each filteredRecentlyUsedDestinations as { address, ...rest } (address)}
					<li>
						<RecentlyUsedDestination
							destination={address}
							{...rest}
							on:click={() => {
								destination = address;
								dispatch('icNext');
							}}
						/>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{:else}
	<EmptyState
		title={$i18n.send.text.recently_used_empty_state_title}
		description={$i18n.send.text.recently_used_empty_state_description}
	/>
{/if}
