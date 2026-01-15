<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import EthFeeStoreContext from '$eth/components/fee/EthFeeStoreContext.svelte';
	import {
		nativeEthereumTokenWithFallback,
		nativeEthereumTokenId
	} from '$eth/derived/token.derived';
	import ConvertEth from '$icp-eth/components/convert/ConvertEth.svelte';
	import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { modalConvertToTwinTokenCkEth } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { RequiredTokenWithLinkedData } from '$lib/types/token';
	import { findTwinToken } from '$lib/utils/token.utils';

	let ckEthToken = $derived(
		nonNullish($pageToken)
			? findTwinToken({
					tokenToPair: $pageToken,
					tokens: $tokens
				})
			: undefined
	);
</script>

<ConvertEth ariaLabel={$i18n.convert.text.convert_to_cketh} nativeTokenId={$nativeEthereumTokenId}>
	{#snippet icon()}
		<IconCkConvert size="24" />
	{/snippet}

	{#snippet label()}
		<span>
			{($nativeEthereumTokenWithFallback as RequiredTokenWithLinkedData).twinTokenSymbol ?? ''}
		</span>
	{/snippet}
</ConvertEth>

{#if $modalConvertToTwinTokenCkEth && nonNullish(ckEthToken)}
	<EthFeeStoreContext token={$nativeEthereumTokenWithFallback}>
		<ConvertModal destinationToken={ckEthToken} sourceToken={$nativeEthereumTokenWithFallback} />
	</EthFeeStoreContext>
{/if}
