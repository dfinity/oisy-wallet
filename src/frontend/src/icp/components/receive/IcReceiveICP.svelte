<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/state';
	import IcReceiveInfoICP from '$icp/components/receive/IcReceiveInfoICP.svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import { isTokenIcp } from '$icp/utils/icrc.utils';
	import ReceiveAddressModal from '$lib/components/receive/ReceiveAddressModal.svelte';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import { modalIcpReceive } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { isRouteTokens } from '$lib/utils/nav.utils';

	const { tokenStandard, open, close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const openReceive = (modalId: symbol) => {
		if (isTokenIcp({ standard: $tokenStandard }) || isRouteTokens(page)) {
			modalStore.openIcpReceive(modalId);
			return;
		}

		modalStore.openEthReceive(modalId);
	};

	const openModal = async (modalId: symbol) => await open(async () => await openReceive(modalId));
</script>

<ReceiveButtonWithModal isOpen={$modalIcpReceive} open={openModal}>
	{#snippet modal()}
		<ReceiveAddressModal infoCmp={IcReceiveInfoICP} on:nnsClose={close} />
	{/snippet}
</ReceiveButtonWithModal>
