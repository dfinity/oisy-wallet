<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { modalSend } from '$lib/derived/modal.derived';
	import SendModal from '$eth/components/send/SendModal.svelte';
	import { waitWalletReady } from '$lib/services/actions.services';
	import SendButton from '$lib/components/send/SendButton.svelte';
	import { loadTokenAndRun } from '$icp/services/token.services';
	import type { Token } from '$lib/types/token';

	export let token: Token;
	export let compact = false;

	const modalId = Symbol();

	const isDisabled = (): boolean => $addressNotLoaded;

	const openSend = async () => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		const callback = async () => modalStore.openSend(modalId);
		await loadTokenAndRun({ token, callback });
	};
</script>

<SendButton on:click={async () => await openSend()} {compact} />

{#if $modalSend && $modalStore?.data === modalId}
	<SendModal on:nnsClose />
{/if}
