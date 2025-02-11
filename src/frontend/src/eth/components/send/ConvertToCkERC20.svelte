<script lang="ts">
	import { setContext } from 'svelte';
	import { ICP_NETWORK } from '$env/networks/networks.env';
	import EthSendTokenModal from '$eth/components/send/EthSendTokenModal.svelte';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { ethereumTokenId } from '$eth/derived/token.derived';
	import type { OptionErc20Token } from '$eth/types/erc20';
	import ConvertETH from '$icp-eth/components/convert/ConvertETH.svelte';
	import { ckErc20HelperContractAddress } from '$icp-eth/derived/cketh.derived';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { modalConvertToTwinTokenCkEth } from '$lib/derived/modal.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { token } from '$lib/stores/token.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({
		sendPurpose: 'convert-erc20-to-ckerc20',
		token: $tokenWithFallback
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, context);

	let convertToSymbol: string;
	$: convertToSymbol = ($token as OptionErc20Token)?.twinTokenSymbol ?? '';
</script>

<ConvertETH
	nativeTokenId={$ethereumTokenId}
	nativeNetworkId={$selectedEthereumNetwork.id}
	ariaLabel={replacePlaceholders($i18n.convert.text.convert_to_ckerc20, {
		$ckErc20: convertToSymbol
	})}
>
	<IconCkConvert size="28" slot="icon" />
	<span>{convertToSymbol}</span>
</ConvertETH>

{#if $modalConvertToTwinTokenCkEth}
	<EthSendTokenModal
		destination={$ckErc20HelperContractAddress ?? ''}
		targetNetwork={ICP_NETWORK}
	/>
{/if}
