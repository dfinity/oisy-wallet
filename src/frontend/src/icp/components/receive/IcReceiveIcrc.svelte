<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import IcReceiveInfoIcrc from '$icp/components/receive/IcReceiveInfoIcrc.svelte';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import { modalIcrcReceive } from '$lib/derived/modal.derived';
	import { getContext } from 'svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	export let compact = false;

	const modalId = Symbol();

	const { open, close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const openReceive = async () => {
		modalStore.openIcrcReceive(modalId);
	};
</script>

<ReceiveButton {compact} on:click={async () => await open(openReceive)} />

{#if $modalIcrcReceive && $modalStore?.data === modalId}
	<IcReceiveModal infoCmp={IcReceiveInfoIcrc} on:nnsClose={close} />
{/if}
