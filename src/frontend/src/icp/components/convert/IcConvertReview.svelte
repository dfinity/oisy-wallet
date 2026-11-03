<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import IcTokenFees from '$icp/components/fee/IcTokenFees.svelte';
	import DestinationValue from '$lib/components/address/DestinationValue.svelte';
	import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
	import FirstTimeDestinationWarning from '$lib/components/send/FirstTimeDestinationWarning.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isFirstTimeDestination } from '$lib/utils/known-destinations.utils';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount?: number;
		destination?: string;
		isDestinationCustom?: boolean;
		knownDestinations: KnownDestinations;
		onConvert: () => void;
		cancel: Snippet;
	}

	let {
		sendAmount,
		receiveAmount,
		destination: destinationProp = '',
		isDestinationCustom = false,
		knownDestinations,
		onConvert,
		cancel
	}: Props = $props();

	const { sourceToken, sourceTokenExchangeRate, destinationToken } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	// The default destination is the user's own address on the twin network; only an address the user
	// entered is checked against the history of previous sends.
	let firstTimeDestination = $derived(
		isDestinationCustom &&
			notEmptyString(destinationProp) &&
			isFirstTimeDestination({
				destination: destinationProp,
				networkId: $destinationToken.network.id,
				knownDestinations
			})
	);

	let firstTimeDestinationConfirmed = $state(false);
</script>

<ConvertReview
	{cancel}
	disabled={firstTimeDestination && !firstTimeDestinationConfirmed}
	{onConvert}
	{receiveAmount}
	{sendAmount}
>
	{#snippet destination()}
		<DestinationValue
			destination={destinationProp}
			fullAddress
			{isDestinationCustom}
			token={$destinationToken}
		/>
	{/snippet}

	{#snippet fee()}
		<IcTokenFees
			networkId={$destinationToken.network.id}
			sourceToken={$sourceToken}
			sourceTokenExchangeRate={$sourceTokenExchangeRate}
		/>
	{/snippet}

	{#snippet infoMessage()}
		{#if firstTimeDestination}
			<div class="mt-4">
				<FirstTimeDestinationWarning
					confirmed={firstTimeDestinationConfirmed}
					onConfirm={() => (firstTimeDestinationConfirmed = !firstTimeDestinationConfirmed)}
					styleClass="mb-0!"
				/>
			</div>
		{/if}
	{/snippet}
</ConvertReview>
