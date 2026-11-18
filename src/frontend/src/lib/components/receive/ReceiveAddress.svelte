<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import ReceiveAddressField from '$lib/components/receive/ReceiveAddressField.svelte';
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
				<p class="mb-1.5 py-2 break-normal text-tertiary">
					{@render text?.()}
				</p>
			{/if}

			<div class:mt-1.5={isNullish(text)} data-tid={testId}>
				<ReceiveAddressField
					{address}
					{copyAriaLabel}
					{copyButtonTestId}
					{qrCodeAction}
					testId={RECEIVE_TOKENS_MODAL_ADDRESS_LABEL}
				>
					{#snippet leading()}
						<NetworkLogo color="white" {network} size="sm" />
					{/snippet}
				</ReceiveAddressField>
			</div>

			{@render children?.()}
		{/snippet}
	</Value>
</div>
