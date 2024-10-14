<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import type { DApp } from '$lib/types/dapp';
	import { modalDAppDetails } from '$lib/derived/modal.derived';
	import DAppModal from '$lib/components/dapps/DAppModal.svelte';
	import { nonNullish } from '@dfinity/utils';
	import DAppCard from '$lib/components/dapps/DAppCard.svelte';
	import Card from '$lib/components/dapps/Card.svelte';

	export let dApps: DApp[];

	const dispatch = createEventDispatcher();

	let selectedDApp: DApp | undefined;
	$: selectedDApp = $modalDAppDetails
		? ($modalStore?.data as DApp | undefined)
		: undefined;

	export let selectedFilter;
	$: filteredDApps = selectedFilter === 'All'
		? dApps
		: dApps.filter(dApp => dApp.categories.includes(selectedFilter));
</script>

<div class="container mx-auto py-8">
	<div class="grid grid-cols-1 md:grid-cols-2 gap-y-12 gap-x-3">
		{#each filteredDApps as dApp (dApp.name)}
			<button on:click={() => modalStore.openDAppDetails(dApp)} class="contents">
				<DAppCard dApp={dApp} />
			</button>
		{/each}

		<a href="/submit-dapp" class="no-underline flex">
			<Card class="!bg-blue-ribbon">
				<div slot="content">
					<p class="m-0 text-lg text-white font-bold">+</p>
				</div>
				<div slot="footer">
					<p class="m-0 text-lg text-white font-bold">Submit your DApp</p>
				</div>
			</Card>
		</a>
	</div>
</div>

{#if $modalDAppDetails && nonNullish(selectedDApp)}
	<DAppModal dApp={selectedDApp} />
{/if}