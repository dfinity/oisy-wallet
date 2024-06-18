<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import { isRouteTokens } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import IcReceiveInfoICP from '$icp/components/receive/IcReceiveInfoICP.svelte';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import { modalIcpReceive } from '$lib/derived/modal.derived';
	import { getContext } from 'svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	export let compact = false;

	const modalId = Symbol();

	const { tokenStandard, open, close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const openReceive = async () => {
		if ($tokenStandard === 'icp' || isRouteTokens($page)) {
			modalStore.openIcpReceive(modalId);
			return;
		}

		modalStore.openReceive(modalId);
	};
</script>

<ReceiveButton {compact} on:click={async () => await open(openReceive)} />

{#if $modalIcpReceive && $modalStore?.data === modalId}
	<IcReceiveModal infoCmp={IcReceiveInfoICP} on:nnsClose={close} />
{/if}
