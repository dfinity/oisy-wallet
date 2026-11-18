<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, tick, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { loadCkBtcDepositAddress } from '$icp/services/ckbtc.services';
	import { btcAddressStore } from '$icp/stores/btc.store';
	import { isIcCkToken } from '$icp/validation/ic-token.validation';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import { getAddTokenDataIdentifier } from '$icp-eth/utils/add-token.utils';
	import AddTokenWizardSteps, {
		type AddTokenWizardStep
	} from '$lib/components/manage/AddTokenWizardSteps.svelte';
	import ReceiveRouteAddress from '$lib/components/receive/ReceiveRouteAddress.svelte';
	import ReceiveRouteStep from '$lib/components/receive/ReceiveRouteStep.svelte';
	import ReceiveTokenStep from '$lib/components/receive/ReceiveTokenStep.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { RECEIVE_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { allFungibleTokens } from '$lib/derived/all-tokens.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { WizardStepsReceiveToken } from '$lib/enums/wizard-steps';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsShow } from '$lib/stores/toasts.store';
	import type { ExchangesData } from '$lib/types/exchange';
	import type { Network, NetworkId } from '$lib/types/network';
	import type { ReceiveAsset, ReceiveRoute } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenIdentifier } from '$lib/utils/identifier.utils';
	import { closeModal, getSymbol } from '$lib/utils/modal.utils';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import {
		findReceiveAssetByToken,
		getAutoReceiveRoute,
		getReceiveAddressKind,
		getReceiveAddressTitle,
		getReceiveAssets,
		getReceiveRoutes,
		getReceiveTokenKey,
		isReceiveConversionOffer
	} from '$lib/utils/receive.utils';
	import { isTokenEnabled } from '$lib/utils/token-toggleable.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { toSortedTokensUi } from '$lib/utils/tokens.utils';
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

	// Whether a step followed the first one: the token list then takes focus itself. As the first step
	// it leaves focus on the modal, so a phone does not open its keyboard on the search.
	let navigated = $state(false);

	const goToStep = (stepName: WizardStepsReceiveToken) => {
		if (nonNullish(modal)) {
			navigated = true;
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

	let sortedCatalog = $derived(
		isNullish(exchangesSnapshot)
			? catalog
			: toSortedTokensUi({
					tokens: catalog,
					$balances: $balancesStore,
					$stakeBalances,
					$exchanges: exchangesSnapshot,
					$tokensToPin,
					$networksToPin: $networks
				})
	);

	let assets = $derived(getReceiveAssets({ tokens: sortedCatalog, preferredNetworkId }));

	let filter = $state('');
	let assetKey = $state<string | undefined>();
	let routeKey = $state<string | undefined>();
	// The route left with Back or Change token: no address is kept for it, but the picker marks it
	// and focuses it, so Back then Enter returns to the same route.
	let previousRouteKey = $state<string | undefined>();
	// Whether the person saw the token picker, and whether the route was picked for them.
	let tokenStepVisited = $state(false);
	let autoRoute = $state(false);

	let asset = $derived(assets.find(({ key }) => key === assetKey));

	const routesOf = (target: ReceiveAsset): ReceiveRoute[] =>
		getReceiveRoutes({
			tokens: target.tokens,
			enabledNetworkIds,
			preferredNetworkId,
			catalog
		});

	let routes = $derived(nonNullish(asset) ? routesOf(asset) : []);

	// Resolved from the current catalog, so a token whose `TokenId` changed on enabling keeps its route.
	let route = $derived(routes.find(({ key }) => key === routeKey));

	let tokenEnabled = $derived(nonNullish(route) && isTokenEnabled(route.creditedToken));

	// Choosing between BTC and BTC credited as ckBTC is not a choice of network: the title names the
	// asset instead.
	let offerTitle = $derived(
		nonNullish(asset) &&
			routes.some((route) => isReceiveConversionOffer({ route, assetTokens: asset.tokens }))
			? replacePlaceholders($i18n.receive.token.text.receive_token, {
					$token: getTokenDisplaySymbol(asset.token)
				})
			: undefined
	);

	let modalTitle = $derived.by(() => {
		const step = currentStep?.name;

		if (step === WizardStepsReceiveToken.ADDRESS && nonNullish(route)) {
			return getReceiveAddressTitle({ route, i18n: $i18n });
		}

		if (step === WizardStepsReceiveToken.ROUTE && nonNullish(offerTitle)) {
			return offerTitle;
		}

		return currentStep?.title ?? $i18n.receive.text.receive;
	});

	const selectAsset = ({
		asset: selected,
		fromTokenStep
	}: {
		asset: ReceiveAsset;
		fromTokenStep: boolean;
	}) => {
		previousRouteKey = selected.key === assetKey ? previousRouteKey : undefined;
		assetKey = selected.key;
		routeKey = undefined;
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
		goToStep(WizardStepsReceiveToken.ADDRESS);
	};

	const changeToken = () => {
		previousRouteKey = routeKey;
		routeKey = undefined;
		goToStep(WizardStepsReceiveToken.TOKEN);
	};

	const back = () => {
		previousRouteKey = routeKey;
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
	const howToConvert = async (twinToken: Token) => {
		if (isNullish(route)) {
			return;
		}

		const data = { sourceToken: twinToken, destinationToken: route.creditedToken };

		close();

		await goto(transactionsUrl({ token: route.creditedToken }));

		modalStore.openHowToConvertToTwinTokenEth({ id: getSymbol('receive-how-to-convert'), data });
	};

	// Import from an empty search.
	let importNetwork = $state<Network | undefined>();
	let importTokenData = $state<Partial<AddTokenData>>({});
	let importProgressStep = $state<ProgressStepsAddToken>(ProgressStepsAddToken.INITIALIZATION);
	let pendingImport = $state<{ networkId: NetworkId; identifier: string } | undefined>();

	const IMPORT_STEPS: Partial<Record<WizardStepsReceiveToken, AddTokenWizardStep>> = {
		[WizardStepsReceiveToken.IMPORT]: 'import',
		[WizardStepsReceiveToken.IMPORT_REVIEW]: 'review',
		[WizardStepsReceiveToken.IMPORT_SAVING]: 'saving'
	};

	let importStep = $derived(nonNullish(currentStep) ? IMPORT_STEPS[currentStep.name] : undefined);

	const startImport = () => {
		importNetwork = $networks.find(({ id }) => id === preferredNetworkId);
		importTokenData = {};
		goToStep(WizardStepsReceiveToken.IMPORT);
	};

	const cancelImport = () => goToStep(WizardStepsReceiveToken.TOKEN);

	const onImportSuccess = () => {
		const identifier = getAddTokenDataIdentifier(importTokenData);

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

	// The steps of Receive place focus themselves. The shared import steps do not, so focus goes to
	// their first control.
	let content = $state<HTMLDivElement | undefined>();

	$effect(() => {
		if (isNullish(importStep) || isNullish(content)) {
			return;
		}

		const container = content;

		tick().then(() =>
			container.querySelector<HTMLElement>('input, button:not([disabled])')?.focus({
				preventScroll: true
			})
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
		<!-- The modal truncates its title to one line; this one wraps, since the network is its point. -->
		<span class="line-clamp-2 block whitespace-normal">{modalTitle}</span>
	{/snippet}

	<div bind:this={content}>
		{#key currentStep?.name}
			{#if !ready}
				<!-- Resolving the token the page preselects. -->
			{:else if currentStep?.name === WizardStepsReceiveToken.ROUTE && nonNullish(asset)}
				<ReceiveRouteStep
					assetTokens={asset.tokens}
					onChangeToken={changeToken}
					onSelect={selectRoute}
					{routes}
					selectedKey={routeKey ?? previousRouteKey}
					token={asset.token}
					{tokenStepVisited}
				/>
			{:else if currentStep?.name === WizardStepsReceiveToken.ADDRESS && nonNullish(route)}
				{#key route.key}
					<ReceiveRouteAddress
						backToPreviousStep={!autoRoute || tokenStepVisited}
						onBack={back}
						onChangeToken={changeToken}
						onDone={close}
						onHowToConvert={howToConvert}
						onViewActivity={viewActivity}
						{route}
					/>
				{/key}
			{:else if nonNullish(importStep)}
				<AddTokenWizardSteps
					fungibleOnly
					onBack={cancelImport}
					onBackToImport={() => goToStep(WizardStepsReceiveToken.IMPORT)}
					onError={cancelImport}
					onReview={() => goToStep(WizardStepsReceiveToken.IMPORT_REVIEW)}
					onSaving={() => goToStep(WizardStepsReceiveToken.IMPORT_SAVING)}
					onSuccess={onImportSuccess}
					step={importStep}
					bind:network={importNetwork}
					bind:progressStep={importProgressStep}
					bind:tokenData={importTokenData}
				/>
			{:else}
				<ReceiveTokenStep
					{assets}
					autofocus={navigated}
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
