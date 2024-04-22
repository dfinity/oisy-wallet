<script lang="ts">
	import { modalConvertETHToCkETH } from '$lib/derived/modal.derived';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import SendTokenModal from '$eth/components/send/SendTokenModal.svelte';
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';
	import { ICP_NETWORK } from '$env/networks.env';
	import { ethereumToken, ethereumTokenId } from '$eth/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { ckEthHelperContractAddress } from '$icp-eth/derived/cketh.derived';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({
		sendPurpose: 'convert-eth-to-cketh',
		token: $ethereumToken,
		nativeEthereumToken: $ethereumToken
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, context);
</script>

<ConvertETH convertTokenId={$ethereumTokenId}>
	<IconBurn size="28" />
	<span> {$i18n.convert.text.convert_to_cketh} </span>
</ConvertETH>

{#if $modalConvertETHToCkETH}
	<SendTokenModal destination={$ckEthHelperContractAddress ?? ''} targetNetwork={ICP_NETWORK} />
{/if}
