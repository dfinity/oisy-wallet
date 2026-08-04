<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
	import { setContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
	import { enabledErc4626Tokens } from '$eth/derived/erc4626.derived';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { decodeQrCode as decodeQrCodeETH } from '$eth/utils/qr-code.utils';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import { isTokenIc } from '$icp/utils/icrc.utils';
	import SendDestinationWizardStep from '$lib/components/send/SendDestinationWizardStep.svelte';
	import SendNftsList from '$lib/components/send/SendNftsList.svelte';
	import SendQrCodeScan from '$lib/components/send/SendQrCodeScan.svelte';
	import SendTokensList from '$lib/components/send/SendTokensList.svelte';
	import SendWizard from '$lib/components/send/SendWizard.svelte';
	import TokenActionContext from '$lib/components/send/TokenActionContext.svelte';
	import ModalNetworksFilter from '$lib/components/tokens/ModalNetworksFilter.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
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
	import { modalSendData } from '$lib/derived/modal.derived';
	import { routeNft } from '$lib/derived/nav.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { pageCollectionNfts, pageNft } from '$lib/derived/page-nft.derived';
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
	import { dirtyWizardState } from '$lib/stores/progressWizardState.store';
	import { SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY } from '$lib/stores/scanned-plain-address-send.store';
	import { token } from '$lib/stores/token.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft } from '$lib/types/nft';
	import type { QrResponse, QrStatus } from '$lib/types/qr-code';
	import type { SendDestinationTab } from '$lib/types/send';
	import type { OptionToken, Token } from '$lib/types/token';
	import type { WizardStep } from '$lib/types/wizard';
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
	import { findNonFungibleToken, getNftSendCloseRedirectUrl } from '$lib/utils/nfts.utils';
	import { decodeQrCode } from '$lib/utils/qr-code.utils';
	import { shouldSkipDestinationStep } from '$lib/utils/send.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		isTransactionsPage: boolean;
		isNftsPage: boolean;
	}

	let { isTransactionsPage, isNftsPage }: Props = $props();

	const initialModalData = $modalSendData;
	const lockedNetworkIds = initialModalData?.lockedNetworkIds;
	let lockedNetwork = $derived(
		nonNullish(lockedNetworkIds) && lockedNetworkIds.length === 1
			? $networks.find(({ id }) => id === lockedNetworkIds[0])
			: undefined
	);

	let destination = $state(initialModalData?.destination ?? '');
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

	// IMPORTANT: do NOT inline `nonNullish($pageNft)` into the `steps` derivation below.
	//
	// `LoaderNfts` re-emits a fresh `Nft` reference for the same logical NFT every
	// `NFT_TIMER_INTERVAL_MILLIS` (20s) while the user is on the `/nfts` page. Reading that
	// reference directly inside `steps` would make `steps` re-derive on every tick and return a
	// fresh array literal, because Svelte 5's `$derived` uses `safe_not_equal` on its OUTPUT to
	// gate downstream propagation: two distinct array references are never equal, so every tick
	// would propagate. `WizardModal` (gix-components) reacts to that by rebuilding
	// `WizardStepsState`, whose constructor unconditionally resets `currentStep = steps[0]` —
	// silently jumping the open modal back to the DESTINATION step and replaying
	// `WizardTransition`'s `fly`. That's the visible flicker / "saltare" on form + review.
	//
	// Funnelling `$pageNft` through a primitive boolean intermediate inverts that gate: when the
	// underlying reference changes but `nonNullish(...)` stays `true`, this `$derived`
	// recomputes to `true`, `safe_not_equal(true, true)` is `false`, and the change is NOT
	// propagated to subscribers. `steps` is not re-derived, the `steps` array reference stays
	// stable, `WizardStepsState` is not rebuilt, and `currentStep` is preserved across ticks.
	//
	// Pinned by the "steps derivation reactivity" describe block in `SendModal.spec.ts`.
	let hasPageNft = $derived(nonNullish($pageNft));

	let steps = $derived(
		isTransactionsPage
			? sendWizardStepsWithQrCodeScan({ i18n: $i18n, minting: $isIcMintingAccount, burning })
			: isNftsPage
				? hasPageNft
					? sendNftsWizardStepsWithQrCodeScan({ i18n: $i18n })
					: allSendNftsWizardSteps({ i18n: $i18n })
				: allSendWizardSteps({ i18n: $i18n, minting: $isIcMintingAccount, burning })
	);

	let currentStep = $state<WizardStep<WizardStepsSend> | undefined>();
	let modal = $state<WizardModal<WizardStepsSend>>();
	let selectedNft = $state.raw<Nft | undefined>($pageNft);

	// `$pageNft` can be undefined during NFT store refreshes; do not clear a manual list selection.
	$effect(() => {
		const nft = $pageNft;

		if (nft !== undefined) {
			selectedNft = nft;
		}
	});

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: $enabledTokens,
			filterZeroBalance: true,
			// eslint-disable-next-line svelte/no-unused-svelte-ignore
			// svelte-ignore state_referenced_locally -- the modal-tokens-list context is initialized once at mount; the reactive `lockedNetwork` (a $derived) is consumed downstream by `SendTokensList`'s view-only lock.
			filterNetwork: lockedNetwork ?? $selectedNetwork
		})
	);

	setContext<boolean>(SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY, nonNullish(initialModalData));

	const reset = () => {
		destination = '';
		activeSendDestinationTab = 'recentlyUsed';
		selectedContact = undefined;
		amount = undefined;

		sendProgressStep = ProgressStepsSend.INITIALIZATION;

		currentStep = undefined;
		selectedNft = undefined;
	};

	const close = () => {
		// Sending the last NFT from a collection's detail page would leave the user on a URL whose
		// NFT has been wiped from the store at the next poll, so steer them to a still-renderable page.
		// Gate on `$routeNft` rather than the `isNftsPage` prop alone so the redirect is anchored to
		// the actual NFT detail URL — a future caller flipping the prop on a list page wouldn't drop
		// query params like the selected network.
		const redirectUrl = getNftSendCloseRedirectUrl({
			isNftsPage,
			routeNft: $routeNft,
			sendProgressStep,
			selectedNft,
			collectionNfts: $pageCollectionNfts
		});

		if (nonNullish(redirectUrl)) {
			// `InProgressWizard` arms a `beforeNavigate` guard via `dirtyWizardState`; the send is
			// already done at this point, so clear it to avoid a "navigate away?" confirm popup.
			dirtyWizardState.set(false);
			goto(redirectUrl);
		}

		closeModal(() => {
			reset();
		});
	};

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

		const skip = shouldSkipDestinationStep({ destination, token });

		// eslint-disable-next-line require-await
		const callback = async () => {
			goToStep(skip ? WizardStepsSend.SEND : WizardStepsSend.DESTINATION);
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
					ercTokens: [...$enabledErc20Tokens, ...$enabledErc4626Tokens]
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

<TokenActionContext token={$token}>
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
					{lockedNetworkIds}
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
</TokenActionContext>
