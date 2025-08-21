<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import ReceiveActions from '$lib/components/receive/ReceiveActions.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { RECEIVE_TOKENS_MODAL_ADDRESS_LABEL } from '$lib/constants/test-ids.constants';
	import type { Network } from '$lib/types/network';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';
	import type { OptionString } from '$lib/types/string';

	interface Props {
		text?: Snippet;
		title: Snippet;
		children?: Snippet;
		labelRef: string;
		address: OptionString;
		network: Network;
		qrCodeAction: ReceiveQRCodeAction;
		copyAriaLabel: string;
		testId?: string;
		copyButtonTestId?: string;
	}

	let {
		text,
		title,
		children,
		labelRef,
		address,
		network,
		qrCodeAction,
		copyAriaLabel,
		testId,
		copyButtonTestId
	}: Props = $props();
</script>

<div>
	<Value element="div" ref={labelRef}>
		{#snippet label()}
			{@render title()}
		{/snippet}

		{#snippet content()}
			{#if nonNullish(text)}
				<p class="mb-1.5 break-normal py-2 text-tertiary">
					{@render text?.()}
				</p>
			{/if}

			<div
				class="flex items-center justify-between gap-4 rounded-lg bg-brand-subtle-20 px-3 py-2"
				class:mt-3={isNullish(text)}
				data-tid={testId}
			>
				<div class="h-8 w-8">
					<NetworkLogo color="white" {network} size="sm" />
				</div>

				{#if nonNullish(address)}
					<output
						id="ic-wallet-address"
						class="break-all text-sm"
						data-tid={RECEIVE_TOKENS_MODAL_ADDRESS_LABEL}
						in:fade>{address}</output
					>
				{:else}
					<span class="w-full"><SkeletonText /></span>
				{/if}

				{#if nonNullish(address)}
					<div in:fade>
						<ReceiveActions {address} {copyAriaLabel} {copyButtonTestId} {qrCodeAction} on:click />
					</div>
				{:else}
					<div class="min-w-20">&ZeroWidthSpace;</div>
				{/if}
			</div>

			{@render children?.()}
		{/snippet}
	</Value>
</div>
