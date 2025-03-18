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
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokenId } from '$lib/derived/token.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const isDisabled = (): boolean =>
		isNullish($tokenId) || isNullish($ckBtcMinterInfoStore?.[$tokenId]);

	const openConvert = async () => {
		const status = await waitWalletReady(isDisabled);

		if (status === 'timeout') {
			return;
		}

		modalStore.openConvertCkBTCToBTC();
	};

	let ckBtcToken: OptionIcCkToken;
	$: ckBtcToken = $pageToken as OptionIcCkToken;

	const { outflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<ButtonHero
	disabled={$isBusy || $outflowActionsDisabled}
	on:click={async () => await openConvert()}
	ariaLabel={$i18n.convert.text.convert_to_btc}
>
	<IconCkConvert size="28" slot="icon" />
	{BTC_MAINNET_SYMBOL}
</ButtonHero>

{#if $modalConvertCkBTCToBTC && nonNullish(ckBtcToken) && nonNullish(ckBtcToken.twinToken)}
	<ConvertModal sourceToken={ckBtcToken} destinationToken={ckBtcToken.twinToken} />
{/if}
