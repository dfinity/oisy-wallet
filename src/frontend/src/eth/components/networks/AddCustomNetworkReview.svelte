<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { CustomEvmNetworkInput } from '$eth/stores/custom-evm-networks.store';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { ADD_CUSTOM_NETWORK_CONFIRM_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		input: CustomEvmNetworkInput;
		saving: boolean;
		onBack: () => void;
		onConfirm: () => void;
	}

	let { input, saving, onBack, onConfirm }: Props = $props();
</script>

<ContentWithToolbar>
	<p class="mb-4 text-sm text-tertiary">{$i18n.custom_networks.text.review_intro}</p>

	<Value element="div" ref="customNetworkName">
		{#snippet label()}{$i18n.custom_networks.field.name}{/snippet}
		{#snippet content()}{input.name}{/snippet}
	</Value>

	<Value element="div" ref="customNetworkChainId">
		{#snippet label()}{$i18n.custom_networks.field.chain_id}{/snippet}
		{#snippet content()}{input.chainId.toString()}{/snippet}
	</Value>

	<Value element="div" ref="customNetworkRpcUrl">
		{#snippet label()}{$i18n.custom_networks.field.rpc_url}{/snippet}
		{#snippet content()}{input.rpcUrl}{/snippet}
	</Value>

	<Value element="div" ref="customNetworkCurrencySymbol">
		{#snippet label()}{$i18n.custom_networks.field.currency_symbol}{/snippet}
		{#snippet content()}{input.currencySymbol}{/snippet}
	</Value>

	<Value element="div" ref="customNetworkExplorerUrl">
		{#snippet label()}{$i18n.custom_networks.field.explorer_url}{/snippet}
		{#snippet content()}{input.explorerUrl}{/snippet}
	</Value>

	{#if nonNullish(input.iconUrl)}
		<Value element="div" ref="customNetworkIconUrl">
			{#snippet label()}{$i18n.custom_networks.field.icon_url}{/snippet}
			{#snippet content()}{input.iconUrl}{/snippet}
		</Value>
	{/if}

	<Value element="div" ref="customNetworkEnv">
		{#snippet label()}{$i18n.custom_networks.field.environment}{/snippet}
		{#snippet content()}
			{input.env === 'mainnet'
				? $i18n.custom_networks.text.mainnet
				: $i18n.custom_networks.text.testnet}
		{/snippet}
	</Value>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onBack} />
			<Button
				loading={saving}
				onclick={onConfirm}
				testId={ADD_CUSTOM_NETWORK_CONFIRM_BUTTON}
				type="button"
			>
				{$i18n.custom_networks.button.add}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
