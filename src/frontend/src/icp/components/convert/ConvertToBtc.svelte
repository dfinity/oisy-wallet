<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { BTC_MAINNET_SYMBOL } from '$env/tokens/tokens.btc.env';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalConvertCkBTCToBTC } from '$lib/derived/modal.derived';
	import { networkBitcoinMainnetDisabled } from '$lib/derived/networks.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokenId } from '$lib/derived/token.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const modalId = Symbol();

	const isDisabled = (): boolean =>
		isNullish($tokenId) || isNullish($ckBtcMinterInfoStore?.[$tokenId]);

	const openConvert = async () => {
		const status = await waitWalletReady(isDisabled);

		if (status === 'timeout') {
			return;
		}

		modalStore.openConvertCkBTCToBTC(modalId);
	};

	let ckBtcToken: OptionIcCkToken = $derived($pageToken as OptionIcCkToken);

	const { outflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<ButtonHero
	ariaLabel={$i18n.convert.text.convert_to_btc}
	disabled={$networkBitcoinMainnetDisabled || $isBusy || $outflowActionsDisabled}
	onclick={async () => await openConvert()}
>
	{#snippet icon()}
		<IconCkConvert size="24" />
	{/snippet}
	{#snippet label()}
		{BTC_MAINNET_SYMBOL}
	{/snippet}
</ButtonHero>

{#if $modalConvertCkBTCToBTC && nonNullish(ckBtcToken) && nonNullish(ckBtcToken.twinToken)}
	<ConvertModal destinationToken={ckBtcToken.twinToken} sourceToken={ckBtcToken} />
{/if}
