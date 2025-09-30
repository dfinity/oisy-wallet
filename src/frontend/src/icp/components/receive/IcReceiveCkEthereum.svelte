<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import EthFeeStoreContext from '$eth/components/fee/EthFeeStoreContext.svelte';
	import { erc20UserTokens } from '$eth/derived/erc20.derived';
	import { nativeEthereumTokenWithFallback } from '$eth/derived/token.derived';
	import IcReceiveCkEthereumModal from '$icp/components/receive/IcReceiveCkEthereumModal.svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import type { IcCkToken } from '$icp/types/ic-token';
	import { autoLoadUserToken } from '$icp-eth/services/user-token.services';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalCkETHReceive } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { modalStore } from '$lib/stores/modal.store';

	const { ckEthereumTwinToken, open, close } =
		getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const destinationToken = $derived(nonNullish($pageToken) ? ($pageToken as IcCkToken) : undefined);

	const sourceToken = $derived($ckEthereumTwinToken);

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

<ReceiveButtonWithModal isOpen={$modalCkETHReceive} open={openModal}>
	{#snippet modal()}
		{#if nonNullish(sourceToken) && nonNullish(destinationToken)}
			<EthFeeStoreContext token={$nativeEthereumTokenWithFallback}>
				<IcReceiveCkEthereumModal {destinationToken} {sourceToken} on:nnsClose={close} />
			</EthFeeStoreContext>
		{/if}
	{/snippet}
</ReceiveButtonWithModal>
