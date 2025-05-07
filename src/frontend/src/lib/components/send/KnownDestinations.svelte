<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import KnownDestination from '$lib/components/send/KnownDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { KnownDestinations } from '$lib/types/transactions';

	interface Props {
		knownDestinations?: KnownDestinations;
		destination: string;
	}
	let { knownDestinations, destination = $bindable() }: Props = $props();

	const dispatch = createEventDispatcher();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let destinations = $derived(nonNullish(knownDestinations) ? Object.keys(knownDestinations) : []);
</script>

{#if nonNullish(knownDestinations) && destinations.length > 0}
	<div class="my-10" in:fade>
		<div class="mb-2 font-bold">
			{$i18n.send.text.recently_used}
		</div>

		<ul class="list-none">
			{#each destinations as recentDestination (recentDestination)}
				<li>
					<KnownDestination
						token={$sendToken}
						destination={recentDestination}
						{...knownDestinations[recentDestination]}
						on:click={() => {
							destination = recentDestination;
							dispatch('icNext');
						}}
					/>
				</li>
			{/each}
		</ul>
	</div>
{/if}
