<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { run } from 'svelte/legacy';
	import EthFeeStoreContext from '$eth/components/fee/EthFeeStoreContext.svelte';
	import { ethereumToken, ethereumTokenId } from '$eth/derived/token.derived';
	import type { IcCkToken } from '$icp/types/ic-token';
	import ConvertEth from '$icp-eth/components/convert/ConvertEth.svelte';
	import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { modalConvertToTwinTokenCkEth } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { findTwinToken } from '$lib/utils/token.utils';

	let ckEthToken: IcCkToken | undefined = $state();
	run(() => {
		(() => {
			if (nonNullish(ckEthToken) || isNullish($pageToken)) {
				return;
			}

			ckEthToken = findTwinToken({
				tokenToPair: $pageToken,
				tokens: $tokens
			});
		})();
	});
</script>

<ConvertEth ariaLabel={$i18n.convert.text.convert_to_cketh} nativeTokenId={$ethereumTokenId}>
	{#snippet icon()}
		<IconCkConvert size="24" />
	{/snippet}
	<span>{$ethereumToken.twinTokenSymbol ?? ''}</span>
</ConvertEth>

{#if $modalConvertToTwinTokenCkEth && nonNullish(ckEthToken)}
	<EthFeeStoreContext token={$ethereumToken}>
		<ConvertModal destinationToken={ckEthToken} sourceToken={$ethereumToken} />
	</EthFeeStoreContext>
{/if}
