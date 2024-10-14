<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import type { DApp } from '$lib/types/dapp';
	import { modalDAppDetails } from '$lib/derived/modal.derived';
	import DAppModal from '$lib/components/dapps/DAppModal.svelte';
	import { nonNullish } from '@dfinity/utils';

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
					src={dApp.imageUrl || '/default-dapp-icon.png'}
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

		<div class="rounded-lg shadow-md bg-blue-500 p-6 flex items-center justify-center text-white cursor-pointer hover:bg-blue-600 transition-colors">
			<a href="/submit-dapp" class="text-center">
				<span class="block text-2xl font-semibold">+</span>
				<p class="mt-2">Submit your DApp</p>
			</a>
		</div>
	</div>
</div>

{#if $modalDAppDetails && nonNullish(selectedDApp)}
	<DAppModal dApp={selectedDApp} />
{/if}