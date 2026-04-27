<script lang="ts">
	import AnimatedScanIcon from '$lib/components/icons/animated/AnimatedScanIcon.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const modalId = Symbol();
</script>

<ButtonIcon
	ariaLabel={$i18n.scanner.text.scan_qr_code}
	colorStyle="tertiary-alt"
	link={false}
	onclick={() => modalStore.openUniversalScanner({ id: modalId })}
>
	{#snippet icon()}
		<AnimatedScanIcon />
	{/snippet}
	{$i18n.scanner.text.scan_qr_code}
</ButtonIcon>
