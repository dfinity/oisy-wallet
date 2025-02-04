<script lang="ts">
	import { slide } from 'svelte/transition';
	import Airdrop from '$lib/components/airdrops/Airdrop.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { modalStore } from '$lib/stores/modal.store';

	export let title: string;

	export let airdrops;
</script>

{#if airdrops.length > 0}
	<div class="mb-5 flex flex-col gap-6">
		<span class="text-lg font-medium text-tertiary first-letter:capitalize">{title}</span>

		{#each airdrops as d}
			<div in:slide={SLIDE_DURATION}>
				<Airdrop on:click={() => modalStore.openAirdropDetails({ airdrop: d })} airdrop={d} />
			</div>
		{/each}
	</div>
{/if}
