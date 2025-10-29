<script lang="ts">
	import { page } from '$app/stores';
	import { ONRAMPER_API_KEY } from '$env/rest/onramper.env';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconlyBuy from '$lib/components/icons/iconly/IconlyBuy.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isRouteNfts } from '$lib/utils/nav.utils';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();
</script>

<ButtonHero
	ariaLabel={$i18n.send.text.send}
	disabled={$isBusy || isNullishOrEmpty(ONRAMPER_API_KEY) || isRouteNfts($page)}
	{onclick}
>
	{#snippet icon()}
		<IconlyBuy size="24" />
	{/snippet}
	{#snippet label()}
		{$i18n.buy.text.buy}
	{/snippet}
</ButtonHero>
