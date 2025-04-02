<script lang="ts">
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { SWAP_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<ButtonHero
	on:click
	disabled={$isBusy}
	testId={SWAP_TOKENS_MODAL_OPEN_BUTTON}
	ariaLabel={$i18n.swap.text.swap}
>
	<IconCkConvert size="28" slot="icon" />

	{$i18n.swap.text.swap}
</ButtonHero>
