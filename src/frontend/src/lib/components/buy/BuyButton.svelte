<script lang="ts">
	import { ONRAMPER_API_KEY } from '$env/rest/onramper.env';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconlyBuy from '$lib/components/icons/iconly/IconlyBuy.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();
</script>

<ButtonHero
	{onclick}
	disabled={$isBusy || isNullishOrEmpty(ONRAMPER_API_KEY)}
	ariaLabel={$i18n.send.text.send}
>
	<IconlyBuy size="28" slot="icon" />
	{$i18n.buy.text.buy}
</ButtonHero>
