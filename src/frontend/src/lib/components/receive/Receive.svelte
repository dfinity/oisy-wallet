<script lang="ts">
	import { page } from '$app/state';
	import ReceiveAddressModal from '$lib/components/receive/ReceiveAddressModal.svelte';
	import ReceiveAddresses from '$lib/components/receive/ReceiveAddresses.svelte';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import ReceiveTokenModal from '$lib/components/receive/ReceiveTokenModal.svelte';
	import { modalReceive } from '$lib/derived/modal.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { NetworkId } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import { isRouteNfts } from '$lib/utils/nav.utils';

	const modalId = Symbol();

	let isNftsPage = $derived(isRouteNfts(page));

	// Taken when the modal opens, so a page that changes underneath does not move the selection.
	let initialToken = $state<Token | undefined>();
	let preferredNetworkId = $state<NetworkId | undefined>();

	const open = (id: symbol) => {
		initialToken = $pageToken ?? undefined;
		preferredNetworkId = $networkId;

		modalStore.openReceive(id);
	};
</script>

<!-- The ckBTC information panel opens Receive with ckBTC selected. -->
<svelte:window onoisyReceiveCkBTC={() => open(modalId)} />

<ReceiveButtonWithModal isOpen={$modalReceive} {modalId} {open}>
	{#snippet modal()}
		{#if isNftsPage}
			<ReceiveAddressModal infoCmp={ReceiveAddresses} onClose={modalStore.close} />
		{:else}
			<ReceiveTokenModal {initialToken} {preferredNetworkId} />
		{/if}
	{/snippet}
</ReceiveButtonWithModal>
