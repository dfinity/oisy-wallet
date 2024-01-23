<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalIcSend, modalSend } from '$lib/derived/modal.derived';
	import SendModal from '$eth/components/send/SendModal.svelte';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import IconImportExport from '$lib/components/icons/IconImportExport.svelte';
	import { waitWalletReady } from '$lib/services/actions.services';

	const isDisabled = (): boolean => $addressNotLoaded;

	const openSend = async () => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		modalStore.openSend();
	};
</script>

<button
	class="hero col-span-2"
	on:click={async () => await openSend()}
	disabled={$isBusy}
	class:opacity-50={$isBusy}
>
	<IconImportExport size="28" />
	<span>Convert ETH to ckETH</span></button
>

{#if $modalSend}
	<SendModal />
{:else if $modalIcSend}
	<IcSendModal />
{/if}
