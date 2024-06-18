<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import ButtonDualMode from '$lib/components/ui/ButtonDualMode.svelte';

	export let compact = false;
</script>

<ButtonDualMode on:click disabled={$isBusy} alt={$i18n.receive.text.receive} {compact}>
	<IconQRCodeScanner size="24" slot="icon-only" />
	<IconReceive size="28" slot="text-icon" />
	{$i18n.receive.text.receive}
</ButtonDualMode>
