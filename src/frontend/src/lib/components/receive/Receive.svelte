<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { onMount } from 'svelte';
	import { initMetamaskSupport, openMetamaskTransaction } from '$lib/services/metamask.services';
	import { metamaskAvailable, metamaskNotInitialized } from '$lib/derived/metamask.derived';
	import { addressStore } from '$lib/stores/address.store';

	let disabled: boolean;
	$: disabled = $addressNotLoaded || $isBusy || $metamaskNotInitialized;

	const receive = async () => {
		if ($metamaskAvailable) {
			await openMetamaskTransaction($addressStore);
			return;
		}

		modalStore.openReceive();
	};

	onMount(initMetamaskSupport);
</script>

<button class="flex-1 hero" {disabled} class:opacity-0={disabled} on:click={receive}>
	<IconReceive size="28" />
	<span>Receive</span></button
>

<ReceiveModal />
