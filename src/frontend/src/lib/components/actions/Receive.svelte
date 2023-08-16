<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { addressStore, addressStoreNotLoaded } from '$lib/stores/address.store';
	import { isBusy } from '$lib/stores/busy.store';
	import { Modal, QRCode } from '@dfinity/gix-components';
	import IconETHQRCode from '$lib/components/icons/IconETHQRCode.svelte';

	let disabled;
	$: disabled = $addressStoreNotLoaded || $isBusy;

	let visible = false;
</script>

<button
	class="flex-1 secondary"
	{disabled}
	class:opacity-50={disabled}
	on:click={() => (visible = true)}
>
	<IconReceive size="28" />
	<span>Receive</span></button
>

<Modal {visible} on:nnsClose={() => (visible = false)}>
	<svelte:fragment slot="title">Receive ETH</svelte:fragment>

	<div
		class="p-4 rounded-sm"
		style="border: 1px solid var(--color-vampire-black); max-width: 360px; margin: 0 auto;"
	>
		<QRCode value={$addressStore}>
			<div
				class="p-1.5 rounded-sm bg-ghost-white flex flex-col items-center justify-center"
				slot="logo"
			>
				<IconETHQRCode />
			</div>
		</QRCode>
	</div>
</Modal>
