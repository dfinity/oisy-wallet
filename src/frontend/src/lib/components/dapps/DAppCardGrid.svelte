<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import type { DApp } from '$lib/types/dapp';
	import { modalDAppDetails } from '$lib/derived/modal.derived';
	import DAppModal from '$lib/components/dapps/DAppModal.svelte';
	import { nonNullish } from '@dfinity/utils';
	import SubmitDAppCard from '$lib/components/dapps/SubmitDAppCard.svelte';

	export let dApps: DApp[];

	const dispatch = createEventDispatcher();

	let selectedDApp: DApp | undefined;
	$: selectedDApp = $modalDAppDetails
		? ($modalStore?.data as DApp | undefined)
		: undefined;

	export let selectedFilter;
	$: filteredDApps = selectedFilter === "All"
		? dApps
		: dApps.filter(dApp => dApp.categories.includes(selectedFilter));
</script>

<div class="container mx-auto py-8">
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
		{#each filteredDApps as dApp (dApp.name)}
			<div class="rounded-lg shadow-md bg-white p-6 hover:shadow-lg transition-shadow cursor-pointer" on:click={() => modalStore.openDAppDetails(dApp)}>
				<img
					src={dApp.imageUrl}
					alt={dApp.name}
					class="w-16 h-16 rounded-full mx-auto mb-4"
				/>
				<h2 class="text-center text-lg font-semibold">{dApp.name}</h2>
				<p class="text-center text-gray-600 mt-2">{dApp.description}</p>
				<div class="flex justify-center mt-4 space-x-2">
					{#each dApp.tags as tag}
						<span class="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded">{tag}</span>
					{/each}
				</div>
			</div>
		{/each}

		<SubmitDAppCard />
	</div>
</div>

{#if $modalDAppDetails && nonNullish(selectedDApp)}
	<DAppModal dApp={selectedDApp} />
{/if}