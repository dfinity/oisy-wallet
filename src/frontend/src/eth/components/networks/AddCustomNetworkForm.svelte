<script lang="ts">
	import type {
		CustomEvmNetworkFormErrors,
		CustomEvmNetworkFormValues
	} from '$eth/services/custom-network-form.services';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import {
		ADD_CUSTOM_NETWORK_CONFIRM_BUTTON,
		ADD_CUSTOM_NETWORK_ENV_MAINNET,
		ADD_CUSTOM_NETWORK_ENV_TESTNET,
		ADD_CUSTOM_NETWORK_INPUT_CHAIN_ID,
		ADD_CUSTOM_NETWORK_INPUT_CURRENCY_SYMBOL,
		ADD_CUSTOM_NETWORK_INPUT_EXPLORER_URL,
		ADD_CUSTOM_NETWORK_INPUT_ICON_URL,
		ADD_CUSTOM_NETWORK_INPUT_NAME,
		ADD_CUSTOM_NETWORK_INPUT_RPC_URL,
		ADD_CUSTOM_NETWORK_VERIFICATION_BANNER,
		ADD_CUSTOM_NETWORK_VERIFY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	/**
	 * Controlled banner shown above the toolbar when the async probe fails with
	 * something the user can act on (wrong RPC, unreachable endpoint, duplicate
	 * chain ID). Field-level Zod/required errors render inline under each
	 * input; this slot is for the cross-cutting messages that don't belong to
	 * any single field.
	 */
	interface VerificationBanner {
		message: string;
	}

	interface Props {
		values: CustomEvmNetworkFormValues;
		errors: CustomEvmNetworkFormErrors;
		verifying: boolean;
		banner?: VerificationBanner;
		onVerify: () => void;
		onCancel: () => void;
	}

	let { values = $bindable(), errors, verifying, banner, onVerify, onCancel }: Props = $props();
</script>

<ContentWithToolbar>
	<p class="mb-4 text-sm text-tertiary">{$i18n.custom_networks.text.form_intro}</p>

	<label class="font-bold" for="customNetworkName">{$i18n.custom_networks.field.name}</label>
	<InputText
		name="customNetworkName"
		placeholder={$i18n.custom_networks.field.name_placeholder}
		testId={ADD_CUSTOM_NETWORK_INPUT_NAME}
		bind:value={values.name}
	/>
	{#if errors.name}
		<p class="text-error mt-1 mb-4 text-sm">{errors.name}</p>
	{:else}
		<div class="mb-4"></div>
	{/if}

	<label class="font-bold" for="customNetworkChainId">
		{$i18n.custom_networks.field.chain_id}
	</label>
	<InputText
		name="customNetworkChainId"
		placeholder={$i18n.custom_networks.field.chain_id_placeholder}
		testId={ADD_CUSTOM_NETWORK_INPUT_CHAIN_ID}
		bind:value={values.chainId}
	/>
	{#if errors.chainId}
		<p class="text-error mt-1 mb-4 text-sm">{errors.chainId}</p>
	{:else}
		<div class="mb-4"></div>
	{/if}

	<label class="font-bold" for="customNetworkRpcUrl">
		{$i18n.custom_networks.field.rpc_url}
	</label>
	<InputText
		name="customNetworkRpcUrl"
		placeholder={$i18n.custom_networks.field.rpc_url_placeholder}
		testId={ADD_CUSTOM_NETWORK_INPUT_RPC_URL}
		bind:value={values.rpcUrl}
	/>
	{#if errors.rpcUrl}
		<p class="text-error mt-1 mb-4 text-sm">{errors.rpcUrl}</p>
	{:else}
		<div class="mb-4"></div>
	{/if}

	<label class="font-bold" for="customNetworkCurrencySymbol">
		{$i18n.custom_networks.field.currency_symbol}
	</label>
	<InputText
		name="customNetworkCurrencySymbol"
		placeholder={$i18n.custom_networks.field.currency_symbol_placeholder}
		testId={ADD_CUSTOM_NETWORK_INPUT_CURRENCY_SYMBOL}
		bind:value={values.currencySymbol}
	/>
	{#if errors.currencySymbol}
		<p class="text-error mt-1 mb-4 text-sm">{errors.currencySymbol}</p>
	{:else}
		<div class="mb-4"></div>
	{/if}

	<label class="font-bold" for="customNetworkExplorerUrl">
		{$i18n.custom_networks.field.explorer_url}
	</label>
	<InputText
		name="customNetworkExplorerUrl"
		placeholder={$i18n.custom_networks.field.explorer_url_placeholder}
		testId={ADD_CUSTOM_NETWORK_INPUT_EXPLORER_URL}
		bind:value={values.explorerUrl}
	/>
	{#if errors.explorerUrl}
		<p class="text-error mt-1 mb-4 text-sm">{errors.explorerUrl}</p>
	{:else}
		<div class="mb-4"></div>
	{/if}

	<label class="font-bold" for="customNetworkIconUrl">
		{$i18n.custom_networks.field.icon_url}
	</label>
	<InputText
		name="customNetworkIconUrl"
		placeholder={$i18n.custom_networks.field.icon_url_placeholder}
		required={false}
		testId={ADD_CUSTOM_NETWORK_INPUT_ICON_URL}
		bind:value={values.iconUrl}
	/>
	{#if errors.iconUrl}
		<p class="text-error mt-1 mb-4 text-sm">{errors.iconUrl}</p>
	{:else}
		<div class="mb-4"></div>
	{/if}

	<fieldset class="mb-4">
		<legend class="font-bold">{$i18n.custom_networks.field.environment}</legend>
		<div class="mt-2 flex gap-4">
			<label class="flex items-center gap-2">
				<input
					name="customNetworkEnv"
					checked={values.env === 'mainnet'}
					data-tid={ADD_CUSTOM_NETWORK_ENV_MAINNET}
					onchange={() => (values.env = 'mainnet')}
					type="radio"
					value="mainnet"
				/>
				{$i18n.custom_networks.text.mainnet}
			</label>
			<label class="flex items-center gap-2">
				<input
					name="customNetworkEnv"
					checked={values.env === 'testnet'}
					data-tid={ADD_CUSTOM_NETWORK_ENV_TESTNET}
					onchange={() => (values.env = 'testnet')}
					type="radio"
					value="testnet"
				/>
				{$i18n.custom_networks.text.testnet}
			</label>
		</div>
	</fieldset>

	{#if banner}
		<div
			class="border-error bg-error/10 text-error mb-4 rounded border p-3 text-sm"
			data-tid={ADD_CUSTOM_NETWORK_VERIFICATION_BANNER}
			role="alert"
		>
			{banner.message}
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onCancel} testId={`${ADD_CUSTOM_NETWORK_CONFIRM_BUTTON}-cancel`} />
			<Button
				loading={verifying}
				onclick={onVerify}
				testId={ADD_CUSTOM_NETWORK_VERIFY_BUTTON}
				type="button"
			>
				{$i18n.custom_networks.button.verify}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
