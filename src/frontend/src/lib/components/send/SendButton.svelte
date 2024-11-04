<script lang="ts">
	import { getContext } from 'svelte';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconlySend from '$lib/components/icons/iconly/IconlySend.svelte';
	import { SEND_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';

	const { outflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<ButtonHero
	on:click
	disabled={$isBusy || $outflowActionsDisabled}
	ariaLabel={$i18n.send.text.send}
	testId={SEND_TOKENS_MODAL_OPEN_BUTTON}
>
	<IconlySend size="28" slot="icon" />
	{$i18n.send.text.send}
</ButtonHero>
