<script lang="ts">
	import { getContext } from 'svelte';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconQr from '$lib/components/icons/IconQr.svelte';
	import { RECEIVE_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onClick: () => void;
	}

	let { onClick }: Props = $props();

	const { inflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<ButtonHero
	ariaLabel={$i18n.receive.text.receive}
	disabled={$isBusy || $inflowActionsDisabled}
	onclick={onClick}
	testId={RECEIVE_TOKENS_MODAL_OPEN_BUTTON}
>
	{#snippet icon()}
		<IconQr size="24" />
	{/snippet}
	{#snippet label()}
		{$i18n.receive.text.receive}
	{/snippet}
</ButtonHero>
