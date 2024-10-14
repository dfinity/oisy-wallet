<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Card from '$lib/components/dapps/Card.svelte';
	import DAppCard from '$lib/components/dapps/DAppCard.svelte';
	import DAppModal from '$lib/components/dapps/DAppModal.svelte';
	import { modalDAppDetails } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { DApp } from '$lib/types/dapp';

	export let dApps: DApp[];

	let selectedDApp: DApp | undefined;
	$: selectedDApp = $modalDAppDetails ? ($modalStore?.data as DApp | undefined) : undefined;
</script>

<div class="container mx-auto py-8">
	<div class="grid grid-cols-1 gap-x-3 gap-y-14 md:grid-cols-2">
		{#each dApps as dApp (dApp.name)}
			<button on:click={() => modalStore.openDAppDetails(dApp)} class="contents">
				<DAppCard {dApp} />
			</button>
		{/each}

		<a
			href="https://github.com/dfinity/oisy-wallet"
			target="_blank"
			class="flex h-[200px] no-underline"
		>
			<Card class="!bg-blue-ribbon">
				<div slot="content">
					<p class="m-0 text-lg font-bold text-white">+</p>
				</div>
				<div slot="footer">
					<p class="m-0 text-lg font-bold text-white">Submit your DApp</p>
				</div>
			</Card>
		</a>
	</div>
</div>

{#if $modalDAppDetails && nonNullish(selectedDApp)}
	<DAppModal dApp={selectedDApp} />
{/if}
