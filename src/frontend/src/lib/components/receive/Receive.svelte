<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { onMount } from 'svelte';
	import { initMetamaskSupport } from '$lib/services/metamask.services';
	import { metamaskAvailable, metamaskNotInitialized } from '$lib/derived/metamask.derived';

	let disabled: boolean;
	$: disabled = $addressNotLoaded || $isBusy || $metamaskNotInitialized;

	const receive = async () => {
		if ($metamaskAvailable) {
			// TODO
			return;
		}

		modalStore.openReceive();
	};

	onMount(initMetamaskSupport);
</script>

<button class="flex-1 secondary" {disabled} class:opacity-50={disabled} on:click={receive}>
	<IconReceive size="28" />
	<span>Receive</span></button
>

<ReceiveModal />
