<script lang="ts">
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { SWAP_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();
</script>

<ButtonHero
	ariaLabel={$i18n.swap.text.swap}
	disabled={$isBusy}
	{onclick}
	testId={SWAP_TOKENS_MODAL_OPEN_BUTTON}
>
	{#snippet icon()}
		<IconCkConvert size="24" />
	{/snippet}
	{#snippet label()}
		{$i18n.swap.text.swap}
	{/snippet}
</ButtonHero>
