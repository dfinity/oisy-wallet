<script lang="ts">
	import { setContext, untrack } from 'svelte';
	import IcReceiveCkBtc from '$icp/components/receive/IcReceiveCkBtc.svelte';
	import IcReceiveCkEthereum from '$icp/components/receive/IcReceiveCkEthereum.svelte';
	import IcReceiveIcp from '$icp/components/receive/IcReceiveIcp.svelte';
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

	let ckEthereum = $derived(isTokenCkEthLedger(token) || isTokenCkErc20Ledger(token));

	let ckBTC = $derived(isTokenCkBtcLedger(token));

	let icrc = $derived(isTokenIcrc(token));

	let dip20 = $derived(isTokenDip20(token));

	const open = async (callback: () => Promise<void>) => {
		await callback();
	};

	const close = () => {
		modalStore.close();
	};

	/**
	 * Context for the IC receives modals: We initialise with a token, ensuring that the information is never undefined.
	 */
	const context = initReceiveTokenContext({ token, open, close });
	setContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY, context);

	// At boot time, if the context is derived globally, the token might be updated a few times. That's why we also update it with an auto-subscriber.
	$effect(() => {
		[token];

		untrack(() => context.token.set(token as IcToken));
	});
</script>

{#if ckEthereum}
	<IcReceiveCkEthereum />
{:else if ckBTC}
	<IcReceiveCkBtc />
{:else if icrc || dip20}
	<IcReceiveIcrc />
{:else}
	<IcReceiveIcp />
{/if}
