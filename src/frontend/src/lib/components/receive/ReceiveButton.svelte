<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';
	import { RECEIVE_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
</script>

<ButtonHero
	on:click
	disabled={$isBusy}
	ariaLabel={$i18n.receive.text.receive}
	testId={RECEIVE_TOKENS_MODAL_OPEN_BUTTON}
>
	<IconReceive size="28" slot="icon" />
	{$i18n.receive.text.receive}
</ButtonHero>
