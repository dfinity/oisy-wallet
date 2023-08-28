<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { addressStore, addressStoreNotLoaded } from '$lib/stores/address.store';
	import { isBusy } from '$lib/stores/busy.store';
	import { Modal } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { modalReceive, modalStore } from '$lib/stores/modal.store';
	import AddressQRCode from '$lib/components/address/AddressQRCode.svelte';

	let disabled: boolean;
	$: disabled = $addressStoreNotLoaded || $isBusy;
</script>

<button
	class="flex-1 secondary"
	{disabled}
	class:opacity-50={disabled}
	on:click={modalStore.openReceive}
>
	<IconReceive size="28" />
	<span>Receive</span></button
>

<Modal visible={$modalReceive} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Receive ETH</svelte:fragment>

	<p class="font-bold">Wallet address</p>
	<p class="flex gap-1 mb-2 font-normal sm:items-center">
		<output class="break-words">{$addressStore ?? ''}</output><Copy value={$addressStore ?? ''} />
	</p>

	<AddressQRCode />
</Modal>
