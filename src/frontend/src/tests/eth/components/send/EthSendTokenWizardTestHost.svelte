<script lang="ts">
	import { setContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { SEND_CONTEXT_KEY } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token, TokenId } from '$lib/types/token';
	import type { WizardStep } from '$lib/types/wizard';

	interface SendContextForTest {
		sendToken: Readable<Token | NonFungibleToken>;
		sendTokenDecimals: Readable<number>;
		sendTokenId: Readable<TokenId>;
		sendEthCustomNonce: Readable<number | undefined>;
	}

	interface Props {
		currentStep: WizardStep;
		destination: string;
		sendContext: SendContextForTest;
		sourceNetwork: EthereumNetwork;
		nativeEthereumToken: Token;
		amount?: OptionAmount;
		initialSendProgressStep?: string;
		nft?: Nft;
		selectedContact?: ContactUi;
		onCloseStep: (step: string) => void;
	}

	let {
		currentStep,
		destination,
		sendContext,
		sourceNetwork,
		nativeEthereumToken,
		amount: initialAmount = 1,
		initialSendProgressStep = ProgressStepsSend.INITIALIZATION,
		nft,
		selectedContact,
		onCloseStep
	}: Props = $props();

	// eslint-disable-next-line svelte/no-unused-svelte-ignore
	// svelte-ignore state_referenced_locally -- this test host intentionally snapshots the initial prop as local bindable state.
	let amount = $state<OptionAmount>(initialAmount);
	// eslint-disable-next-line svelte/no-unused-svelte-ignore
	// svelte-ignore state_referenced_locally -- this test host intentionally snapshots the initial prop as local bindable state.
	let sendProgressStep = $state(initialSendProgressStep);

	// eslint-disable-next-line svelte/no-unused-svelte-ignore
	// svelte-ignore state_referenced_locally -- this test host initializes context once for the mounted component under test.
	setContext(SEND_CONTEXT_KEY, sendContext);

	const close = () => onCloseStep(sendProgressStep);
</script>

<EthSendTokenWizard
	{currentStep}
	{destination}
	{nativeEthereumToken}
	{nft}
	onBack={() => {}}
	onClose={close}
	onNext={() => {}}
	onSendBack={() => {}}
	onTokensList={() => {}}
	{selectedContact}
	{sourceNetwork}
	bind:amount
	bind:sendProgressStep
/>
