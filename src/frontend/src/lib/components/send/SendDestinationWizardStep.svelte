<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import BtcSendDestination from '$btc/components/send/BtcSendDestination.svelte';
	import { btcKnownDestinations } from '$btc/derived/btc-transactions.derived';
	import EthSendDestination from '$eth/components/send/EthSendDestination.svelte';
	import { ethKnownDestinations } from '$eth/derived/eth-transactions.derived';
	import { ethereumTokenId } from '$eth/derived/token.derived';
	import IcSendDestination from '$icp/components/send/IcSendDestination.svelte';
	import { icKnownDestinations } from '$icp/derived/ic-transactions.derived';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import KnownDestinationsComponent from '$lib/components/send/KnownDestinations.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { SEND_DESTINATION_WIZARD_STEP } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdBitcoin,
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';
	import SolSendDestination from '$sol/components/send/SolSendDestination.svelte';
	import { solKnownDestinations } from '$sol/derived/sol-transactions.derived';

	interface Props {
		destination: string;
		formCancelAction?: 'back' | 'close';
	}
	let { destination = $bindable(), formCancelAction = 'back' }: Props = $props();

	const { sendToken, sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	const back = () => dispatch('icBack');
	const next = () => dispatch('icNext');
	const close = () => dispatch('icClose');

	let invalidDestination = $state(false);

	let disabled = $derived(invalidDestination || isNullishOrEmpty(destination));

	let testId = $derived(`${SEND_DESTINATION_WIZARD_STEP}-${$sendToken.network.name}`);
</script>

<ContentWithToolbar>
	{#if isNetworkIdEthereum($sendTokenNetworkId) || isNetworkIdEvm($sendTokenNetworkId)}
		<div data-tid={testId}>
			<CkEthLoader nativeTokenId={$ethereumTokenId} isSendFlow={true}>
				<EthSendDestination
					token={$sendToken}
					knownDestinations={$ethKnownDestinations}
					bind:destination
					bind:invalidDestination
					on:icQRCodeScan
				/>
				<KnownDestinationsComponent
					knownDestinations={$ethKnownDestinations}
					bind:destination
					on:icNext={next}
				/>
			</CkEthLoader>
		</div>
	{:else if isNetworkIdICP($sendTokenNetworkId)}
		<div data-tid={testId}>
			<IcSendDestination
				tokenStandard={$sendToken.standard}
				knownDestinations={$icKnownDestinations}
				bind:destination
				bind:invalidDestination
				on:icQRCodeScan
			/>
			<KnownDestinationsComponent
				knownDestinations={$icKnownDestinations}
				bind:destination
				on:icNext={next}
			/>
		</div>
	{:else if isNetworkIdBitcoin($sendTokenNetworkId)}
		<div data-tid={testId}>
			<BtcSendDestination
				bind:destination
				bind:invalidDestination
				on:icQRCodeScan
				knownDestinations={$btcKnownDestinations}
			/>
			<KnownDestinationsComponent
				knownDestinations={$btcKnownDestinations}
				bind:destination
				on:icNext={next}
			/>
		</div>
	{:else if isNetworkIdSolana($sendTokenNetworkId)}
		<div data-tid={testId}>
			<SolSendDestination
				bind:destination
				bind:invalidDestination
				on:icQRCodeScan
				knownDestinations={$solKnownDestinations}
			/>
			<KnownDestinationsComponent
				knownDestinations={$solKnownDestinations}
				bind:destination
				on:icNext={next}
			/>
		</div>
	{/if}

	<ButtonGroup slot="toolbar">
		{#if formCancelAction === 'back'}
			<ButtonBack onclick={back} />
		{:else}
			<ButtonCancel onclick={close} />
		{/if}

		<Button on:click={next} {disabled}>
			{$i18n.core.text.next}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
