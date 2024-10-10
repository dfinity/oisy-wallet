<script lang="ts">
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
</script>

<ButtonHero
	on:click
	disabled={$isBusy}
	ariaLabel={$i18n.send.text.send}
	testId={SEND_TOKENS_MODAL_OPEN_BUTTON}
>
	<IconSend size="28" slot="icon" />
	{$i18n.send.text.send}
</ButtonHero>
