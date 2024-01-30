<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import { Modal } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { networkAddress, networkEthereum } from '$lib/derived/network.derived';
	import ReceiveMetamask from '$eth/components/receive/ReceiveMetamask.svelte';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Receive</svelte:fragment>

	<p class="font-bold text-center">Address:</p>
	<p class="mb-4 font-normal text-center px-8">
		<output class="break-all">{$networkAddress ?? ''}</output><Copy
			inline
			value={$networkAddress ?? ''}
			text="Address copied to clipboard."
		/>
	</p>

	<ReceiveQRCode address={$networkAddress ?? ''} />

	{#if $networkEthereum}
		<ReceiveMetamask />
	{/if}

	<button class="primary full center text-center mt-12 mb-6" on:click={modalStore.close}
		>Done</button
	>
</Modal>
