<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initCkETHMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import type { IcCkToken, OptionIcCkToken } from '$icp/types/ic-token';
	import CkEthereumPendingTransactionsListener from '$icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte';
	import type { CanisterIdText } from '$lib/types/canister';
	import type { OptionToken, Token as TokenType } from '$lib/types/token';

	interface Props {
		token: OptionToken;
		ckEthereumNativeToken?: TokenType;
		children?: Snippet;
	}
	let { token, ckEthereumNativeToken: ckEthereumNativeTokenProp, children }: Props = $props();
	let ckEthereumNativeToken: TokenType = $derived(
		nonNullish(ckEthereumNativeTokenProp)
			? ckEthereumNativeTokenProp
			: (SUPPORTED_ETHEREUM_TOKENS.find(
					(t) => (token as IcCkToken)?.twinToken?.network.id === t.network.id
				) as TokenType)
	);
	let minterCanisterId: CanisterIdText | undefined = $derived(
		(token as OptionIcCkToken)?.minterCanisterId
	);
</script>

<IcCkListener initFn={initCkETHMinterInfoWorker} {minterCanisterId} token={ckEthereumNativeToken} />

<CkEthereumPendingTransactionsListener {ckEthereumNativeToken} {token} />

{@render children?.()}
