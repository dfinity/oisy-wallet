<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import AllNetworksLogo from '$lib/components/networks/AllNetworksLogo.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LabelSize } from '$lib/types/components';
	import type { Network, NetworkId } from '$lib/types/network';
	import { formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		selectedNetworkId?: NetworkId;
		network?: Network;
		usdBalance?: number;
		isTestnet?: boolean;
		testId?: string;
		delayOnNetworkSelect?: boolean;
		labelsSize?: LabelSize;
	}

	let {
		selectedNetworkId,
		network,
		usdBalance,
		isTestnet = false,
		testId,
		delayOnNetworkSelect = true,
		labelsSize = 'md'
	}: Props = $props();

	const dispatch = createEventDispatcher();

	const onIcSelected = () => dispatch('icSelected', network?.id);

	const onClick = () => {
		// If rendered in the dropdown, we add a small delay to give the user a visual feedback that the network is checked
		delayOnNetworkSelect ? setTimeout(onIcSelected, 500) : onIcSelected();
	};
</script>

<!--
TODO: Find a way to have the "All networks" not be a fallback for undefined network, and without basically duplicating this component
-->
<LogoButton {testId} {onClick} selectable selected={network?.id === selectedNetworkId} dividers>
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
			class:text-sm={labelsSize === 'md'}
			class:md:text-base={labelsSize === 'md'}
			class:text-base={labelsSize === 'lg'}
			class:md:text-lg={labelsSize === 'lg'}
		>
			{network?.name ?? $i18n.networks.chain_fusion}
		</span>
	{/snippet}

	{#snippet descriptionEnd()}
		<span>
			<span class:text-sm={labelsSize === 'lg'} class:md:text-base={labelsSize === 'lg'}>
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
