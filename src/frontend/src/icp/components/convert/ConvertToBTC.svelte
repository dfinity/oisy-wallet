<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { BTC_MAINNET_NETWORK_ID } from '$env/networks.env';
	import { BTC_MAINNET_SYMBOL } from '$env/tokens/tokens.btc.env';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalConvertCkBTCToBTC } from '$lib/derived/modal.derived';
	import { tokenId } from '$lib/derived/token.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';

	const isDisabled = (): boolean =>
		isNullish($tokenId) || isNullish($ckBtcMinterInfoStore?.[$tokenId]);

	const openSend = async () => {
		const status = await waitWalletReady(isDisabled);

		if (status === 'timeout') {
			return;
		}

		modalStore.openConvertCkBTCToBTC();
	};

	let networkId: NetworkId;
	$: networkId = ($token as OptionIcCkToken)?.twinToken?.network.id ?? BTC_MAINNET_NETWORK_ID;

	const { outflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<ButtonHero
	disabled={$isBusy || $outflowActionsDisabled}
	on:click={async () => await openSend()}
	ariaLabel={$i18n.convert.text.convert_to_btc}
>
	<IconCkConvert size="28" slot="icon" />
	{BTC_MAINNET_SYMBOL}
</ButtonHero>

{#if $modalConvertCkBTCToBTC}
	<IcSendModal {networkId} />
{/if}
