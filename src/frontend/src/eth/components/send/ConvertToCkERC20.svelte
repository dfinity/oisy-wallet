<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import FeeStoreContext from '$eth/components/fee/FeeStoreContext.svelte';
	import { ethereumToken, ethereumTokenId } from '$eth/derived/token.derived';
	import type { OptionErc20Token } from '$eth/types/erc20';
	import type { IcCkToken } from '$icp/types/ic-token';
	import ConvertETH from '$icp-eth/components/convert/ConvertETH.svelte';
	import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { modalConvertToTwinTokenCkEth } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { findTwinToken } from '$lib/utils/token.utils';

	let convertToSymbol: string;
	$: convertToSymbol = ($pageToken as OptionErc20Token)?.twinTokenSymbol ?? '';

	let ckToken: IcCkToken | undefined;
	$: (() => {
		if (nonNullish(ckToken) || isNullish($pageToken)) {
			return;
		}

		ckToken = findTwinToken({
			tokenToPair: $pageToken,
			tokens: $tokens
		});
	})();
</script>

<ConvertETH
	nativeTokenId={$ethereumTokenId}
	ariaLabel={replacePlaceholders($i18n.convert.text.convert_to_ckerc20, {
		$ckErc20: convertToSymbol
	})}
>
	<IconCkConvert size="24" slot="icon" />
	<span>{convertToSymbol}</span>
</ConvertETH>

{#if $modalConvertToTwinTokenCkEth && nonNullish(ckToken) && nonNullish($pageToken)}
	<FeeStoreContext token={$ethereumToken}>
		<ConvertModal sourceToken={$pageToken} destinationToken={ckToken} />
	</FeeStoreContext>
{/if}
