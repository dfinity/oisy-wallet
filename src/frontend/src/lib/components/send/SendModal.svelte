<script lang="ts">
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
	import { setContext } from 'svelte';
	import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
	import {
		initUtxosFeeStore,
		UTXOS_FEE_CONTEXT_KEY,
		type UtxosFeeContext as UtxosFeeContextType
	} from '$btc/stores/utxos-fee.store';
	import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { decodeQrCode as decodeQrCodeETH } from '$eth/utils/qr-code.utils';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import { isTokenIc } from '$icp/utils/icrc.utils';
	import SendDestinationWizardStep from '$lib/components/send/SendDestinationWizardStep.svelte';
	import SendNftsList from '$lib/components/send/SendNftsList.svelte';
	import SendQrCodeScan from '$lib/components/send/SendQrCodeScan.svelte';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import SendTokensList from '$lib/components/send/SendTokensList.svelte';
	import SendWizard from '$lib/components/send/SendWizard.svelte';
	import ModalNetworksFilter from '$lib/components/tokens/ModalNetworksFilter.svelte';
	import {
		allSendNftsWizardSteps,
		allSendWizardSteps,
		sendNftsWizardStepsWithQrCodeScan,
		sendWizardStepsWithQrCodeScan
	} from '$lib/config/send.config';
	import { SEND_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import {
		btcAddressMainnetNotLoaded,
		ethAddressNotLoaded,
		btcAddressRegtestNotLoaded,
		btcAddressTestnetNotLoaded,
		solAddressLocalnetNotLoaded,
		solAddressDevnetNotLoaded,
		solAddressMainnetNotLoaded
	} from '$lib/derived/address.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { pageNft } from '$lib/derived/page-nft.derived';
	import { enabledTokens, nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { loadTokenAndRun } from '$lib/services/token.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { token } from '$lib/stores/token.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft } from '$lib/types/nft';
	import type { QrResponse, QrStatus } from '$lib/types/qr-code';
	import type { SendDestinationTab } from '$lib/types/send';
	import type { OptionToken, Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import {
		isNetworkIdBTCMainnet,
		isNetworkIdBTCTestnet,
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdBTCRegtest,
		isNetworkIdSOLMainnet,
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal
	} from '$lib/utils/network.utils';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';
	import { decodeQrCode } from '$lib/utils/qr-code.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		isTransactionsPage: boolean;
		isNftsPage: boolean;
	}

	let { isTransactionsPage, isNftsPage }: Props = $props();

	let destination = $state('');
	let activeSendDestinationTab = $state<SendDestinationTab>('recentlyUsed');
	let selectedContact = $state<ContactUi | undefined>();
	let amount = $state<number | undefined>();
	let sendProgressStep = $state<ProgressStepsSend>(ProgressStepsSend.INITIALIZATION);

	let burning = $derived(
		notEmptyString(destination) &&
			nonNullish($token) &&
			isTokenIc($token) &&
			nonNullish($token.mintingAccount) &&
			destination === encodeIcrcAccount($token.mintingAccount)
	);

	let steps = $derived(
		isTransactionsPage
			? sendWizardStepsWithQrCodeScan({ i18n: $i18n, minting: $isIcMintingAccount, burning })
			: isNftsPage
				? nonNullish($pageNft)
					? sendNftsWizardStepsWithQrCodeScan({ i18n: $i18n })
					: allSendNftsWizardSteps({ i18n: $i18n })
				: allSendWizardSteps({ i18n: $i18n, minting: $isIcMintingAccount, burning })
	);

	let currentStep = $state<WizardStep<WizardStepsSend> | undefined>();
	let modal = $state<WizardModal<WizardStepsSend>>();
	let selectedNft = $derived($pageNft);

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: $enabledTokens,
			filterZeroBalance: true,
			filterNetwork: $selectedNetwork
		})
	);

	setContext<UtxosFeeContextType>(UTXOS_FEE_CONTEXT_KEY, {
		store: initUtxosFeeStore()
	});

	const reset = () => {
		destination = '';
		activeSendDestinationTab = 'recentlyUsed';
		selectedContact = undefined;
		amount = undefined;

		sendProgressStep = ProgressStepsSend.INITIALIZATION;

		currentStep = undefined;

		btcPendingSentTransactionsStore.reset();
	};

	const close = () =>
		closeModal(() => {
			reset();
		});

	const isDisabled = ({ network: { id } }: Token): boolean =>
		isNetworkIdEthereum(id) || isNetworkIdEvm(id)
			? $ethAddressNotLoaded
			: isNetworkIdBTCMainnet(id)
				? $btcAddressMainnetNotLoaded
				: isNetworkIdBTCTestnet(id)
					? $btcAddressTestnetNotLoaded
					: isNetworkIdBTCRegtest(id)
						? $btcAddressRegtestNotLoaded
						: isNetworkIdSOLMainnet(id)
							? $solAddressMainnetNotLoaded
							: isNetworkIdSOLDevnet(id)
								? $solAddressDevnetNotLoaded
								: isNetworkIdSOLLocal(id)
									? $solAddressLocalnetNotLoaded
									: false;

	const onSendToken = async (token: Token) => {
		if (isDisabled(token)) {
			const status = await waitWalletReady(() => isDisabled(token));

			if (status === 'timeout') {
				return;
			}
		}

		// eslint-disable-next-line require-await
		const callback = async () => {
			goToStep(WizardStepsSend.DESTINATION);
		};

		await loadTokenAndRun({ token, callback });
	};

	const goToStep = (stepName: WizardStepsSend) => {
		if (nonNullish(modal)) {
			goToWizardStep({
				modal,
				steps,
				stepName
			});
		}
	};

	const onDecodeQrCode = ({
		status,
		code,
		expectedToken
	}: {
		status: QrStatus;
		code?: string;
		expectedToken: OptionToken;
	}): QrResponse => {
		const params = {
			status,
			code,
			expectedToken
		};

		return isNetworkIdEthereum($token?.network.id)
			? decodeQrCodeETH({
					...params,
					ethereumTokens: $enabledEthereumTokens,
					erc20Tokens: $enabledErc20Tokens
				})
			: decodeQrCode(params);
	};

	const selectNft = (nft: Nft) => {
		selectedNft = nft;

		const token = findNonFungibleToken({
			tokens: $nonFungibleTokens,
			networkId: nft.collection.network.id,
			address: nft.collection.address
		});

		if (nonNullish(token)) {
			onSendToken(token);
		}
	};
