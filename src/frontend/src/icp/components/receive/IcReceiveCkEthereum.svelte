<script lang="ts">
	import { modalCkETHReceive } from '$lib/derived/modal.derived';
	import { getContext, setContext } from 'svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { modalStore } from '$lib/stores/modal.store';
	import IcReceiveCkEthereumModal from '$icp/components/receive/IcReceiveCkEthereumModal.svelte';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import { autoLoadUserToken } from '$icp-eth/services/user-token.services';
	import { erc20UserTokens } from '$eth/derived/erc20.derived';
	import { authStore } from '$lib/stores/auth.store';
	import { tokenWithFallback } from '$lib/derived/token.derived';

	const { ckEthereumTwinToken, open, close } =
		getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const modalId = Symbol();

	/**
	 * Send modal context store
	 */

	const { sendToken, ...rest } = initSendContext({
		sendPurpose: 'convert-eth-to-cketh',
		token: $ckEthereumTwinToken
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set($ckEthereumTwinToken);

	const openReceive = async () => {
		const { result } = await autoLoadUserToken({
			erc20UserTokens: $erc20UserTokens,
			sendToken: $tokenWithFallback,
			identity: $authStore.identity
		});

		if (result === 'error') {
			return;
		}

		modalStore.openCkETHReceive(modalId);
	};
</script>

<ReceiveButton on:click={async () => await open(openReceive)} />

{#if $modalCkETHReceive && $modalStore?.data === modalId}
	<IcReceiveCkEthereumModal on:nnsClose={close} />
{/if}
