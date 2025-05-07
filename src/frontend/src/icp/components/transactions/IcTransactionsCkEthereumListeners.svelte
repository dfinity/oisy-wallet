<script lang="ts">
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initCkETHMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import CkEthereumPendingTransactionsListener from '$icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte';
	import type { CanisterIdText } from '$lib/types/canister';
	import type { OptionToken, Token } from '$lib/types/token';
	import type { Snippet } from 'svelte';

	export interface Props {
		token: OptionToken;
		ckEthereumNativeToken: Token;
		children?: Snippet;
	}

	let { token, ckEthereumNativeToken, children }: Props = $props();

	let minterCanisterId: CanisterIdText | undefined = $derived(
		(token as OptionIcCkToken)?.minterCanisterId
	);
</script>

<IcCkListener initFn={initCkETHMinterInfoWorker} token={ckEthereumNativeToken} {minterCanisterId} />

<CkEthereumPendingTransactionsListener />

{#if children}
	{@render children()}
{/if}
