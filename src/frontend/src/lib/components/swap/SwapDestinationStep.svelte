<script lang="ts">
	import { getContext } from 'svelte';
	import SendDestinationWizardStep from '$lib/components/send/SendDestinationWizardStep.svelte';
	import TokenActionContext from '$lib/components/send/TokenActionContext.svelte';
	import {
		btcAddressMainnet,
		ethAddress,
		solAddressMainnet,
		xrpAddressMainnet
	} from '$lib/derived/address.derived';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { SendDestinationTab } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { resolveSwapRecipientAddress } from '$lib/utils/swap.utils';

	interface Props {
		// The receive token: the address must be one on its network.
		token: Token;
		// Back to the swap form, with the destination picked or left as it was.
		onBack: () => void;
		onQRCodeScan: () => void;
	}

	let { token, onBack, onQRCodeScan }: Props = $props();

	const { customDestinationDraft, setCustomDestination } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let activeSendDestinationTab = $state<SendDestinationTab>('recentlyUsed');
	let selectedContact = $state<ContactUi | undefined>();

	let ownAddress = $derived.by(() => {
		const resolution = resolveSwapRecipientAddress({
			destinationToken: token,
			userEthAddress: $ethAddress,
			userSolAddress: $solAddressMainnet,
			userBtcAddress: $btcAddressMainnet,
			userXrpAddress: $xrpAddressMainnet
		});

		return resolution.type === 'resolved' ? resolution.recipientAddress : undefined;
	});

	const next = () => {
		// The user's own address is "Your OISY Wallet", not someone else's address.
		const isOwnAddress = areAddressesEqual({
			address1: $customDestinationDraft,
			address2: ownAddress,
			networkId: token.network.id
		});

		setCustomDestination(isOwnAddress ? undefined : $customDestinationDraft);

		onBack();
	};
</script>

<!-- Send's destination step checks the address, and lists the recently used addresses and contacts,
for the token of a send context: here, the receive token. -->
<TokenActionContext {token}>
	<SendDestinationWizardStep
		formCancelAction="back"
		{onBack}
		onClose={onBack}
		onNext={next}
		{onQRCodeScan}
		bind:destination={$customDestinationDraft}
		bind:activeSendDestinationTab
		bind:selectedContact
	/>
</TokenActionContext>
