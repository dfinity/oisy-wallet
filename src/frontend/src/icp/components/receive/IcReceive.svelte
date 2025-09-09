<script lang="ts">
	import { setContext } from 'svelte';
	import { run } from 'svelte/legacy';
	import IcReceiveCkBTC from '$icp/components/receive/IcReceiveCkBTC.svelte';
	import IcReceiveCkEthereum from '$icp/components/receive/IcReceiveCkEthereum.svelte';
	import IcReceiveIcp from '$icp/components/receive/IcReceiveICP.svelte';
	import IcReceiveIcrc from '$icp/components/receive/IcReceiveIcrc.svelte';
	import {
		initReceiveTokenContext,
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import type { IcToken } from '$icp/types/ic-token';
	import {
		isTokenCkBtcLedger,
		isTokenCkErc20Ledger,
		isTokenCkEthLedger
	} from '$icp/utils/ic-send.utils';
	import { isTokenDip20, isTokenIcrc } from '$icp/utils/icrc.utils';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		token: Token;
	}

	let { token }: Props = $props();

	let ckEthereum = $state(false);
	run(() => {
		ckEthereum = isTokenCkEthLedger(token) || isTokenCkErc20Ledger(token);
	});

	let ckBTC = $state(false);
	run(() => {
		ckBTC = isTokenCkBtcLedger(token);
	});

	let icrc = $state(false);
	run(() => {
		icrc = isTokenIcrc(token);
	});

	let dip20 = $state(false);
	run(() => {
		dip20 = isTokenDip20(token);
	});

	const open = async (callback: () => Promise<void>) => {
		await callback();
	};

	const close = () => {
		modalStore.close();
	};

	/**
	 * Context for the IC receive modals: We initialize with a token, ensuring that the information is never undefined.
	 */
	const context = initReceiveTokenContext({ token, open, close });
	setContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY, context);

	// At boot time, if the context is derived globally, the token might be updated a few times. That's why we also update it with an auto-subscriber.
	run(() => {
		(token, (() => context.token.set(token as IcToken))());
	});
</script>

{#if ckEthereum}
	<IcReceiveCkEthereum />
{:else if ckBTC}
	<IcReceiveCkBTC />
{:else if icrc || dip20}
	<IcReceiveIcrc />
{:else}
	<IcReceiveIcp />
{/if}
