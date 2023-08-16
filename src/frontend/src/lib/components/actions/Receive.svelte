<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { addressStoreNotLoaded } from '$lib/stores/address.store';
	import { isBusy } from '$lib/stores/busy.store';
	import { Modal } from '@dfinity/gix-components';

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
</Modal>
