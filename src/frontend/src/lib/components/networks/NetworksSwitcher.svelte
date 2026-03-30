<script lang="ts">
	import { page } from '$app/state';
	import { SUPPORTED_MAINNET_NETWORKS, SUPPORTED_NETWORKS } from '$env/networks/networks.env';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import NetworkSwitcherList from '$lib/components/networks/NetworkSwitcherList.svelte';
	import NetworkSwitcherLogo from '$lib/components/networks/NetworkSwitcherLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import { NETWORKS_SWITCHER_DROPDOWN } from '$lib/constants/test-ids.constants';
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
	import { isNullish } from '@dfinity/utils';

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

	const onNetworkSelect = async (networkId: OptionNetworkId) => {
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

		dropdown?.close();
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
	ariaLabel={$i18n.networks.title}
	asModalOnMobile
	{disabled}
	testId={NETWORKS_SWITCHER_DROPDOWN}
	bind:visible
>
	<NetworkSwitcherLogo network={$selectedNetwork} />

	<span class="hidden md:block">{$selectedNetwork?.name ?? $i18n.networks.chain_fusion}</span>

	{#snippet title()}
		{$i18n.networks.filter}
	{/snippet}

	{#snippet items()}
		<NetworkSwitcherList onSelected={onNetworkSelect} selectedNetworkId={$networkId} />

		<div class="mt-6 mb-3 ml-2 flex flex-row justify-between text-nowrap">
			<span class="flex">
				<Button
					link
					onclick={() => {
						dropdown?.close();
						modalStore.openSettings({ id: modalId, data: SettingsModalType.ENABLED_NETWORKS });
					}}><IconManage />{$i18n.networks.manage}</Button
				>
			</span>
			{#if enabledNetworks < totalNetworks}
				<span class="mr-2 ml-4 flex text-right text-base text-nowrap">
					{replacePlaceholders($i18n.networks.number_of_enabled, {
						$numNetworksEnabled: `${enabledNetworks}`,
						$numNetworksTotal: `${totalNetworks}`
					})}
				</span>
			{/if}
		</div>
	{/snippet}
</Dropdown>
