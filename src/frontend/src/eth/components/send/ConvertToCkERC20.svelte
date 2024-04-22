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
	import { token } from '$lib/derived/token.derived';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import type { Erc20Token } from '$eth/types/erc20';
	import { ckErc20HelperContractAddress } from '$icp-eth/derived/cketh.derived';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({
		sendPurpose: 'convert-erc20-to-ckerc20',
		token: $token,
		nativeEthereumToken: $ethereumToken
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, context);

	let converToSymbol: string;
	$: converToSymbol = ($token as Erc20Token).twinTokenSymbol ?? 'ckETH';
</script>

<ConvertETH convertTokenId={$ethereumTokenId}>
	<IconBurn size="28" />
	<span>
		{replacePlaceholders($i18n.convert.text.convert_to_ckerc20, {
			$ckErc20: converToSymbol
		})}
	</span>
</ConvertETH>

{#if $modalConvertETHToCkETH}
	<SendTokenModal destination={$ckErc20HelperContractAddress ?? ''} targetNetwork={ICP_NETWORK} />
{/if}
