<script lang="ts">
	import { ICP_NETWORK_ID } from '$env/networks.env';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import SendButtonWithModal from '$lib/components/send/SendButtonWithModal.svelte';
	import { modalIcSend } from '$lib/derived/modal.derived';
	import { loadTokenAndRun } from '$lib/services/token.services';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';

	export let token: Token;

	const openSend = async (modalId: symbol) => {
		const callback = async () => modalStore.openIcSend(modalId);
		await loadTokenAndRun({ token, callback });
	};
</script>

<SendButtonWithModal open={openSend} isOpen={$modalIcSend}>
	<IcSendModal networkId={ICP_NETWORK_ID} slot="modal" />
</SendButtonWithModal>
