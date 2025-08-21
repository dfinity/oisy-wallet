<script lang="ts">
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';

	interface Props {
		address: string;
		qrCodeAction?: ReceiveQRCodeAction;
		copyAriaLabel: string;
		copyButtonTestId?: string;
	}

	let {
		address,
		qrCodeAction = { enabled: false },
		copyAriaLabel,
		copyButtonTestId
	}: Props = $props();

	const dispatch = createEventDispatcher();
</script>

<div class="flex justify-center gap-2">
	{#if qrCodeAction.enabled}
		<ButtonIcon
			ariaLabel={qrCodeAction.ariaLabel}
			link={false}
			onclick={() => dispatch('click')}
			testId={qrCodeAction?.testId}
		>
			{#snippet icon()}
				<IconQRCodeScanner size="24" />
			{/snippet}
		</ButtonIcon>
	{/if}

	<ReceiveCopy {address} {copyAriaLabel} testId={copyButtonTestId} />
</div>
