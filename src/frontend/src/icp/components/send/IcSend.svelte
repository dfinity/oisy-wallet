<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { modalIcSend } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { ICP_NETWORK_ID } from '$env/networks.env';
	import SendButton from '$lib/components/send/SendButton.svelte';
	import type { Token } from '$lib/types/token';
	import { loadTokenAndRun } from '$icp/services/token.services';

	export let token: Token;
	export let compact = false;

	const modalId = Symbol();

	const openSend = async () => {
		const callback = async () => modalStore.openIcSend(modalId);
		await loadTokenAndRun({ token, callback });
	};
</script>

<SendButton on:click={openSend} {compact} />

{#if $modalIcSend && $modalStore?.data === modalId}
	<IcSendModal networkId={ICP_NETWORK_ID} on:nnsClose />
{/if}
