<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import ReceiveAddressModal from '$lib/components/receive/ReceiveAddressModal.svelte';
	import IcReceiveInfoIcrc from '$icp/components/receive/IcReceiveInfoIcrc.svelte';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import { modalIcrcReceive } from '$lib/derived/modal.derived';
	import { getContext } from 'svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	const modalId = Symbol();

	const { open, close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const openReceive = async () => {
		modalStore.openIcrcReceive(modalId);
	};
</script>

<ReceiveButton on:click={async () => await open(openReceive)} />

{#if $modalIcrcReceive && $modalStore?.data === modalId}
	<ReceiveAddressModal infoCmp={IcReceiveInfoIcrc} on:nnsClose={close} />
{/if}
