<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonDualMode from '$lib/components/ui/ButtonDualMode.svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';

	export let compact = false;
</script>

<ButtonDualMode on:click disabled={$isBusy} alt={$i18n.send.text.send} {compact}>
	<IconSend slot="icon-only" />
	<IconSend size="28" slot="text-icon" />
	{$i18n.send.text.send}
</ButtonDualMode>
