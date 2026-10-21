<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { SUPPORTED_MAINNET_NETWORKS, SUPPORTED_NETWORKS } from '$env/networks/networks.env';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import NetworkSwitcherList from '$lib/components/networks/NetworkSwitcherList.svelte';
	import NetworkSwitcherLogo from '$lib/components/networks/NetworkSwitcherLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import { NETWORKS_SWITCHER_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { BACKDROP_FADE_OUT_DURATION } from '$lib/constants/transition.constants';
	import { selectedNetwork, networkId } from '$lib/derived/network.derived';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
	import {
		PLAUSIBLE_EVENTS,
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENT_RESULT_STATUSES
	} from '$lib/enums/plausible';
	import { SettingsModalType } from '$lib/enums/settings-modal-types';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionNetworkId } from '$lib/types/network';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { gotoReplaceRoot, isRouteTransactions, switchNetwork } from '$lib/utils/nav.utils';
	import { waitForMilliseconds } from '$lib/utils/timeout.utils';

	interface Props {
		visible: boolean;
		disabled?: boolean;
	}

	let { visible = $bindable(false), disabled = false }: Props = $props();

	let dropdown = $state<Dropdown | undefined>();

	const trackNetworkFilterEvent = ({
		networkId,
		status
	}: {
		networkId: OptionNetworkId;
		status: string;
	}) => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.NETWORK_FILTER,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NETWORKS,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.NETWORK,
				event_value: isNullish(networkId) ? 'all' : (networkId.description ?? 'unknown'),
				result_status: status
			}
		});
	};

	// The check follows the route, which only changes once the navigation lands. Until then it
	// stays on the row that was clicked. Raw, so each click's selection keeps its identity.
	let pendingSelection = $state.raw<{ networkId: OptionNetworkId } | undefined>();

	let checkedNetworkId = $derived(
		nonNullish(pendingSelection) ? (pendingSelection.networkId ?? undefined) : $networkId
	);

	const onNetworkSelect = async (networkId: OptionNetworkId) => {
		const selection = { networkId };

		pendingSelection = selection;

		// A panel that is leaving no longer updates, so the check moves before it closes.
		await tick();

		dropdown?.close();

		// The route change runs a view transition, which holds the page still while the new state
		// renders: a panel still leaving would stop mid-fade. So the route changes once it has gone.
		await waitForMilliseconds(BACKDROP_FADE_OUT_DURATION);

		try {
			await switchNetwork({ networkId });

			if (isRouteTransactions(page)) {
				await gotoReplaceRoot();
			}

			trackNetworkFilterEvent({
				networkId,
				status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});
		} catch (_: unknown) {
			trackNetworkFilterEvent({
				networkId,
				status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR
			});
		}

		// A network picked while this navigation was pending owns the check now.
		if (pendingSelection === selection) {
			pendingSelection = undefined;
		}
	};

	let enabledNetworks = $derived(
		$networksMainnets.length +
			($testnetsEnabled && $networksTestnets.length > 0 ? $networksTestnets.length : 0)
	);

	let totalNetworks = $derived(
		$testnetsEnabled && $networksTestnets.length > 0
			? SUPPORTED_NETWORKS.length
			: SUPPORTED_MAINNET_NETWORKS.length
	);

	const modalId = Symbol();
</script>

<Dropdown
	bind:this={dropdown}
	ariaDescription={$i18n.networks.title}
	asModalOnMobile
	{disabled}
	testId={NETWORKS_SWITCHER_DROPDOWN}
	bind:visible
>
	<!-- The name follows as text, so the logo's alt would only repeat it. -->
	<span aria-hidden="true">
		<NetworkSwitcherLogo network={$selectedNetwork} />
	</span>

	<!-- sr-only, not hidden: below xl the logo alone shows, and the name still has to name the button. -->
	<span class="max-xl:sr-only">{$selectedNetwork?.name ?? $i18n.networks.chain_fusion}</span>

	{#snippet title()}
		{$i18n.networks.filter}
	{/snippet}

	{#snippet items()}
		<div class="menu-surface">
			<div class="menu-divider">
				<NetworkSwitcherList onSelected={onNetworkSelect} selectedNetworkId={checkedNetworkId} />
			</div>

			<Button
				contentFullWidth
				fullWidth
				innerStyleClass="flex-wrap justify-between"
				link
				onclick={() => {
					dropdown?.close();
					modalStore.openSettings({ id: modalId, data: SettingsModalType.ENABLED_NETWORKS });
				}}
				static
				styleClass="menu-row row-feedback"
			>
				<span class="flex items-center gap-3 font-bold">
					<IconManage size="20" />{$i18n.networks.manage}
				</span>
				{#if enabledNetworks < totalNetworks}
					<span class="ml-auto text-right font-normal text-nowrap text-primary">
						{replacePlaceholders($i18n.networks.number_of_enabled, {
							$numNetworksEnabled: `${enabledNetworks}`,
							$numNetworksTotal: `${totalNetworks}`
						})}
					</span>
				{/if}
			</Button>
		</div>
	{/snippet}
</Dropdown>
