<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
	import type { IcCkToken } from '$icp/types/ic-token';
	import CkEthereumPendingTransactionsListener from '$icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte';
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
</script>

<CkEthereumPendingTransactionsListener {ckEthereumNativeToken} {token} />

{@render children?.()}
