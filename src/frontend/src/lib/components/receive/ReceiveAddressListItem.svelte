<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ReceiveActions from '$lib/components/receive/ReceiveActions.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { RECEIVE_TOKENS_MODAL_ADDRESS_LABEL } from '$lib/constants/test-ids.constants';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';
	import type { OptionString } from '$lib/types/string';
	import type { Token } from '$lib/types/token';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { fade } from '$lib/utils/transitions.utils';

	interface Props {
		title: string;
		// What the address takes, when its name alone does not say: shown before the address.
		tag?: string;
		// Shown as loading until it is known.
		address: OptionString;
		// Its native token: the coloured mark that tells the rows apart at a glance.
		token: Token;
		qrCodeAction: ReceiveQRCodeAction;
		copyAriaLabel: string;
		copiedText?: string;
		testId?: string;
	}

	let { title, tag, address, token, qrCodeAction, copyAriaLabel, copiedText, testId }: Props =
		$props();
</script>

<!-- One row of a list of addresses: who it is for at a glance, the full address behind Copy and QR. -->
<div class="flex items-center gap-3 py-2" data-tid={testId} role="listitem">
	<TokenLogo color="white" data={token} logoSize="md" />

	<div class="flex min-w-0 flex-1 flex-col">
		<span class="truncate font-bold text-primary">{title}</span>

		{#if nonNullish(tag)}
			<span class="truncate text-sm font-semibold text-secondary">{tag}</span>
		{/if}

		{#if nonNullish(address)}
			<!-- Seen shortened; read out (and read by tests) in full. -->
			<span class="sr-only" data-tid={RECEIVE_TOKENS_MODAL_ADDRESS_LABEL}>{address}</span>
			<span class="truncate text-sm text-tertiary" aria-hidden="true" in:fade
				>{shortenWithMiddleEllipsis({ text: address, splitLength: 6 })}</span
			>
		{:else}
			<span class="block w-32"><SkeletonText /></span>
		{/if}
	</div>

	{#if nonNullish(address)}
		<div in:fade>
			<ReceiveActions {address} {copiedText} {copyAriaLabel} {qrCodeAction} />
		</div>
	{/if}
</div>
