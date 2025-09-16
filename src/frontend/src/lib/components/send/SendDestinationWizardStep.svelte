<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, onMount } from 'svelte';
	import BtcSendDestination from '$btc/components/send/BtcSendDestination.svelte';
	import { btcNetworkContacts } from '$btc/derived/btc-contacts.derived';
	import { btcKnownDestinations } from '$btc/derived/btc-transactions.derived';
	import LoaderMultipleEthTransactions from '$eth/components/loaders/LoaderMultipleEthTransactions.svelte';
	import EthSendDestination from '$eth/components/send/EthSendDestination.svelte';
	import { ethNetworkContacts } from '$eth/derived/eth-contacts.derived';
	import { ethKnownDestinations } from '$eth/derived/eth-transactions.derived';
	import { nativeEthereumTokenId } from '$eth/derived/token.derived';
	import IcSendDestination from '$icp/components/send/IcSendDestination.svelte';
	import { icNetworkContacts } from '$icp/derived/ic-contacts.derived';
	import { icKnownDestinations } from '$icp/derived/ic-transactions.derived';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import SendDestinationTabs from '$lib/components/send/SendDestinationTabs.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { MIN_DESTINATION_LENGTH_FOR_ERROR_STATE } from '$lib/constants/app.constants';
	import {
		SEND_DESTINATION_WIZARD_STEP,
		SEND_FORM_DESTINATION_NEXT_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { contacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { SendDestinationTab } from '$lib/types/send';
	import { getContactForAddress } from '$lib/utils/contact.utils';
	import {
		isNetworkIdBitcoin,
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';
	import SolSendDestination from '$sol/components/send/SolSendDestination.svelte';
	import { solNetworkContacts } from '$sol/derived/sol-contacts.derived';
	import { solKnownDestinations } from '$sol/derived/sol-transactions.derived';

	interface Props {
		destination: string;
		activeSendDestinationTab: SendDestinationTab;
		selectedContact?: ContactUi;
		formCancelAction?: 'back' | 'close';
	}
	let {
		destination = $bindable(),
		activeSendDestinationTab = $bindable(),
		selectedContact = $bindable(),
		formCancelAction = 'back'
	}: Props = $props();

	onMount(() => {
		selectedContact = undefined;
	});

	const { sendToken, sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	const back = () => dispatch('icBack');
	const next = () => {
		if (isNullish(selectedContact)) {
			// if next button is clicked and there is no contact selected,
			// we manually lookup the contact and select it if one exists
			const contact = getContactForAddress({ addressString: destination, contactList: $contacts });
			if (nonNullish(contact)) {
				selectedContact = contact;
			}
		}
		dispatch('icNext');
	};
	const close = () => dispatch('icClose');

	let invalidDestination = $state(false);

	let disabled = $derived(
		invalidDestination || destination.length <= MIN_DESTINATION_LENGTH_FOR_ERROR_STATE
	);

	let testId = $derived(`${SEND_DESTINATION_WIZARD_STEP}-${$sendToken.network.name}`);
</script>

<ContentWithToolbar>
	{#if isNetworkIdEthereum($sendTokenNetworkId) || isNetworkIdEvm($sendTokenNetworkId)}
		<div data-tid={testId}>
			<CkEthLoader isSendFlow={true} nativeTokenId={$nativeEthereumTokenId}>
				<LoaderMultipleEthTransactions>
					<EthSendDestination
						knownDestinations={$ethKnownDestinations}
						networkContacts={$ethNetworkContacts}
						token={$sendToken}
						bind:destination
						bind:invalidDestination
						on:icQRCodeScan
					/>
					<SendDestinationTabs
						knownDestinations={$ethKnownDestinations}
						networkContacts={$ethNetworkContacts}
						bind:destination
						bind:activeSendDestinationTab
						bind:selectedContact
						on:icNext={next}
					/>
				</LoaderMultipleEthTransactions>
			</CkEthLoader>
		</div>
	{:else if isNetworkIdICP($sendTokenNetworkId)}
		<div data-tid={testId}>
			<IcSendDestination
				knownDestinations={$icKnownDestinations}
				networkContacts={$icNetworkContacts}
				tokenStandard={$sendToken.standard}
				bind:destination
				bind:invalidDestination
				on:icQRCodeScan
			/>
			<SendDestinationTabs
				knownDestinations={$icKnownDestinations}
				networkContacts={$icNetworkContacts}
				bind:destination
				bind:activeSendDestinationTab
				bind:selectedContact
				on:icNext={next}
			/>
		</div>
	{:else if isNetworkIdBitcoin($sendTokenNetworkId)}
		<div data-tid={testId}>
			<BtcSendDestination
				knownDestinations={$btcKnownDestinations}
				networkContacts={$btcNetworkContacts}
				networkId={$sendTokenNetworkId}
				bind:destination
				bind:invalidDestination
				on:icQRCodeScan
			/>
			<SendDestinationTabs
				knownDestinations={$btcKnownDestinations}
				networkContacts={$btcNetworkContacts}
				bind:destination
				bind:activeSendDestinationTab
				bind:selectedContact
				on:icNext={next}
			/>
		</div>
	{:else if isNetworkIdSolana($sendTokenNetworkId)}
		<div data-tid={testId}>
			<SolSendDestination
				knownDestinations={$solKnownDestinations}
				networkContacts={$solNetworkContacts}
				bind:destination
				bind:invalidDestination
				on:icQRCodeScan
			/>
			<SendDestinationTabs
				knownDestinations={$solKnownDestinations}
				networkContacts={$solNetworkContacts}
				bind:destination
				bind:activeSendDestinationTab
				bind:selectedContact
				on:icNext={next}
			/>
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			{#if formCancelAction === 'back'}
				<ButtonBack onclick={back} />
			{:else}
				<ButtonCancel onclick={close} />
			{/if}

			<Button {disabled} onclick={next} testId={SEND_FORM_DESTINATION_NEXT_BUTTON}>
				{$i18n.core.text.next}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
