<script lang="ts">
	import { fade } from 'svelte/transition';
	import IconScanLine from '$lib/components/icons/IconScanLine.svelte';
	import { modalUniversalScannerOpen } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const modalId = Symbol();
</script>

<button
	class="tertiary-alt icon h-10"
	aria-label={$i18n.scanner.text.scan_qr_code}
	onclick={() => modalStore.openUniversalScanner(modalId)}
	in:fade
>
	<IconScanLine size="24" />
</button>

{#if $modalUniversalScannerOpen}
	//TODO: add ScannerWizard
{/if}
