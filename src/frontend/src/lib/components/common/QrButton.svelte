<script lang="ts">
	import { createBubbler, preventDefault } from 'svelte/legacy';

	const bubble = createBubbler();
	import IconScanLine from '$lib/components/icons/IconScanLine.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<button
	type="button"
	data-tid="qr-code-scanner-button"
	onclick={preventDefault(bubble('click'))}
	class="text-brand-primary hover:text-inherit active:text-inherit"
	aria-label={$i18n.send.text.open_qr_modal}
>
	<IconScanLine />
</button>
