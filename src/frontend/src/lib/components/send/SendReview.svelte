<script lang="ts">
	import { isNullish, notEmptyString } from '@dfinity/utils';
	import { getContext, untrack, type Snippet } from 'svelte';
	import { btcKnownDestinations } from '$btc/derived/btc-transactions.derived';
	import { ethKnownDestinations } from '$eth/derived/eth-transactions.derived';
	import { icKnownDestinations } from '$icp/derived/ic-transactions.derived';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import FirstTimeDestinationWarning from '$lib/components/send/FirstTimeDestinationWarning.svelte';
	import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
	import SendNftReview from '$lib/components/tokens/SendNftReview.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { REVIEW_FORM_SEND_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft } from '$lib/types/nft';
	import type { OptionAmount } from '$lib/types/send';
	import { isFirstTimeDestination } from '$lib/utils/known-destinations.utils';
	import {
		isNetworkIdBitcoin,
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';
	import { solKnownDestinations } from '$sol/derived/sol-transactions.derived';

	interface BaseProps {
		destination?: string;
		amount?: OptionAmount;
		disabled?: boolean;
		selectedContact?: ContactUi;
		nft?: Nft;
		network?: Snippet;
		fee?: Snippet;
		info?: Snippet;
		topBanner?: Snippet;
	}

	type Props = BaseProps &
		(
			| {
					onBack: () => void;
					onSend: () => void;
			  }
			| {
					replaceToolbar: Snippet;
			  }
		);

	let {
		destination = '',
		amount,
		disabled = false,
		selectedContact,
		nft,
		network,
		fee,
		info,
		topBanner,
		...rest
	}: Props = $props();

	const { sendToken, sendTokenExchangeRate, isIcBurning } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let networkId = $derived($sendToken.network.id);

	// The store is resolved lazily, so that only the chain the user is sending on is subscribed.
	let knownDestinations = $derived(
		isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)
			? $ethKnownDestinations
			: isNetworkIdICP(networkId)
				? $icKnownDestinations
				: isNetworkIdBitcoin(networkId)
					? $btcKnownDestinations
					: isNetworkIdSolana(networkId)
						? $solKnownDestinations
						: undefined
	);

	// Minting is the minter sending out: a first-time counterparty is the norm there, and the
	// destination is a peer rather than something to verify against a history. Burning is not
	// exempt - sending assets to a minter account by mistake destroys them.
	let firstTimeDestination = $derived(
		!$isIcMintingAccount &&
			notEmptyString(destination) &&
			isFirstTimeDestination({ destination, networkId, knownDestinations })
	);

	let firstTimeDestinationConfirmed = $state(false);

	const resetFirstTimeDestinationConfirmation = () => {
		firstTimeDestinationConfirmed = false;
	};

	$effect(() => {
		[destination, firstTimeDestination];

		untrack(resetFirstTimeDestinationConfirmation);
	});

	let sendDisabled = $derived(disabled || (firstTimeDestination && !firstTimeDestinationConfirmed));
</script>

<ContentWithToolbar>
	{@render topBanner?.()}

	{#if isNullish(nft)}
		<SendTokenReview exchangeRate={$sendTokenExchangeRate} sendAmount={amount} token={$sendToken}>
			{#snippet subtitle()}
				{$isIcMintingAccount
					? $i18n.mint.text.mint_review_subtitle
					: $isIcBurning
						? $i18n.burn.text.burn_review_subtitle
						: $i18n.send.text.send_review_subtitle}
			{/snippet}
		</SendTokenReview>
	{:else}
		<SendNftReview {nft} />
	{/if}

	<div class="mb-4">
		<SendReviewDestination {destination} {selectedContact} />
	</div>

	{@render network?.()}

	{@render fee?.()}

	{@render info?.()}

	{#if firstTimeDestination}
		<FirstTimeDestinationWarning
			confirmed={firstTimeDestinationConfirmed}
			onConfirm={() => (firstTimeDestinationConfirmed = !firstTimeDestinationConfirmed)}
		/>
	{/if}

	{#snippet toolbar()}
		{#if 'replaceToolbar' in rest}
			{@render rest.replaceToolbar()}
		{:else}
			{@const { onBack, onSend } = rest}

			<ButtonGroup testId="toolbar">
				<ButtonBack onclick={onBack} />
				<Button disabled={sendDisabled} onclick={onSend} testId={REVIEW_FORM_SEND_BUTTON}>
					{$isIcMintingAccount
						? $i18n.mint.text.mint
						: $isIcBurning
							? $i18n.burn.text.burn
							: $i18n.send.text.send}
				</Button>
			</ButtonGroup>
		{/if}
	{/snippet}
</ContentWithToolbar>
