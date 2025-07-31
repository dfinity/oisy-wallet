<script lang="ts">
	import IconScanLine from '$lib/components/icons/IconScanLine.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<button
	class="text-brand-primary hover:text-inherit active:text-inherit"
	aria-label={$i18n.send.text.open_qr_modal}
	data-tid="qr-code-scanner-button"
	type="button"
	on:click|preventDefault
>
	<IconScanLine />
</button>
