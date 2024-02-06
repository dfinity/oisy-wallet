<script lang="ts">
	import { modalConvertETHToCkETH } from '$lib/derived/modal.derived';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { ICP_NETWORK } from '$lib/constants/networks.constants';
	import SendTokenModal from '$eth/components/send/SendTokenModal.svelte';
	import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({ sendPurpose: 'convert-eth-to-cketh' });
	setContext<SendContext>(SEND_CONTEXT_KEY, context);
</script>

<ConvertETH>
	<IconBurn size="28" />
	<span> Convert to ckETH </span>
</ConvertETH>

{#if $modalConvertETHToCkETH}
	<SendTokenModal
		destination={$ckEthHelperContractAddressStore?.[ETHEREUM_TOKEN_ID]?.data ?? ''}
		network={ICP_NETWORK}
	/>
{/if}
