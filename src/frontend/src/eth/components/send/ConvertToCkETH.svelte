<script lang="ts">
	import { modalConvertToTwinTokenCkEth } from '$lib/derived/modal.derived';
	import EthSendTokenModal from '$eth/components/send/EthSendTokenModal.svelte';
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';
	import { ICP_NETWORK } from '$env/networks.env';
	import { ethereumToken, ethereumTokenId } from '$eth/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { ckEthHelperContractAddress } from '$icp-eth/derived/cketh.derived';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({
		sendPurpose: 'convert-eth-to-cketh',
		token: $ethereumToken
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, context);
</script>

<ConvertETH
	nativeTokenId={$ethereumTokenId}
	nativeNetworkId={$selectedEthereumNetwork.id}
	ariaLabel={$i18n.convert.text.convert_to_cketh}
>
	<IconConvert size="28" slot="icon" />
	<span> {$i18n.convert.text.convert_to_cketh} </span>
</ConvertETH>

{#if $modalConvertToTwinTokenCkEth}
	<EthSendTokenModal destination={$ckEthHelperContractAddress ?? ''} targetNetwork={ICP_NETWORK} />
{/if}
