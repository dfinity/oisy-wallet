<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeStoreContext from '$eth/components/fee/FeeStoreContext.svelte';
	import { erc20UserTokens } from '$eth/derived/erc20.derived';
	import { ethereumToken } from '$eth/derived/token.derived';
	import IcReceiveCkEthereumModal from '$icp/components/receive/IcReceiveCkEthereumModal.svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import type { IcCkToken, OptionIcCkToken } from '$icp/types/ic-token';
	import { autoLoadUserToken } from '$icp-eth/services/user-token.services';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalCkETHReceive } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';

	const { ckEthereumTwinToken, open, close } =
		getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const destinationToken: OptionIcCkToken = $derived(
		nonNullish($pageToken) ? ($pageToken as IcCkToken) : undefined
	);

	const sourceToken: Token = $derived($ckEthereumTwinToken);

	const openReceive = async (modalId: symbol) => {
		const { result } = await autoLoadUserToken({
			erc20UserTokens: $erc20UserTokens,
			sendToken: $tokenWithFallback,
			identity: $authIdentity
		});

		if (result === 'error') {
			return;
		}

		modalStore.openCkETHReceive(modalId);
	};

	const openModal = async (modalId: symbol) => await open(async () => await openReceive(modalId));
</script>

<ReceiveButtonWithModal open={openModal} isOpen={$modalCkETHReceive}>
	<svelte:fragment slot="modal">
		{#if nonNullish(sourceToken) && nonNullish(destinationToken)}
			<FeeStoreContext token={$ethereumToken}>
				<IcReceiveCkEthereumModal on:nnsClose={close} {sourceToken} {destinationToken} />
			</FeeStoreContext>
		{/if}
	</svelte:fragment>
</ReceiveButtonWithModal>
