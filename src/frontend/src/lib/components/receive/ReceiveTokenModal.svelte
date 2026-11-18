<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, tick, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { loadCkBtcDepositAddress } from '$icp/services/ckbtc.services';
	import { btcAddressStore } from '$icp/stores/btc.store';
	import { isIcCkToken } from '$icp/validation/ic-token.validation';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import AddTokenByNetwork from '$lib/components/manage/AddTokenByNetwork.svelte';
	import AddTokenReviewByNetwork from '$lib/components/manage/AddTokenReviewByNetwork.svelte';
	import ReceiveRouteAddress from '$lib/components/receive/ReceiveRouteAddress.svelte';
	import ReceiveRouteStep from '$lib/components/receive/ReceiveRouteStep.svelte';
	import ReceiveTokenStep from '$lib/components/receive/ReceiveTokenStep.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import { RECEIVE_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { allFungibleTokens } from '$lib/derived/all-tokens.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { receiveAddressSources } from '$lib/derived/receive.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { WizardStepsReceiveToken } from '$lib/enums/wizard-steps';
	import { retryReceiveAddress } from '$lib/services/receive.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsShow } from '$lib/stores/toasts.store';
	import type { ExchangesData } from '$lib/types/exchange';
	import type { Network, NetworkId } from '$lib/types/network';
	import type {
		ReceiveAddressState,
		ReceiveAsset,
		ReceiveIcpAddressFormat,
		ReceiveRoute
	} from '$lib/types/receive';
	import type { Token } from '$lib/types/token';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { getTokenIdentifier } from '$lib/utils/identifier.utils';
	import { closeModal, getSymbol } from '$lib/utils/modal.utils';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import {
		findReceiveAssetByToken,
		getAutoReceiveRoute,
		getReceiveAddressKind,
		getReceiveAssets,
		getReceiveConvertTwinToken,
		getReceiveRoutes,
		getReceiveTokenKey,
		isReceiveTokenEnabled,
		resolveReceiveAddress
	} from '$lib/utils/receive.utils';
	import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
	import { mapTokenUi } from '$lib/utils/token.utils';
	import { saveAllCustomTokens, sortTokens } from '$lib/utils/tokens.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		// Preselected from a token page: the token, or the asset its versions form.
		initialToken?: Token;
		// The network of the page Receive was opened from: its tokens and routes come first.
		preferredNetworkId?: NetworkId;
		// Runs after the modal closed: never close another modal from here, Receive may have opened one.
		onClose?: () => void;
	}

	let { initialToken, preferredNetworkId, onClose }: Props = $props();

	const steps: WizardSteps<WizardStepsReceiveToken> = [
		{ name: WizardStepsReceiveToken.TOKEN, title: $i18n.receive.token.text.select_token },
		{ name: WizardStepsReceiveToken.ROUTE, title: $i18n.receive.token.text.select_network },
		{ name: WizardStepsReceiveToken.ADDRESS, title: $i18n.receive.text.receive },
		{ name: WizardStepsReceiveToken.IMPORT, title: $i18n.tokens.import.text.title },
		{ name: WizardStepsReceiveToken.IMPORT_REVIEW, title: $i18n.tokens.import.text.review },
		{ name: WizardStepsReceiveToken.IMPORT_SAVING, title: $i18n.tokens.import.text.updating }
	];

	let modal = $state<WizardModal<WizardStepsReceiveToken>>();
	let currentStep = $state<WizardStep<WizardStepsReceiveToken> | undefined>();

	const goToStep = (stepName: WizardStepsReceiveToken) => {
		if (nonNullish(modal)) {
			goToWizardStep({ modal, steps, stepName });
		}
	};

	// Sorted once on open, by the balances and prices known then, so the list does not reorder
	// under the pointer when a price updates.
	let exchangesSnapshot = $state<ExchangesData | undefined>();

	onMount(() => {
		exchangesSnapshot = { ...($exchanges ?? {}) };
	});

	let enabledNetworkIds = $derived($networks.map(({ id }) => id));

	// The fungible catalog on the enabled networks, for every token Receive has an address for.
	let catalog = $derived(
		$allFungibleTokens.filter(
			(token) =>
				enabledNetworkIds.includes(token.network.id) && nonNullish(getReceiveAddressKind(token))
		)
	);

	let sortedCatalog = $derived.by(() => {
		const snapshot = exchangesSnapshot;

		if (isNullish(snapshot)) {
			return catalog;
		}

		return sortTokens({
			$tokens: catalog.map((token) =>
				mapTokenUi({
					token,
					$balances: $balancesStore,
					$stakeBalances,
					$exchanges: snapshot
				})
			),
			$tokensToPin,
			$networksToPin: $networks
		});
	});

	let assets = $derived(getReceiveAssets({ tokens: sortedCatalog, preferredNetworkId }));

	let filter = $state('');
	let assetKey = $state<string | undefined>();
	let routeKey = $state<string | undefined>();
	// Whether the person saw the token picker, and whether the route was picked for them.
	let tokenStepVisited = $state(false);
	let autoRoute = $state(false);

	let icpFormat = $state<ReceiveIcpAddressFormat>('principal');

	let asset = $derived(assets.find(({ key }) => key === assetKey));

	const routesOf = (target: ReceiveAsset): ReceiveRoute[] =>
		getReceiveRoutes({ tokens: target.tokens, enabledNetworkIds, preferredNetworkId });

	let routes = $derived(nonNullish(asset) ? routesOf(asset) : []);

	// Resolved from the current catalog, so a token whose `TokenId` changed on enabling keeps its route.
	let route = $derived(routes.find(({ key }) => key === routeKey));

	let tokenEnabled = $derived(nonNullish(route) && isReceiveTokenEnabled(route.creditedToken));

	const LOADING: ReceiveAddressState = { status: 'loading' };

	let addressState = $derived(
		nonNullish(route) && tokenEnabled
			? resolveReceiveAddress({ route, icpFormat, sources: $receiveAddressSources })
			: LOADING
	);

	let convertTwinToken = $derived(
		route?.kind === 'direct'
			? getReceiveConvertTwinToken({ token: route.creditedToken, enabledNetworkIds })
			: undefined
	);

	const selectAsset = ({
		asset: selected,
		fromTokenStep
	}: {
		asset: ReceiveAsset;
		fromTokenStep: boolean;
	}) => {
		assetKey = selected.key;
		routeKey = undefined;
		icpFormat = 'principal';
		tokenStepVisited = fromTokenStep;

		const auto = getAutoReceiveRoute(routesOf(selected));

		autoRoute = nonNullish(auto);

		if (nonNullish(auto)) {
			routeKey = auto.key;
			goToStep(WizardStepsReceiveToken.ADDRESS);
			return;
		}

		goToStep(WizardStepsReceiveToken.ROUTE);
	};

	const selectRoute = (selected: ReceiveRoute) => {
		routeKey = selected.key;
		icpFormat = 'principal';
		goToStep(WizardStepsReceiveToken.ADDRESS);
	};

	const changeToken = () => {
		routeKey = undefined;
		goToStep(WizardStepsReceiveToken.TOKEN);
	};

	const back = () => {
		routeKey = undefined;
		goToStep(autoRoute ? WizardStepsReceiveToken.TOKEN : WizardStepsReceiveToken.ROUTE);
	};

	// Opened from a token page: straight to its routes, or to its address when there is one direct one.
	// Nothing shows until then, so the token picker does not flash first.
	let initialized = false;
	// svelte-ignore state_referenced_locally
	let ready = $state(isNullish(initialToken));

	$effect(() => {
		if (initialized || isNullish(modal) || isNullish(initialToken)) {
			return;
		}

		initialized = true;

		untrack(() => {
			const initialAsset = findReceiveAssetByToken({ assets, token: initialToken });

			if (nonNullish(initialAsset)) {
				selectAsset({ asset: initialAsset, fromTokenStep: false });
			}

			ready = true;
		});
	});

	// A choice that stops being available (its token or network disabled, or removed) is never kept
	// on screen: the person chooses again.
	$effect(() => {
		const step = currentStep?.name;

		if (step !== WizardStepsReceiveToken.ROUTE && step !== WizardStepsReceiveToken.ADDRESS) {
			return;
		}

		const assetGone = nonNullish(assetKey) && isNullish(asset);
		const routeGone =
			step === WizardStepsReceiveToken.ADDRESS && nonNullish(routeKey) && isNullish(route);

		if (!assetGone && !routeGone) {
			return;
		}

		untrack(() => {
			routeKey = undefined;

			toastsShow({ text: $i18n.receive.token.text.route_unavailable, level: 'info' });

			if (assetGone || routes.length === 0) {
				assetKey = undefined;
				goToStep(WizardStepsReceiveToken.TOKEN);
				return;
			}

			autoRoute = false;
			goToStep(WizardStepsReceiveToken.ROUTE);
		});
	});

	// The minter's deposit address is loaded when its route is shown, once per token and opening.
	let requestedDeposits: string[] = [];

	$effect(() => {
		if (route?.kind !== 'ckbtc-deposit' || !tokenEnabled) {
			return;
		}

		const { creditedToken } = route;
		const key = getReceiveTokenKey(creditedToken);

		if (
			requestedDeposits.includes(key) ||
			nonNullish($btcAddressStore?.[creditedToken.id]) ||
			!isIcCkToken(creditedToken)
		) {
			return;
		}

		requestedDeposits = [...requestedDeposits, key];

		untrack(() => loadCkBtcDepositAddress({ ...creditedToken, identity: $authIdentity }));
	});

	let retrying = $state(false);

	const retryAddress = async () => {
		if (isNullish(route)) {
			return;
		}

		retrying = true;

		try {
			await retryReceiveAddress({ route, identity: $authIdentity });
		} finally {
			retrying = false;
		}
	};

	let enabling = $state(false);
	let enableFailed = $state(false);

	// Only the selected version is enabled. The route is kept by identity, so it resolves to the token
	// the reload brings in, even under a new `TokenId`.
	const enableToken = async () => {
		const creditedToken = route?.creditedToken;

		if (isNullish(creditedToken) || !isTokenToggleable(creditedToken)) {
			return;
		}

		enabling = true;
		enableFailed = false;

		const enabledToken = { ...creditedToken, enabled: true };

		try {
			await saveAllCustomTokens({
				tokens: [enabledToken],
				onError: () => (enableFailed = true),
				$authIdentity,
				$i18n
			});
		} finally {
			enabling = false;
		}
	};

	const close = () => closeModal(() => onClose?.());

	const viewActivity = async () => {
		if (isNullish(route)) {
			return;
		}

		const { creditedToken } = route;

		close();

		await goto(transactionsUrl({ token: creditedToken }));
	};

	// The conversion instructions read the ck token from the page, so they open on its page.
	const howToConvert = async () => {
		if (isNullish(route) || isNullish(convertTwinToken)) {
			return;
		}

		const data = { sourceToken: convertTwinToken, destinationToken: route.creditedToken };

		close();

		await goto(transactionsUrl({ token: route.creditedToken }));

		modalStore.openHowToConvertToTwinTokenEth({ id: getSymbol('receive-how-to-convert'), data });
	};

	// Import from an empty search.
	let importNetwork = $state<Network | undefined>();
	let importTokenData = $state<Partial<AddTokenData>>({});
	let importProgressStep = $state<ProgressStepsAddToken>(ProgressStepsAddToken.INITIALIZATION);
	let pendingImport = $state<{ networkId: NetworkId; identifier: string } | undefined>();

	const startImport = () => {
		importNetwork = $networks.find(({ id }) => id === preferredNetworkId);
		importTokenData = {};
		goToStep(WizardStepsReceiveToken.IMPORT);
	};

	const cancelImport = () => goToStep(WizardStepsReceiveToken.TOKEN);

	const importedIdentifier = (): string | undefined =>
		importTokenData.ledgerCanisterId ??
		importTokenData.ethContractAddress ??
		importTokenData.splTokenAddress;

	const onImportSuccess = () => {
		const identifier = importedIdentifier();

		if (isNullish(importNetwork) || isNullish(identifier)) {
			goToStep(WizardStepsReceiveToken.TOKEN);
			return;
		}

		pendingImport = { networkId: importNetwork.id, identifier };
	};

	// Selects the imported token once the refreshed catalog lists it.
	$effect(() => {
		if (isNullish(pendingImport)) {
			return;
		}

		const { networkId, identifier } = pendingImport;

		const imported = catalog.find(
			(token) =>
				token.network.id === networkId &&
				getTokenIdentifier(token)?.toLowerCase() === identifier.toLowerCase()
		);

		if (isNullish(imported)) {
			return;
		}

		untrack(() => {
			pendingImport = undefined;

			const importedAsset = findReceiveAssetByToken({ assets, token: imported });

			if (isNullish(importedAsset)) {
				goToStep(WizardStepsReceiveToken.TOKEN);
				return;
			}

			selectAsset({ asset: importedAsset, fromTokenStep: true });
		});
	});

	// Focus follows the step: its first control, so keyboard and screen-reader users land in it. The
	// first step keeps the modal's own focus, so a phone does not open its keyboard on the search.
	let content = $state<HTMLDivElement | undefined>();
	let focusedStep: WizardStepsReceiveToken | undefined;

	$effect(() => {
		const step = currentStep?.name;

		if (isNullish(step) || isNullish(content) || !ready) {
			return;
		}

		const firstStep = isNullish(focusedStep);
		focusedStep = step;

		if (firstStep) {
			return;
		}

		const container = content;

		tick().then(() =>
			container
				.querySelector<HTMLElement>('input, button:not([disabled]), [tabindex="-1"]')
				?.focus({ preventScroll: true })
		);
	});
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsReceiveToken.IMPORT_SAVING}
	onClose={close}
	{steps}
	testId={RECEIVE_TOKENS_MODAL}
	bind:currentStep
