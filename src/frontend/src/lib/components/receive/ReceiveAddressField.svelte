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
		// For a list of addresses: smaller plain text in a tighter box, so the rows stay calm. A single
		// address sets its ends apart for checking.
		compact?: boolean;
	}

	let {
		address,
		label,
		copyAriaLabel,
		copiedText,
		copyButtonTestId,
		qrCodeAction,
		testId,
		leading,
		compact = false
	}: Props = $props();

	// The start and the end are what people compare when they check an address, so those read first.
	let { start, middle, end } = $derived(splitTextEnds({ text: address ?? '' }));
</script>

<div
	class="flex items-center"
	class:bg-brand-subtle-10={!compact}
	class:bg-brand-subtle-20={compact}
	class:gap-3={!compact}
	class:gap-4={compact}
	class:px-3={compact}
	class:px-4={!compact}
	class:py-2={compact}
	class:py-3={!compact}
	class:rounded-lg={compact}
	class:rounded-xl={!compact}
>
	{@render leading?.()}

	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		{#if nonNullish(label)}
			<span class="text-sm font-bold text-primary">{label}</span>
		{/if}

		{#if isNullish(address)}
			<SkeletonText />
		{:else if compact}
			<output class="text-sm break-all text-primary" data-tid={testId} in:fade>{address}</output>
		{:else}
			<!-- The middle stays at the secondary colour: lighter than the ends, still AA on the tint. -->
			<output class="text-base break-all text-primary" data-tid={testId} in:fade
				><span class="font-bold">{start}</span><span class="text-secondary">{middle}</span><span
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
