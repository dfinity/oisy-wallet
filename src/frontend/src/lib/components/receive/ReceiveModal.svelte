<script lang="ts">
	import { modalReceive } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { addressStore } from '$lib/stores/address.store';
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import { Modal } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import ReceiveMetamask from '$lib/components/receive/ReceiveMetamask.svelte';
</script>

<Modal visible={$modalReceive} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Receive</svelte:fragment>

	<p class="font-bold text-center">Address:</p>
	<p class="mb-2 font-normal text-center">
		<output class="break-words">{$addressStore ?? ''}</output><Copy
			inline
			value={$addressStore ?? ''}
			text="Address copied to clipboard."
		/>
	</p>

	<ReceiveQRCode />

	<ReceiveMetamask />

	<button class="primary full center text-center mt-6 mb-3" on:click={modalStore.close}>Done</button
	>
</Modal>
