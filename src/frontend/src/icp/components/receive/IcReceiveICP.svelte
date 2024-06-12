<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import { isRouteTokens } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import IcReceiveInfoICP from '$icp/components/receive/IcReceiveInfoICP.svelte';
	import IcReceiveButton from '$icp/components/receive/IcReceiveButton.svelte';
	import { modalIcpReceive } from '$lib/derived/modal.derived';
	import {getContext} from "svelte";
	import {RECEIVE_TOKEN_CONTEXT_KEY, type ReceiveTokenContext} from "$icp/stores/receive-token.store";

	const { tokenStandard } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const openReceive = () => {
		console.log($tokenStandard)

		if ($tokenStandard === 'icp' || isRouteTokens($page)) {
			modalStore.openIcpReceive();
			return;
		}

		modalStore.openReceive();
	};
</script>

<IcReceiveButton on:click={openReceive} />

{#if $modalIcpReceive}
	<IcReceiveModal infoCmp={IcReceiveInfoICP} />
{/if}
