<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import AllNetworksLogo from '$lib/components/networks/AllNetworksLogo.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LabelSize } from '$lib/types/components';
	import type { Network, NetworkId, OptionNetworkId } from '$lib/types/network';
	import { formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		selectedNetworkId?: NetworkId;
		network?: Network;
		usdBalance?: number;
		isTestnet?: boolean;
		testId?: string;
		delayOnNetworkSelect?: boolean;
		labelsSize?: LabelSize;
		onSelected?: (networkId: OptionNetworkId) => void;
	}

	let {
		selectedNetworkId,
		network,
		usdBalance,
		isTestnet = false,
		testId,
		delayOnNetworkSelect = true,
		labelsSize = 'md',
		onSelected
	}: Props = $props();

	const onClick = () => {
		// If rendered in the dropdown, we add a small delay to give the user a visual feedback that the network is checked
		delayOnNetworkSelect
			? setTimeout(() => onSelected?.(network?.id), 500)
			: onSelected?.(network?.id);
	};
</script>

<!--
TODO: Find a way to have the "All networks" not be a fallback for undefined network, and without basically duplicating this component
-->
<LogoButton dividers {onClick} selectable selected={network?.id === selectedNetworkId} {testId}>
	{#snippet logo()}
		{#if nonNullish(network)}
			<NetworkLogo {network} />
		{:else}
			<AllNetworksLogo />
		{/if}
	{/snippet}

	{#snippet title()}
		<span
			class="mr-2 font-normal md:text-base"
			class:md:text-base={labelsSize === 'md'}
			class:md:text-lg={labelsSize === 'lg'}
			class:text-base={labelsSize === 'lg'}
			class:text-sm={labelsSize === 'md'}
		>
			{network?.name ?? $i18n.networks.chain_fusion}
		</span>
	{/snippet}

	{#snippet descriptionEnd()}
		<span>
			<span class:md:text-base={labelsSize === 'lg'} class:text-sm={labelsSize === 'lg'}>
				{#if nonNullish(usdBalance)}
					{#if $isPrivacyMode}
						<IconDots variant="xs" />
					{:else}
						{formatCurrency({
							value: usdBalance,
							currency: $currentCurrency,
							exchangeRate: $currencyExchangeStore,
							language: $currentLanguage
						})}
					{/if}
				{/if}
			</span>
			{#if isTestnet}
				<span class="inline-flex">
					<Badge styleClass="pt-0 pb-0">{$i18n.networks.testnet}</Badge>
				</span>
			{/if}
		</span>
	{/snippet}
</LogoButton>
