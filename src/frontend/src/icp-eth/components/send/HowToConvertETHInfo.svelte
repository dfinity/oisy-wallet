<script lang="ts">
	import ReceiveAddress from '$icp-eth/components/receive/ReceiveAddress.svelte';
	import { address } from '$lib/derived/address.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { createEventDispatcher } from 'svelte';

	export let cancelAction: 'back' | 'close' = 'close';

	const dispatch = createEventDispatcher();
</script>

<div>
	<p>Here is how to can convert ETH to ckETH on OISY:</p>
</div>

<div class="grid grid-cols-[1fr_auto] gap-x-4 mt-4">
	<div class="overflow-hidden flex flex-col gap-2 items-center mb-2">
		<span
			class="inline-flex items-center justify-center p-3 w-4 h-4 text-misty-rose border-2 rounded-full"
			>1</span
		>

		<div class="border h-full w-0.5 border-misty-rose"></div>
	</div>

	<ReceiveAddress
		labelRef="eth-wallet-address"
		address={$address ?? ''}
		qrCodeAriaLabel="Display wallet address as a QR code"
		copyAriaLabel="Wallet address copied to clipboard."
		on:click={() => dispatch('icQRCode')}
	>
		<svelte:fragment slot="title">Send ETH to you OISY wallet address</svelte:fragment>
	</ReceiveAddress>

	<span
		class="inline-flex items-center justify-center p-3 w-4 h-4 text-misty-rose border-2 rounded-full"
		>2</span
	>

	<p class="font-bold">Convert ETH to ckETH</p>
</div>

<button class="secondary full center mt-6 mb-8" on:click={() => dispatch('icConvert')}>
	<span class="text-dark-slate-blue font-bold">Convert ETH to ckETH</span>
</button>

{#if cancelAction === 'back'}
	<button class="primary full center text-center mt-8" on:click={() => dispatch('icBack')}
		>Back</button
	>
{:else}
	<button class="primary full center text-center mb-6" on:click={modalStore.close}>Done</button>
{/if}
