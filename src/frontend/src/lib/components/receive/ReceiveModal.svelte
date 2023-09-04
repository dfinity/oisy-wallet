<script lang="ts">
	import { modalReceive } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { addressStore } from '$lib/stores/address.store';
	import AddressQRCode from '$lib/components/address/AddressQRCode.svelte';
	import { Modal } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
</script>

<Modal visible={$modalReceive} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Receive ETH</svelte:fragment>

	<p class="font-bold">Wallet address</p>
	<p class="flex gap-1 mb-2 font-normal sm:items-center">
		<output class="break-words">{$addressStore ?? ''}</output><Copy value={$addressStore ?? ''} />
	</p>

	<AddressQRCode />
</Modal>
