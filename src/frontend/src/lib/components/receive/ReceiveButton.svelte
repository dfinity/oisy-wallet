<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonDualMode from '$lib/components/ui/ButtonDualMode.svelte';

	export let compact = false;
</script>

<ButtonDualMode on:click disabled={$isBusy} alt={$i18n.receive.text.receive} {compact}>
	<IconReceive size={compact ? '24' : '28'} slot="icon" />
	{$i18n.receive.text.receive}
</ButtonDualMode>
