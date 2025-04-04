<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
	import { ethereumToken, ethereumTokenId } from '$eth/derived/token.derived';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$eth/stores/fee.store';
	import type { IcCkToken } from '$icp/types/ic-token';
	import ConvertETH from '$icp-eth/components/convert/ConvertETH.svelte';
	import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { modalConvertToTwinTokenCkEth } from '$lib/derived/modal.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenId } from '$lib/types/token';
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

	let ckEthToken: IcCkToken | undefined;
	$: (() => {
		if (nonNullish(ckEthToken)) {
			return;
		}

		ckEthToken = findTwinToken({
			tokenToPair: ETHEREUM_TOKEN,
			tokens: $tokens
		});
	})();
</script>

<ConvertETH nativeTokenId={$ethereumTokenId} ariaLabel={$i18n.convert.text.convert_to_cketh}>
	<IconCkConvert size="28" slot="icon" />
	<span>{$ethereumToken.twinTokenSymbol ?? ''}</span>
</ConvertETH>

{#if $modalConvertToTwinTokenCkEth && nonNullish(ckEthToken)}
	<ConvertModal sourceToken={$ethereumToken} destinationToken={ckEthToken} />
{/if}
