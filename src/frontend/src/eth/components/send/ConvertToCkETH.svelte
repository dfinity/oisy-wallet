<script lang="ts">
	import { setContext } from 'svelte';
	import { ICP_NETWORK } from '$env/networks/networks.env';
	import EthSendTokenModal from '$eth/components/send/EthSendTokenModal.svelte';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { ethereumToken, ethereumTokenId } from '$eth/derived/token.derived';
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import { ckEthHelperContractAddress } from '$icp-eth/derived/cketh.derived';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { modalConvertToTwinTokenCkEth } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

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
	<IconCkConvert size="28" slot="icon" />
	<span>{$ethereumToken.twinTokenSymbol ?? ''}</span>
</ConvertETH>

{#if $modalConvertToTwinTokenCkEth}
	<EthSendTokenModal destination={$ckEthHelperContractAddress ?? ''} targetNetwork={ICP_NETWORK} />
{/if}
