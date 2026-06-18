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
		// DEMO BRANCH — NOT FOR MERGE: optional overrides so a second "signed" buy button can render
		// alongside the default one with a distinct label and test id.
		buttonLabel?: string;
		testId?: string;
	}

	let { onclick, buttonLabel, testId = BUY_TOKENS_MODAL_OPEN_BUTTON }: Props = $props();

	const { inflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<!-- API-key gate only matters while OnRamper is enabled; with the flag off, the modal shows the notice and doesn't need the key. -->
<ButtonHero
	ariaLabel={buttonLabel ?? $i18n.buy.text.buy}
	disabled={$isBusy ||
		(ONRAMPER_ENABLED && isNullishOrEmpty(ONRAMPER_API_KEY)) ||
		$inflowActionsDisabled}
	{onclick}
	{testId}
>
	{#snippet icon()}
		<IconlyBuy size="24" />
	{/snippet}
	{#snippet label()}
		{buttonLabel ?? $i18n.buy.text.buy}
	{/snippet}
</ButtonHero>
