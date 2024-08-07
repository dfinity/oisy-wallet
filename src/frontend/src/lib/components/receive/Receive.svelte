<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import ReceiveAddressModal from '$lib/components/receive/ReceiveAddressModal.svelte';
	import { modalReceive } from '$lib/derived/modal.derived';
	import ReceiveAddresses from '$lib/components/receive/ReceiveAddresses.svelte';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';

	const modalId = Symbol();
</script>

<svelte:window on:oisyReceive={async () => modalStore.openReceive(modalId)} />

<ReceiveButtonWithModal
	openModal={modalStore.openReceive}
	isOpen={$modalReceive}
	specificModalId={modalId}
>
	<ReceiveAddressModal infoCmp={ReceiveAddresses} on:nnsClose={modalStore.close} slot="modal" />
</ReceiveButtonWithModal>
