<script lang="ts">
	import { slide } from 'svelte/transition';
	import Airdrop from '$lib/components/airdrops/Airdrop.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';

	export let title: string;

	export let airdrops;
</script>

{#if airdrops.length > 0}
	<div class="mb-5 flex flex-col gap-4">
		<span class="text-lg font-medium text-tertiary first-letter:capitalize">{title}</span>

		{#each airdrops as d}

			<div in:slide={SLIDE_DURATION}>
				<Airdrop />
			</div>
		{/each}
	</div>
{/if}