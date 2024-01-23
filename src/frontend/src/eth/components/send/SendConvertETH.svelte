<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalIcSend, modalSend } from '$lib/derived/modal.derived';
	import SendModal from '$eth/components/send/SendModal.svelte';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import IconImportExport from '$lib/components/icons/IconImportExport.svelte';

	let disabled: boolean;
	$: disabled = $addressNotLoaded || $isBusy;

	const onClick = () => {
		if ($networkICP) {
			modalStore.openIcSend();
			return;
		}

		modalStore.openSend();
	};
</script>

<button class="hero col-span-2" on:click={onClick} {disabled} class:opacity-50={disabled}>
	<IconImportExport size="28" />
	<span>Convert ETH to ckETH</span></button
>

{#if $modalSend}
	<SendModal />
{:else if $modalIcSend}
	<IcSendModal />
{/if}
