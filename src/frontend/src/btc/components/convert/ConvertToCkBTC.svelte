<script lang="ts">
	import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';

	export let loading = false;
</script>

<ButtonHero disabled={$isBusy} ariaLabel={$i18n.convert.text.convert_to_ckbtc} {loading}>
	<IconCkConvert size="28" slot="icon" />
	<span>{BTC_MAINNET_TOKEN.twinTokenSymbol}</span>
</ButtonHero>
