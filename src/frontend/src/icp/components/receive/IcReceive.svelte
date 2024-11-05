<script lang="ts">
	import { createEventDispatcher, setContext } from 'svelte';
	import IcReceiveCkBTC from '$icp/components/receive/IcReceiveCkBTC.svelte';
	import IcReceiveCkEthereum from '$icp/components/receive/IcReceiveCkEthereum.svelte';
	import IcReceiveIcp from '$icp/components/receive/IcReceiveICP.svelte';
	import IcReceiveIcrc from '$icp/components/receive/IcReceiveIcrc.svelte';
	import {
		type CloseModalAndResetToken,
		initReceiveTokenContext,
		type LoadTokenAndOpenModal,
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import type { IcToken } from '$icp/types/ic-token';
	import {
		isTokenCkBtcLedger,
		isTokenCkErc20Ledger,
		isTokenCkEthLedger
	} from '$icp/utils/ic-send.utils';
	import { loadTokenAndRun } from '$lib/services/token.services';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';

	export let token: Token;

	let ckEthereum = false;
	$: ckEthereum = isTokenCkEthLedger(token) || isTokenCkErc20Ledger(token);

	let ckBTC = false;
	$: ckBTC = isTokenCkBtcLedger(token);

	let icrc = false;
	$: icrc = token.standard === 'icrc';

	const open: LoadTokenAndOpenModal = async (callback: () => Promise<void>) => {
		await loadTokenAndRun({ token, callback });
	};

	const dispatch = createEventDispatcher();

	const close: CloseModalAndResetToken = () => {
		modalStore.close();
		// We are resetting the token in the parent. That way we can know if we are using a global page $token or a selected token.
		dispatch('nnsClose');
	};

	/**
	 * Context for the IC receive modals: We initialize with a token, ensuring that the information is never undefined.
	 */
	const context = initReceiveTokenContext({ token, open, close });
	setContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY, context);

	// At boot time, if the context is derived globally, the token might be updated a few times. That's why we also update it with an auto-subscriber.
	$: token, (() => context.token.set(token as IcToken))();
</script>

{#if ckEthereum}
	<IcReceiveCkEthereum />
{:else if ckBTC}
	<IcReceiveCkBTC />
{:else if icrc}
	<IcReceiveIcrc />
{:else}
	<IcReceiveIcp />
{/if}
