<script lang="ts">
	import { IconQRCodeScanner } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';

	export let address: string;
	export let qrCodeAction: ReceiveQRCodeAction = { enabled: false };
	export let copyAriaLabel: string;
	export let copyButtonTestId: string | undefined = undefined;

	const dispatch = createEventDispatcher();
</script>

<div class="flex justify-center gap-2">
	{#if qrCodeAction.enabled}
		<ButtonIcon
			ariaLabel={qrCodeAction.ariaLabel}
			onclick={() => dispatch('click')}
			testId={qrCodeAction?.testId}
			link={false}
		>
			{#snippet icon()}
				<IconQRCodeScanner size="24" />
			{/snippet}
		</ButtonIcon>
	{/if}

	<ReceiveCopy {address} {copyAriaLabel} testId={copyButtonTestId} />
</div>
