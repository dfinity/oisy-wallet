<script lang="ts">
	import ScannerWizard from '$lib/components/scanner/ScannerWizard.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { modalUniversalScannerOpen } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import IconPay from "$lib/components/icons/IconPay.svelte";

	const modalId = Symbol();
</script>

<ButtonIcon
	ariaLabel={$i18n.pay.alt.pay}
	colorStyle="tertiary-alt"
	link={false}
	onclick={() => modalStore.openUniversalScanner(modalId)}
>
	{#snippet icon()}
		<IconPay height="24" />
	{/snippet}
	{$i18n.pay.text.pay}
</ButtonIcon>

{#if $modalUniversalScannerOpen}
	<ScannerWizard />
{/if}
