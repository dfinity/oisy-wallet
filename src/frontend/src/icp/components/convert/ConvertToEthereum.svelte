<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import ConvertETH from '$icp-eth/components/convert/ConvertETH.svelte';
	import { ckEthereumTwinToken, ckEthereumNativeTokenId } from '$icp-eth/derived/cketh.derived';
	import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { modalConvertToTwinTokenEth } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let icCkToken: OptionIcCkToken;
	$: icCkToken = $pageToken as OptionIcCkToken;
</script>

<ConvertETH
	ariaLabel={replacePlaceholders($i18n.convert.text.convert_to_token, {
		$token: $ckEthereumTwinToken.symbol
	})}
	nativeTokenId={$ckEthereumNativeTokenId}
>
	<IconCkConvert slot="icon" size="24" />
	<span>{$ckEthereumTwinToken.symbol}</span>
</ConvertETH>

{#if $modalConvertToTwinTokenEth && nonNullish(icCkToken) && nonNullish(icCkToken.twinToken)}
	<ConvertModal destinationToken={icCkToken.twinToken} sourceToken={icCkToken} />
{/if}
