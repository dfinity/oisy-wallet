<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalIcSend, modalSend } from '$lib/derived/modal.derived';
	import SendModal from '$eth/components/send/SendModal.svelte';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import { waitWalletReady } from '$lib/services/actions.services';

	const isDisabled = (): boolean => $addressNotLoaded;

	const openSend = async () => {
		if ($networkICP) {
			modalStore.openIcSend();
			return;
		}

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
	class="hero"
	on:click={async () => await openSend()}
	disabled={$isBusy}
	class:opacity-50={$isBusy}
>
	<IconSend size="28" />
	<span>Send</span></button
>

{#if $modalSend}
	<SendModal />
{:else if $modalIcSend}
	<IcSendModal />
{/if}
