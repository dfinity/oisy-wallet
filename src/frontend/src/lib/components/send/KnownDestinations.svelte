<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import KnownDestination from '$lib/components/send/KnownDestination.svelte';
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
		sortedKnownDestinations.filter(({ address }) =>
			address.toLowerCase().includes(destination.toLowerCase())
		)
	);
</script>

{#if nonNullish(knownDestinations) && filteredKnownDestinations.length > 0}
	<div class="mb-2 mt-8" in:fade>
		<div class="mb-2 font-bold">
			{$i18n.send.text.recently_used}
		</div>

		<div class="flex flex-col overflow-y-hidden sm:max-h-[13.5rem]">
			<ul class="list-none overflow-y-auto overscroll-contain">
				{#each filteredKnownDestinations as { address, ...rest } (address)}
					<li>
						<KnownDestination
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
{/if}
