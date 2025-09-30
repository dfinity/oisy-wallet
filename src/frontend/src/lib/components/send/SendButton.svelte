<script lang="ts">
	import { getContext } from 'svelte';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconlySend from '$lib/components/icons/iconly/IconlySend.svelte';
	import { SEND_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();

	const { outflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<ButtonHero
	ariaLabel={$i18n.send.text.send}
	disabled={$isBusy || $outflowActionsDisabled}
	{onclick}
	testId={SEND_TOKENS_MODAL_OPEN_BUTTON}
>
	{#snippet icon()}
		<IconlySend size="24" />
	{/snippet}
	{#snippet label()}
		{$i18n.send.text.send}
	{/snippet}
</ButtonHero>
