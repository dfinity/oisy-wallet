<script lang="ts">
	import { getContext } from 'svelte';
	import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';

	const { outflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<ButtonHero
	disabled={$isBusy || $outflowActionsDisabled}
	ariaLabel={$i18n.convert.text.convert_to_ckbtc}
>
	<IconCkConvert size="28" slot="icon" />
	<span>{BTC_MAINNET_TOKEN.twinTokenSymbol}</span>
</ButtonHero>
