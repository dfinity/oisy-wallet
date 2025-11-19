<script lang="ts">
	import IconScanLine from '$lib/components/icons/IconScanLine.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { modalUniversalScannerOpen } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const modalId = Symbol();
</script>

<ButtonIcon
	ariaLabel={$i18n.scanner.text.scan_qr_code}
	colorStyle="tertiary-alt"
	link={false}
	onclick={() => modalStore.openUniversalScanner(modalId)}
>
	{#snippet icon()}
		<IconScanLine size="24" />
	{/snippet}
	{$i18n.scanner.text.scan_qr_code}
</ButtonIcon>

{#if $modalUniversalScannerOpen}
	<!-- TODO: add ScannerWizard -->
{/if}
