<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { modalEthSend } from '$lib/derived/modal.derived';
	import EthSendModal from '$eth/components/send/EthSendModal.svelte';
	import { waitWalletReady } from '$lib/services/actions.services';
	import SendButton from '$lib/components/send/SendButton.svelte';
	import { loadTokenAndRun } from '$icp/services/token.services';
	import type { Token } from '$lib/types/token';

	export let token: Token;

	const modalId = Symbol();

	const isDisabled = (): boolean => $addressNotLoaded;

	const openSend = async () => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		const callback = async () => modalStore.openEthSend(modalId);
		await loadTokenAndRun({ token, callback });
	};
</script>

<SendButton on:click={async () => await openSend()} />

{#if $modalEthSend && $modalStore?.data === modalId}
	<EthSendModal on:nnsClose />
{/if}
