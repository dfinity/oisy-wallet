<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalSend } from '$lib/derived/modal.derived';
	import SendModal from '$eth/components/send/SendModal.svelte';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { i18n } from '$lib/stores/i18n.store';

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
	class="hero"
	on:click={async () => await openSend()}
	disabled={$isBusy}
	class:opacity-50={$isBusy}
>
	<IconSend size="28" />
	<span>{$i18n.send.text.send}</span></button
>

{#if $modalSend}
	<SendModal />
{/if}
