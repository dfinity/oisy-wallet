<script lang="ts">
	import { getContext, setContext } from 'svelte';
	import { erc20UserTokens } from '$eth/derived/erc20.derived';
	import IcReceiveCkEthereumModal from '$icp/components/receive/IcReceiveCkEthereumModal.svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import { autoLoadUserToken } from '$icp-eth/services/user-token.services';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalCkETHReceive } from '$lib/derived/modal.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	const { ckEthereumTwinToken, open, close } =
		getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

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
	<IcReceiveCkEthereumModal on:nnsClose={close} slot="modal" />
</ReceiveButtonWithModal>
