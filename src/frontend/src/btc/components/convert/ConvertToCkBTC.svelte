<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import {
		initUtxosFeeStore,
		UTXOS_FEE_CONTEXT_KEY,
		type UtxosFeeContext as UtxosFeeContextType
	} from '$btc/stores/utxos-fee.store';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { loadAllCkBtcInfo } from '$icp/services/ckbtc.services';
	import { initCkBTCMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import type { IcCkToken } from '$icp/types/ic-token';
	import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalConvertBTCToCkBTC } from '$lib/derived/modal.derived';
	import { networkBitcoinMainnetDisabled } from '$lib/derived/networks.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { findTwinToken } from '$lib/utils/token.utils';

	const modalId = Symbol();

	let ckBtcToken: IcCkToken | undefined;
	$: ckBtcToken = findTwinToken({
		tokenToPair: BTC_MAINNET_TOKEN,
		tokens: $tokens
	});

	setContext<UtxosFeeContextType>(UTXOS_FEE_CONTEXT_KEY, {
		store: initUtxosFeeStore()
	});

	let minterInfoLoaded = false;

	const openConvert = async () => {
		// ckBtcToken is already available at this point, so the check is needed for TS-purposes only
		if (isNullish(ckBtcToken)) {
			return;
		}

		minterInfoLoaded = nonNullish($ckBtcMinterInfoStore?.[ckBtcToken.id]);

		await loadAllCkBtcInfo({
			...ckBtcToken,
			identity: $authIdentity
		});

		modalStore.openConvertBTCToCkBTC(modalId);
	};

	const { outflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<ButtonHero
	onclick={async () => await openConvert()}
	disabled={$networkBitcoinMainnetDisabled ||
		$isBusy ||
		$outflowActionsDisabled ||
		isNullish(ckBtcToken)}
	ariaLabel={$i18n.convert.text.convert_to_ckbtc}
	testId="convert-to-ckbtc-button"
>
	{#snippet icon()}
		<IconCkConvert size="24" />
	{/snippet}
	{#snippet label()}
		<span>{BTC_MAINNET_TOKEN.twinTokenSymbol}</span>
	{/snippet}
</ButtonHero>

{#if $modalConvertBTCToCkBTC && nonNullish(ckBtcToken)}
	<ConvertModal sourceToken={BTC_MAINNET_TOKEN} destinationToken={ckBtcToken} />
{/if}

{#if !minterInfoLoaded && nonNullish(ckBtcToken)}
	<IcCkListener initFn={initCkBTCMinterInfoWorker} token={ckBtcToken} />
{/if}
