<script lang="ts">
	import type { Snippet } from 'svelte';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initCkETHMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import type { IcCkToken, OptionIcCkToken } from '$icp/types/ic-token';
	import CkEthereumPendingTransactionsListener from '$icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte';
	import type { CanisterIdText } from '$lib/types/canister';
	import type { OptionToken, Token as TokenType } from '$lib/types/token';
	import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
	import { ckEthereumNativeToken as derivedCkEthereumNativeToken } from '$icp-eth/derived/cketh.derived';

	export interface Props {
		token: OptionToken;
		children?: Snippet;
	}

	let { token, children }: Props = $props();

	let ckEthereumNativeToken: TokenType = $derived(
		SUPPORTED_ETHEREUM_TOKENS.find(
			(t) => (token as IcCkToken)?.twinToken?.network.id === t.network.id
		) ?? $derivedCkEthereumNativeToken
	);

	let minterCanisterId: CanisterIdText | undefined = $derived(
		(token as OptionIcCkToken)?.minterCanisterId
	);
</script>

<IcCkListener initFn={initCkETHMinterInfoWorker} token={ckEthereumNativeToken} {minterCanisterId} />

<CkEthereumPendingTransactionsListener {token} {ckEthereumNativeToken} />

{#if children}
	{@render children()}
{/if}
