<script lang="ts">
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<ButtonHero on:click disabled={$isBusy} ariaLabel={$i18n.swap.text.swap}>
	<IconCkConvert size="28" slot="icon" />

	{$i18n.swap.text.swap}
</ButtonHero>
