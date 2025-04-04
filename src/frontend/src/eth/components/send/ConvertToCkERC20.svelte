<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { ethereumToken, ethereumTokenId } from '$eth/derived/token.derived';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$eth/stores/fee.store';
	import type { OptionErc20Token } from '$eth/types/erc20';
	import type { IcCkToken } from '$icp/types/ic-token';
	import ConvertETH from '$icp-eth/components/convert/ConvertETH.svelte';
	import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { modalConvertToTwinTokenCkEth } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenId } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { findTwinToken } from '$lib/utils/token.utils';

	let feeStore = initFeeStore();

	let feeSymbolStore = writable<string | undefined>(undefined);
	$: feeSymbolStore.set($ethereumToken.symbol);

	let feeTokenIdStore = writable<TokenId | undefined>(undefined);
	$: feeTokenIdStore.set($ethereumToken.id);

	let feeDecimalsStore = writable<number | undefined>(undefined);
	$: feeDecimalsStore.set($ethereumToken.decimals);

	let feeExchangeRateStore = writable<number | undefined>(undefined);
	$: feeExchangeRateStore.set($exchanges?.[$ethereumToken.id]?.usd);

	setContext<FeeContextType>(
		FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			feeSymbolStore,
			feeTokenIdStore,
			feeDecimalsStore,
			feeExchangeRateStore
		})
	);

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
	<IconCkConvert size="28" slot="icon" />
	<span>{convertToSymbol}</span>
</ConvertETH>

{#if $modalConvertToTwinTokenCkEth && nonNullish(ckToken) && nonNullish($pageToken)}
	<ConvertModal sourceToken={$pageToken} destinationToken={ckToken} />
{/if}
