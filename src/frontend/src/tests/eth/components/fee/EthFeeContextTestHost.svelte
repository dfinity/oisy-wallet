<script lang="ts">
	import { setContext } from 'svelte';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import { ETH_FEE_CONTEXT_KEY } from '$eth/stores/eth-fee.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { Network } from '$lib/types/network';
	import type { Token, TokenId } from '$lib/types/token';
	import type { Nft } from '$lib/types/nft';

	export interface EthFeeContextProps {
		observe: boolean;
		destination: string;
		amount: OptionAmount;
		data: string | undefined;
		sourceNetwork: EthereumNetwork;
		targetNetwork: Network | undefined;
		nativeEthereumToken: Token;
		sendToken: Token;
		sendTokenId: TokenId;
		sendNft: Nft | undefined;
	}

	interface Props {
		feeStore: { setFee: (v: unknown) => void };
		props: EthFeeContextProps;
	}

	const { feeStore, props }: Props = $props();

	setContext(ETH_FEE_CONTEXT_KEY, { feeStore });
</script>

<EthFeeContext {...props}>Dummy</EthFeeContext>
