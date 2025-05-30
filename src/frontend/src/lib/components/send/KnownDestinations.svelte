<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import KnownDestination from '$lib/components/send/KnownDestination.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { KnownDestinations } from '$lib/types/transactions';

	interface Props {
		knownDestinations?: KnownDestinations;
		destination: string;
	}
	let { knownDestinations, destination = $bindable() }: Props = $props();

	const dispatch = createEventDispatcher();

	let sortedKnownDestinations = $derived(
		nonNullish(knownDestinations)
			? Object.values(knownDestinations).sort(
					(destinationA, destinationB) =>
						(destinationB.timestamp ?? 0) - (destinationA.timestamp ?? 0)
				)
			: []
	);

	let filteredKnownDestinations = $derived(
		sortedKnownDestinations.filter(({ address }) => address.includes(destination))
	);
</script>

<div in:fade>
	{#if nonNullish(knownDestinations) && filteredKnownDestinations.length > 0}
		<div class="flex flex-col overflow-y-hidden sm:max-h-[13.5rem]">
			<ul class="list-none overflow-y-auto overscroll-contain">
				{#each filteredKnownDestinations as { address, ...rest } (address)}
					<li>
						<KnownDestination
							destination={address}
							{...rest}
							onClick={() => {
								destination = address;
								dispatch('icNext');
							}}
						/>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<EmptyState
			title={$i18n.send.text.recently_used_empty_state_title}
			description={$i18n.send.text.recently_used_empty_state_description}
		/>
	{/if}
</div>
