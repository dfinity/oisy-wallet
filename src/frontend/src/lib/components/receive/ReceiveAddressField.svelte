<script lang="ts">
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import { RECEIVE_TOKENS_MODAL_ADDRESS_LABEL } from '$lib/constants/test-ids.constants';

	interface Props {
		label: string;
		address: string;
		copyAriaLabel: string;
		copiedText?: string;
		copyButtonTestId?: string;
	}

	let { label, address, copyAriaLabel, copiedText, copyButtonTestId }: Props = $props();

	// The start and the end are what people compare when they check an address, so those read first.
	const EMPHASIZED_CHARS = 6;

	let emphasized = $derived(address.length > EMPHASIZED_CHARS * 2 + 4);

	let head = $derived(emphasized ? address.slice(0, EMPHASIZED_CHARS) : address);
	let middle = $derived(
		emphasized ? address.slice(EMPHASIZED_CHARS, address.length - EMPHASIZED_CHARS) : ''
	);
	let tail = $derived(emphasized ? address.slice(-EMPHASIZED_CHARS) : '');
</script>

<div class="flex items-center gap-3 rounded-xl bg-brand-subtle-10 px-4 py-3">
	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		<span class="text-sm text-tertiary">{label}</span>

		<output class="text-base break-all text-primary" data-tid={RECEIVE_TOKENS_MODAL_ADDRESS_LABEL}
			><span class="font-bold">{head}</span><span class="text-tertiary">{middle}</span><span
				class="font-bold">{tail}</span
			></output
		>
	</div>

	<ReceiveCopy {address} {copiedText} {copyAriaLabel} testId={copyButtonTestId} />
</div>
