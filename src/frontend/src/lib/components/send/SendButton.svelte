<script lang="ts">
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconlySend from '$lib/components/icons/iconly/IconlySend.svelte';
	import { SEND_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<ButtonHero
	on:click
	disabled={$isBusy}
	ariaLabel={$i18n.send.text.send}
	testId={SEND_TOKENS_MODAL_OPEN_BUTTON}
>
	<IconlySend size="28" slot="icon" />
	{$i18n.send.text.send}
</ButtonHero>
