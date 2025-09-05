<script lang="ts">
	import QrCodeScanner from '$lib/components/qr/QrCodeScanner.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { ADDRESS_BOOK_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
	import type { QrStatus } from '$lib/types/qr-code';

	interface Props {
		onCancel: () => void;
		onScan: ({ status, code }: { status: QrStatus; code?: string }) => void;
	}

	let { onCancel, onScan }: Props = $props();
</script>

<ContentWithToolbar styleClass="flex flex-col items-center gap-3 md:gap-4 w-full">
	<QrCodeScanner onBack={onCancel} {onScan} />

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onCancel} testId={ADDRESS_BOOK_CANCEL_BUTTON} />
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
