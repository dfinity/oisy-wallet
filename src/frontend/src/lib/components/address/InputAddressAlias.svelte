<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import type { ZodError } from 'zod';
	import InputAddress from '$lib/components/address/InputAddress.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { CONTACT_MAX_LABEL_LENGTH } from '$lib/constants/app.constants';
	import {
		ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
		ADDRESS_BOOK_ADDRESS_ALIAS_INPUT
	} from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { ContactAddressUiSchema } from '$lib/schema/contact.schema';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi } from '$lib/types/contact';
	import { isDesktop } from '$lib/utils/device.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onQRCodeScan?: () => void;
		address: Partial<ContactAddressUi>;
		disableAddressField?: boolean;
		isValid: boolean;
		disabled?: boolean;
		focusField?: 'address' | 'label' | null;
	}

	let {
		onQRCodeScan,
		address = $bindable(),
		disableAddressField = false,
		isValid = $bindable(),
		disabled = false,
		focusField = null
	}: Props = $props();

	let addressParseError = $state<ZodError | undefined>();
	let labelError = $derived(ContactAddressUiSchema.shape.label.safeParse(address.label)?.error);

	let addressLabel = $state(address.label ?? '');

	$effect(() => {
		address.label = addressLabel;
	});

	$effect(() => {
		if (nonNullish(address.label)) {
			const trimmed = address.label.trim();
			if (trimmed !== address.label) {
				address.label = trimmed;
			}
		}
	});

	$effect(() => {
		isValid = isNullish(addressParseError) && isNullish(labelError);
	});
</script>

<div class="w-full" style="--input-font-size: var(--text-base)">
	<label for="address" class="font-bold">{$i18n.address.fields.address}</label>

	<InputAddress
		bind:parseError={addressParseError}
		bind:value={address.address}
		bind:addressType={address.addressType}
		name="address"
		placeholder={$i18n.address.form.address_placeholder}
		testId={ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT}
		showPasteButton={!disableAddressField && !disabled}
		showResetButton={!disableAddressField && !disabled}
		disabled={disableAddressField || disabled}
		autofocus={isDesktop() && focusField === 'address'}
		{onQRCodeScan}
	/>

	<label for="label" class="font-bold">{$i18n.address.fields.label}</label>
	<InputText
		name="label"
		placeholder={$i18n.address.form.label_placeholder}
		bind:value={addressLabel}
		testId={ADDRESS_BOOK_ADDRESS_ALIAS_INPUT}
		{disabled}
		showResetButton={!disabled}
		required={false}
		autofocus={isDesktop() && focusField === 'label'}
	/>

	{#if nonNullish(labelError)}
		<p transition:slide={SLIDE_DURATION} class="pt-2 text-error-primary">
			{replacePlaceholders($i18n.address.form.error.label_too_long, {
				$maxCharacters: `${CONTACT_MAX_LABEL_LENGTH}`
			})}
		</p>
	{/if}
</div>
