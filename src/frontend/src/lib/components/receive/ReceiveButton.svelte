<script lang="ts">
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconQr from '$lib/components/icons/IconQr.svelte';
	import { RECEIVE_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<ButtonHero
	on:click
	disabled={$isBusy}
	ariaLabel={$i18n.receive.text.receive}
	testId={RECEIVE_TOKENS_MODAL_OPEN_BUTTON}
>
	<IconQr size="28" slot="icon" />
	{$i18n.receive.text.receive}
</ButtonHero>
