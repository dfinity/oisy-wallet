<script lang="ts">
	import IconQr from '$lib/components/icons/IconQr.svelte';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';
	import { RECEIVE_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';

	export let loading = false;
</script>

<ButtonHero
	on:click
	disabled={$isBusy}
	ariaLabel={$i18n.receive.text.receive}
	testId={RECEIVE_TOKENS_MODAL_OPEN_BUTTON}
	{loading}
>
	<IconQr size="28" slot="icon" />
	{$i18n.receive.text.receive}
</ButtonHero>
