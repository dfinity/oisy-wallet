<script lang="ts">
	import { modalConvertToTwinTokenCkEth } from '$lib/derived/modal.derived';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import EthSendTokenModal from '$eth/components/send/EthSendTokenModal.svelte';
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';
	import { ICP_NETWORK } from '$env/networks.env';
	import { ethereumTokenId } from '$eth/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import type { OptionErc20Token } from '$eth/types/erc20';
	import { ckErc20HelperContractAddress } from '$icp-eth/derived/cketh.derived';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { token } from '$lib/stores/token.store';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({
		sendPurpose: 'convert-erc20-to-ckerc20',
		token: $tokenWithFallback
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, context);

	let converToSymbol: string;
	$: converToSymbol = ($token as OptionErc20Token)?.twinTokenSymbol ?? 'ckETH';
</script>

<ConvertETH
	nativeTokenId={$ethereumTokenId}
	nativeNetworkId={$selectedEthereumNetwork.id}
	ariaLabel={replacePlaceholders($i18n.convert.text.convert_to_ckerc20, {
		$ckErc20: converToSymbol
	})}
>
	<IconBurn size="28" slot="icon" />
	<span>
		{replacePlaceholders($i18n.convert.text.convert_to_ckerc20, {
			$ckErc20: converToSymbol
		})}
	</span>
</ConvertETH>

{#if $modalConvertToTwinTokenCkEth}
	<EthSendTokenModal
		destination={$ckErc20HelperContractAddress ?? ''}
		targetNetwork={ICP_NETWORK}
	/>
{/if}
