<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { modalUniversalScannerOpen } from '$lib/derived/modal.derived';
	import IconScanLine from '$lib/components/icons/IconScanLine.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonIcon from '../ui/ButtonIcon.svelte';

	const modalId = Symbol();
</script>

<ButtonIcon
	ariaLabel={$i18n.navigation.alt.menu}
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
