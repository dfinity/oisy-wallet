<script lang="ts">
	import { getContext } from 'svelte';
	import { ONRAMPER_API_KEY, ONRAMPER_ENABLED } from '$env/rest/onramper.env';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconlyBuy from '$lib/components/icons/iconly/IconlyBuy.svelte';
	import { BUY_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();

	const { inflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<ButtonHero
	ariaLabel={$i18n.buy.text.buy}
	disabled={$isBusy ||
		(ONRAMPER_ENABLED && isNullishOrEmpty(ONRAMPER_API_KEY)) ||
		$inflowActionsDisabled}
	{onclick}
	testId={BUY_TOKENS_MODAL_OPEN_BUTTON}
>
	{#snippet icon()}
		<IconlyBuy size="24" />
	{/snippet}
	{#snippet label()}
		{$i18n.buy.text.buy}
	{/snippet}
</ButtonHero>
