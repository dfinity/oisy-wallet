<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { modalSend } from '$lib/derived/modal.derived';
	import SendModal from '$eth/components/send/SendModal.svelte';
	import { waitWalletReady } from '$lib/services/actions.services';
	import SendButton from '$lib/components/send/SendButton.svelte';

	export let compact = false;

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

<SendButton on:click={async () => await openSend()} {compact} />

{#if $modalSend}
	<SendModal />
{/if}
