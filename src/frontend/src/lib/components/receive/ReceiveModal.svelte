<script lang="ts">
	import { modalReceive } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import { Modal } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ReceiveMetamask from '$lib/components/receive/ReceiveMetamask.svelte';
	import { networkAddress } from '$lib/derived/network.derived';
</script>

<Modal visible={$modalReceive} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Receive</svelte:fragment>

	<p class="font-bold text-center">Address:</p>
	<p class="mb-4 font-normal text-center">
		<output class="break-all">{$networkAddress ?? ''}</output><Copy
			inline
			value={$networkAddress ?? ''}
			text="Address copied to clipboard."
		/>
	</p>

	<ReceiveQRCode />

	<ReceiveMetamask />

	<button class="primary full center text-center mt-12 mb-6" on:click={modalStore.close}
		>Done</button
	>
</Modal>
