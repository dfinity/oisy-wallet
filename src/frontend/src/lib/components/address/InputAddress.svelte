<script lang="ts">
	import { isEmptyString, nonNullish, notEmptyString } from '@dfinity/utils';
	import type { ComponentProps } from 'svelte';
	import { slide } from 'svelte/transition';
	import QRButton from '$lib/components/common/QRButton.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { AddressType } from '$lib/types/address';
	import { getNetworksForAddressType, recognizeAddress } from '$lib/utils/address.utils';

	const SUCCESS_COLOR = 'var(--color-background-success-primary)';
	const ERROR_COLOR = 'var(--color-background-error-primary)';
	interface InputAddressProps {
		onQRCodeScan?: () => void;
		value?: string;
		addressType?: AddressType;
	}

	let {
		onQRCodeScan,
		value = $bindable(),
		addressType = $bindable(),
		...props
	}: InputAddressProps & ComponentProps<Input> = $props();

	let { currentAddressType, error } = $derived.by(() => {
		try {
			if (isEmptyString(value)) {
				return {};
			}

			const recognizedType = recognizeAddress(value);
			if (recognizedType) {
				return { currentAddressType: recognizedType };
			}

			return { error: $i18n.address.form.invalid_address };
		} catch (e) {
			return { error: `Error recognizing address type: ${e}` };
		}
	});
	let isValid = $derived(notEmptyString(value) && !error);
	let borderColor = $derived(isValid ? SUCCESS_COLOR : nonNullish(error) ? ERROR_COLOR : 'inherit');
	let networks = $derived(nonNullish(addressType) ? getNetworksForAddressType(addressType) : []);

	$effect(() => {
		addressType = currentAddressType;
	});
</script>

{#snippet qrButton()}
	{#if nonNullish(onQRCodeScan)}
		<QRButton on:click={onQRCodeScan} />
	{/if}
{/snippet}

<div style={`--input-custom-border-color: ${borderColor}; --input-padding-inner-end: 100px`}>
	<Input inputType="text" bind:value innerEnd={qrButton} {...props}></Input>

	<div class="text-md pt-2">
		{#if error}
			<p transition:slide={SLIDE_DURATION} class="text-error-primary">
				{error}
			</p>
		{/if}
		{#if isValid}
			<p transition:slide={SLIDE_DURATION} class="text-success-primary">
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
