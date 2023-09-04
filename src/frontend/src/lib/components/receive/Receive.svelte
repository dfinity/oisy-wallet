<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { isNullish } from '@dfinity/utils';
	import { metamaskStore } from '$lib/stores/metamask.store';

	let disabled: boolean;
	$: disabled = $addressNotLoaded || $isBusy || isNullish($metamaskStore);
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

<ReceiveModal />
