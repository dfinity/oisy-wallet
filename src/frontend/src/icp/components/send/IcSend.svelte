<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { modalIcSend } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { ICP_NETWORK_ID } from '$env/networks.env';
	import type { Token } from '$lib/types/token';
	import { loadTokenAndRun } from '$icp/services/token.services';
	import SendButtonWithModal from '$lib/components/send/SendButtonWithModal.svelte';

	export let token: Token;

	const openSend = async (modalId: symbol) => {
		const callback = async () => modalStore.openIcSend(modalId);
		await loadTokenAndRun({ token, callback });
	};
</script>

<SendButtonWithModal open={openSend} isOpen={$modalIcSend}>
	<IcSendModal networkId={ICP_NETWORK_ID} on:nnsClose slot="modal" />
</SendButtonWithModal>
