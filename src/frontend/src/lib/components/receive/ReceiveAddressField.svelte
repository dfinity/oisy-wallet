<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import ReceiveActions from '$lib/components/receive/ReceiveActions.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';
	import type { OptionString } from '$lib/types/string';
	import { splitTextEnds } from '$lib/utils/format.utils';
	import { fade } from '$lib/utils/transitions.utils';

	interface Props {
		// Shown as loading until it is known.
		address: OptionString;
		label?: string;
		copyAriaLabel: string;
		copiedText?: string;
		copyButtonTestId?: string;
		qrCodeAction?: ReceiveQRCodeAction;
		testId?: string;
		// Before the address, such as the logo of its network.
		leading?: Snippet;
	}

	let {
		address,
		label,
		copyAriaLabel,
		copiedText,
		copyButtonTestId,
		qrCodeAction,
		testId,
		leading
	}: Props = $props();

	// The start and the end are what people compare when they check an address, so those read first.
	let { start, middle, end } = $derived(splitTextEnds({ text: address ?? '' }));
</script>

<div class="flex items-center gap-3 rounded-xl bg-brand-subtle-10 px-4 py-3">
	{@render leading?.()}

	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		{#if nonNullish(label)}
			<span class="text-sm font-bold text-primary">{label}</span>
		{/if}

		{#if isNullish(address)}
			<SkeletonText />
		{:else}
			<output class="text-base break-all text-primary" data-tid={testId} in:fade
				><span class="font-bold">{start}</span><span class="text-tertiary">{middle}</span><span
					class="font-bold">{end}</span
				></output
			>
		{/if}
	</div>

	{#if nonNullish(address)}
		<div in:fade>
			<ReceiveActions {address} {copiedText} {copyAriaLabel} {copyButtonTestId} {qrCodeAction} />
		</div>
	{/if}
</div>
