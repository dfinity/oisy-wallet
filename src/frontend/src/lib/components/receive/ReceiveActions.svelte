<script lang="ts">
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';

	export let address: string;
	export let qrCodeAction: ReceiveQRCodeAction = { enabled: false };
	export let copyAriaLabel: string;
	export let copyButtonTestId: string | undefined = undefined;
</script>

<div class="flex justify-center gap-2">
	{#if qrCodeAction.enabled}
		<ButtonIcon ariaLabel={qrCodeAction.ariaLabel} on:click testId={qrCodeAction?.testId}>
			<IconQRCodeScanner size="24" slot="icon" />
		</ButtonIcon>
	{/if}

	<ReceiveCopy {address} {copyAriaLabel} testId={copyButtonTestId} />
</div>
