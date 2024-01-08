<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotCertified } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { metamaskNotInitialized } from '$eth/derived/metamask.derived';
	import { onMount } from 'svelte';
	import { initMetamaskSupport } from '$eth/services/metamask.services';

	let disabled: boolean;
	$: disabled = $addressNotCertified || $isBusy || $metamaskNotInitialized;

	onMount(initMetamaskSupport);
</script>

<button
	class="flex-1 hero"
	{disabled}
	class:opacity-50={disabled}
	on:click={modalStore.openReceive}
>
	<IconReceive size="28" />
	<span>Receive</span></button
>

<ReceiveModal />
