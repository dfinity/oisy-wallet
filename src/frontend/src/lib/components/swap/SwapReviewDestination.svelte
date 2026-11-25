<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, untrack } from 'svelte';
	import { btcKnownDestinations } from '$btc/derived/btc-transactions.derived';
	import { ethKnownDestinations } from '$eth/derived/eth-transactions.derived';
	import DestinationValue from '$lib/components/address/DestinationValue.svelte';
	import FirstTimeDestinationWarning from '$lib/components/send/FirstTimeDestinationWarning.svelte';
	import {
		btcAddressMainnet,
		ethAddress,
		solAddressMainnet,
		xrpAddressMainnet
	} from '$lib/derived/address.derived';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { SwapProvider } from '$lib/types/swap';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { isFirstTimeDestination } from '$lib/utils/known-destinations.utils';
	import { isNetworkIdBitcoin, isNetworkIdSolana } from '$lib/utils/network.utils';
	import {
		isSwapCustomDestinationNetworkId,
		resolveSwapRecipientAddress
	} from '$lib/utils/swap.utils';
	import { solKnownDestinations } from '$sol/derived/sol-transactions.derived';

	interface Props {
		// Whether the destination holds the swap back: a quote for another recipient than the one the
		// user chose, or a first-time address whose warning is not ticked yet.
		swapBlocked?: boolean;
	}

	let { swapBlocked = $bindable(false) }: Props = $props();

	const { destinationToken, customDestination } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let selectedProvider = $derived($swapAmountsStore?.selectedProvider);

	let networkId = $derived($destinationToken?.network.id);

	// The address the signed quote pays out to, which is what the user confirms, whatever the form
	// holds.
	let quoteRecipient = $derived(
		selectedProvider?.provider === SwapProvider.NEAR_INTENTS
			? selectedProvider.swapDetails.quoteRequest.recipient
			: undefined
	);

	let show = $derived(nonNullish(quoteRecipient) && isSwapCustomDestinationNetworkId(networkId));

	let ownAddress = $derived.by(() => {
		if (isNullish($destinationToken)) {
			return;
		}

		const resolution = resolveSwapRecipientAddress({
			destinationToken: $destinationToken,
			userEthAddress: $ethAddress,
			userSolAddress: $solAddressMainnet,
			userBtcAddress: $btcAddressMainnet,
			userXrpAddress: $xrpAddressMainnet
		});

		return resolution.type === 'resolved' ? resolution.recipientAddress : undefined;
	});

	let paysOwnAddress = $derived(
		nonNullish(networkId) &&
			areAddressesEqual({ address1: quoteRecipient, address2: ownAddress, networkId })
	);

	let paysChosenDestination = $derived(
		nonNullish(networkId) &&
			areAddressesEqual({
				address1: quoteRecipient,
				address2: $customDestination ?? ownAddress,
				networkId
			})
	);

	let knownDestinations: KnownDestinations | undefined = $derived(
		isNetworkIdSolana(networkId)
			? $solKnownDestinations
			: isNetworkIdBitcoin(networkId)
				? $btcKnownDestinations
				: $ethKnownDestinations
	);

	// The user's own address is never a first-time destination; any other one is, until the wallet
	// has sent to it on that network.
	let firstTimeDestination = $derived(
		show &&
			!paysOwnAddress &&
			nonNullish(quoteRecipient) &&
			isFirstTimeDestination({ destination: quoteRecipient, networkId, knownDestinations })
	);

	let firstTimeDestinationConfirmed = $state(false);

	$effect(() => {
		[quoteRecipient];

		untrack(() => (firstTimeDestinationConfirmed = false));
	});

	$effect(() => {
		swapBlocked =
			show && (!paysChosenDestination || (firstTimeDestination && !firstTimeDestinationConfirmed));
	});
</script>

{#if show && nonNullish($destinationToken) && nonNullish(quoteRecipient)}
	<DestinationValue
		destination={quoteRecipient}
		fullAddress
		isDestinationCustom={!paysOwnAddress}
		token={$destinationToken}
	/>

	{#if firstTimeDestination}
		<div class="mt-4">
			<FirstTimeDestinationWarning
				confirmed={firstTimeDestinationConfirmed}
				onConfirm={() => (firstTimeDestinationConfirmed = !firstTimeDestinationConfirmed)}
				styleClass="mb-0!"
			/>
		</div>
	{/if}
{/if}