>
	{#snippet title()}
		{currentStep?.title ?? $i18n.receive.text.receive}
	{/snippet}

	<div bind:this={content}>
		{#key currentStep?.name}
			{#if !ready}
				<!-- Resolving the token the page preselects. -->
			{:else if currentStep?.name === WizardStepsReceiveToken.ROUTE && nonNullish(asset)}
				<ReceiveRouteStep
					onChangeToken={changeToken}
					onSelect={selectRoute}
					{routes}
					selectedKey={routeKey}
					token={asset.token}
					{tokenStepVisited}
				/>
			{:else if currentStep?.name === WizardStepsReceiveToken.ADDRESS && nonNullish(route)}
				{#key route.key}
					<ReceiveRouteAddress
						{addressState}
						backToPreviousStep={!autoRoute || tokenStepVisited}
						{convertTwinToken}
						{enableFailed}
						{enabling}
						onBack={back}
						onChangeToken={changeToken}
						onDone={close}
						onEnable={enableToken}
						onHowToConvert={howToConvert}
						onRetryAddress={retryAddress}
						onViewActivity={viewActivity}
						{retrying}
						{route}
						{tokenEnabled}
						bind:icpFormat
					/>
				{/key}
			{:else if currentStep?.name === WizardStepsReceiveToken.IMPORT}
				<AddTokenByNetwork
					onBack={cancelImport}
					onNext={() => goToStep(WizardStepsReceiveToken.IMPORT_REVIEW)}
					bind:network={importNetwork}
					bind:tokenData={importTokenData}
				/>
			{:else if currentStep?.name === WizardStepsReceiveToken.IMPORT_REVIEW}
				<AddTokenReviewByNetwork
					fungibleOnly
					modalNext={() => goToStep(WizardStepsReceiveToken.IMPORT_SAVING)}
					network={importNetwork}
					onBack={() => goToStep(WizardStepsReceiveToken.IMPORT)}
					onError={cancelImport}
					onSuccess={onImportSuccess}
					progress={(step) => (importProgressStep = step)}
					tokenData={importTokenData}
				/>
			{:else if currentStep?.name === WizardStepsReceiveToken.IMPORT_SAVING}
				<InProgressWizard
					progressStep={importProgressStep}
					steps={addTokenSteps($i18n)}
					warningType="manage"
				/>
			{:else}
				<ReceiveTokenStep
					{assets}
					onClose={close}
					onImport={startImport}
					onSelect={(selected) => selectAsset({ asset: selected, fromTokenStep: true })}
					selectedKey={assetKey}
					bind:filter
				/>
			{/if}
		{/key}
	</div>
</WizardModal>