</script>

<SendTokenContext token={$token}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsSend.SENDING ||
			currentStep?.name === WizardStepsSend.FILTER_NETWORKS}
		onClose={close}
		{steps}
		testId={SEND_TOKENS_MODAL}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		{#key currentStep?.name}
			{#if currentStep?.name === WizardStepsSend.TOKENS_LIST}
				<SendTokensList
					onSelectNetworkFilter={() => goToStep(WizardStepsSend.FILTER_NETWORKS)}
					{onSendToken}
				/>
			{:else if currentStep?.name === WizardStepsSend.NFTS_LIST}
				<SendNftsList
					onSelect={selectNft}
					onSelectNetwork={() => goToStep(WizardStepsSend.FILTER_NETWORKS)}
				/>
			{:else if currentStep?.name === WizardStepsSend.FILTER_NETWORKS}
				<ModalNetworksFilter
					onNetworkFilter={() => goToStep(WizardStepsSend.TOKENS_LIST)}
					showStakeBalance={false}
				/>
			{:else if currentStep?.name === WizardStepsSend.DESTINATION}
				<SendDestinationWizardStep
					formCancelAction={isTransactionsPage || (isNftsPage && nonNullish($pageNft))
						? 'close'
						: 'back'}
					onBack={() => goToStep(WizardStepsSend.TOKENS_LIST)}
					onClose={close}
					onNext={modal.next}
					onQRCodeScan={() => goToStep(WizardStepsSend.QR_CODE_SCAN)}
					bind:destination
					bind:activeSendDestinationTab
					bind:selectedContact
				/>
			{:else if currentStep?.name === WizardStepsSend.QR_CODE_SCAN}
				<SendQrCodeScan
					expectedToken={$token}
					{onDecodeQrCode}
					onQRCodeBack={() => goToStep(WizardStepsSend.DESTINATION)}
					bind:destination
					bind:amount
				/>
			{:else if currentStep?.name === WizardStepsSend.SEND || currentStep?.name === WizardStepsSend.REVIEW || currentStep?.name === WizardStepsSend.SENDING}
				<SendWizard
					{currentStep}
					{destination}
					nft={selectedNft}
					onBack={modal.back}
					onClose={close}
					onNext={modal.next}
					onSendBack={() => goToStep(WizardStepsSend.DESTINATION)}
					onTokensList={() => goToStep(WizardStepsSend.TOKENS_LIST)}
					{selectedContact}
					bind:amount
					bind:sendProgressStep
				/>
			{/if}
		{/key}
	</WizardModal>
</SendTokenContext>
