<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { ComponentProps } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { ZodError } from 'zod/v4';
	import QrButton from '$lib/components/common/QrButton.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { TokenAccountIdSchema } from '$lib/schema/token-account-id.schema';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
	import {
		getDiscriminatorForTokenAccountId,
		getNetworksForTokenAccountIdType
	} from '$lib/utils/token-account-id.utils';

	interface InputAddressProps {
		onQRCodeScan?: () => void;
		value?: string;
		addressType?: TokenAccountIdTypes;
		parseError?: ZodError;
		disabled?: boolean;
	}

	let {
		onQRCodeScan,
		value = $bindable(),
		addressType = $bindable(),
		parseError = $bindable(),
		disabled,
		...props
	}: InputAddressProps & ComponentProps<Input> = $props();

	let tokenAccountIdParseResult = $derived(TokenAccountIdSchema.safeParse(value));

	let isValid = $derived(tokenAccountIdParseResult.success);
	let error = $derived(
		nonNullish(value) && !isValid ? $i18n.address.form.invalid_address : undefined
	);
	let borderColor = $derived(
		isValid
			? 'var(--color-border-success-solid)'
			: nonNullish(error)
				? 'var(--color-border-error-solid)'
				: 'inherit'
	);
	let currentAddressType = $derived(
		tokenAccountIdParseResult?.success
			? getDiscriminatorForTokenAccountId(tokenAccountIdParseResult.data)
			: undefined
	);
	let networks = $derived(
		nonNullish(addressType) ? getNetworksForTokenAccountIdType(addressType) : []
	);

	$effect(() => {
		// Because bindable props may not be derrived, set it manually in an effect
		addressType = currentAddressType;
		parseError = tokenAccountIdParseResult?.error;
	});
</script>

{#snippet qrButton()}
	{#if nonNullish(onQRCodeScan) && !disabled}
		<QrButton on:click={onQRCodeScan} />
	{/if}
{/snippet}

<div
	style={`--input-custom-border-color: ${borderColor}; --input-padding-inner-end: 100px; ${disabled ? '--input-background: var(--color-background-disabled);' : ''}`}
>
	<Input {disabled} innerEnd={qrButton} inputType="text" bind:value {...props}></Input>

	<div class="text-md pt-2">
		{#if error}
			<p class="text-error-primary" transition:slide={SLIDE_DURATION}>
				{error}
			</p>
		{/if}
		{#if isValid}
			<p class="text-success-primary" transition:slide={SLIDE_DURATION}>
				{$i18n.address.form.valid_for_networks}
				{#each networks as network, i (network.id)}
					{#if i > 0}
						&nbsp;•
					{/if}
					<span>
						{network.name}
					</span>
				{/each}
			</p>
		{/if}
	</div>
</div>
