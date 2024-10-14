<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import type { DApp } from '$lib/types/dapp';
	import { modalDAppDetails } from '$lib/derived/modal.derived';
	import DAppModal from '$lib/components/dapps/DAppModal.svelte';
	import { nonNullish } from '@dfinity/utils';
	import DAppCard from '$lib/components/dapps/DAppCard.svelte';

	export let dApps: DApp[];

	const dispatch = createEventDispatcher();

	let selectedDApp: DApp | undefined;
	$: selectedDApp = $modalDAppDetails
		? ($modalStore?.data as DApp | undefined)
		: undefined;
</script>

<div class="container mx-auto py-8">
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-y-12 gap-x-3">
		{#each dApps as dApp (dApp.name)}
			<button on:click={() => modalStore.openDAppDetails(dApp)} class="contents">
				<DAppCard dApp={dApp} />
			</button>
		{/each}

		<div
			class="rounded-lg shadow-md bg-blue-500 p-6 flex items-center justify-center text-white cursor-pointer hover:bg-blue-600 transition-colors">
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