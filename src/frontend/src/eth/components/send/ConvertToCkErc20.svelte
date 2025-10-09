<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import EthFeeStoreContext from '$eth/components/fee/EthFeeStoreContext.svelte';
	import {
		nativeEthereumTokenWithFallback,
		nativeEthereumTokenId
	} from '$eth/derived/token.derived';
	import type { OptionErc20Token } from '$eth/types/erc20';
	import ConvertEth from '$icp-eth/components/convert/ConvertEth.svelte';
	import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { modalConvertToTwinTokenCkEth } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { findTwinToken } from '$lib/utils/token.utils';

	let convertToSymbol = $derived(($pageToken as OptionErc20Token)?.twinTokenSymbol ?? '');

	let ckToken = $derived(
		nonNullish($pageToken)
			? findTwinToken({
					tokenToPair: $pageToken,
					tokens: $tokens
				})
			: undefined
	);
</script>

<ConvertEth
	ariaLabel={replacePlaceholders($i18n.convert.text.convert_to_ckerc20, {
		$ckErc20: convertToSymbol
	})}
	nativeTokenId={$nativeEthereumTokenId}
>
	{#snippet icon()}
		<IconCkConvert size="24" />
	{/snippet}

	{#snippet label()}
		<span>{convertToSymbol}</span>
	{/snippet}
</ConvertEth>

{#if $modalConvertToTwinTokenCkEth && nonNullish(ckToken) && nonNullish($pageToken)}
	<EthFeeStoreContext token={$nativeEthereumTokenWithFallback}>
		<ConvertModal destinationToken={ckToken} sourceToken={$pageToken} />
	</EthFeeStoreContext>
{/if}
