<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkSwitcherList from '$lib/components/networks/NetworkSwitcherList.svelte';
	import NetworkSwitcherLogo from '$lib/components/networks/NetworkSwitcherLogo.svelte';
	import FilterChip from '$lib/components/ui/FilterChip.svelte';
	import { NETWORK_FILTER } from '$lib/constants/test-ids.constants';
	import { networks as allNetworks } from '$lib/derived/networks.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network, OptionNetworkId } from '$lib/types/network';

	interface Props {
		selectedNetwork?: Network;
		// The networks to offer; every mainnet when absent.
		networks?: Network[];
		// Shows the network without offering to change it, and nothing at all for all networks.
		locked?: boolean;
		showStakeBalance?: boolean;
		onSelect: (network: Network | undefined) => void;
	}

	let {
		selectedNetwork,
		networks,
		locked = false,
		showStakeBalance = true,
		onSelect
	}: Props = $props();

	let visible = $state(false);

	const select = (networkId: OptionNetworkId) => {
		onSelect($allNetworks.find(({ id }) => id === networkId));

		visible = false;
	};
</script>

{#snippet logo()}
	<NetworkSwitcherLogo network={selectedNetwork} />
{/snippet}

{#if locked}
	<!-- A label, not a control, so it does not read as a disabled button. -->
	{#if nonNullish(selectedNetwork)}
		<span
			class="inline-flex h-8 min-w-0 items-center gap-1.5 text-sm font-medium text-secondary"
			data-tid={NETWORK_FILTER}
		>
			<span class="flex shrink-0" aria-hidden="true">{@render logo()}</span>
			<span class="truncate">{selectedNetwork.name}</span>
		</span>
	{/if}
{:else}
	<FilterChip
		clearAriaLabel={$i18n.tokens.text.clear_network_filter}
		hasValue={nonNullish(selectedNetwork)}
		icon={logo}
		label={selectedNetwork?.name ?? $i18n.networks.chain_fusion}
		onClear={() => onSelect(undefined)}
		panelLabel={$i18n.networks.filter}
		testId={NETWORK_FILTER}
		bind:visible
	>
		<NetworkSwitcherList
			onSelected={select}
			selectedNetworkId={selectedNetwork?.id}
			{showStakeBalance}
			showTestnets={false}
			supportedNetworks={networks}
		/>
	</FilterChip>
{/if}
