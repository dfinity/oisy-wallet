<script lang="ts">
	import { modalConvertETHToCkETH } from '$lib/derived/modal.derived';
	import IconImportExport from '$lib/components/icons/IconImportExport.svelte';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { ICP_NETWORK } from '$lib/constants/networks.constants';
	import SendTokenModal from '$eth/components/send/SendTokenModal.svelte';
	import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
	import ConvertETHToCkETH from '$icp-eth/components/send/ConvertETHToCkETH.svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({ sendPurpose: 'convert-eth-to-cketh' });
	setContext<SendContext>(SEND_CONTEXT_KEY, context);
</script>

<ConvertETHToCkETH>
	<IconImportExport size="28" />
	<span> Convert ETH to ckETH </span>
</ConvertETHToCkETH>

{#if $modalConvertETHToCkETH}
	<SendTokenModal
		destination={$ckEthHelperContractAddressStore?.[ETHEREUM_TOKEN_ID]?.data ?? ''}
		network={ICP_NETWORK}
	/>
{/if}
