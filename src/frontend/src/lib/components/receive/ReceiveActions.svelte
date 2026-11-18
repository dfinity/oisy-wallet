<script lang="ts">
	import IconQrCodeScanner from '$lib/components/icons/IconQrCodeScanner.svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';

	interface Props {
		address: string;
		qrCodeAction?: ReceiveQRCodeAction;
		copyAriaLabel: string;
		// The confirmation once copied; the button's name otherwise reads it too.
		copiedText?: string;
		copyButtonTestId?: string;
	}

	let {
		address,
		qrCodeAction = { enabled: false },
		copyAriaLabel,
		copiedText,
		copyButtonTestId
	}: Props = $props();
</script>

<div class="flex justify-center gap-2">
	{#if qrCodeAction.enabled}
		<ButtonIcon
			ariaLabel={qrCodeAction.ariaLabel}
			link={false}
			onclick={qrCodeAction.onClick}
			testId={qrCodeAction.testId}
		>
			{#snippet icon()}
				<IconQrCodeScanner size="24" />
			{/snippet}
		</ButtonIcon>
	{/if}

	<ReceiveCopy {address} {copiedText} {copyAriaLabel} testId={copyButtonTestId} />
</div>
