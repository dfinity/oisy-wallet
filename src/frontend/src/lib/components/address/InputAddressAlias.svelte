<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import type { ZodError } from 'zod/v4';
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

<div style="--input-font-size: var(--text-base)" class="w-full">
	<label class="font-bold" for="address">{$i18n.address.fields.address}</label>

	<InputAddress
		name="address"
		autofocus={isDesktop() && focusField === 'address'}
		disabled={disableAddressField || disabled}
		{onQRCodeScan}
		placeholder={$i18n.address.form.address_placeholder}
		showPasteButton={!disableAddressField && !disabled}
		showResetButton={!disableAddressField && !disabled}
		testId={ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT}
		bind:parseError={addressParseError}
		bind:value={address.address}
		bind:addressType={address.addressType}
	/>

	<label class="font-bold" for="label">{$i18n.address.fields.label}</label>
	<InputText
		name="label"
		autofocus={isDesktop() && focusField === 'label'}
		{disabled}
		placeholder={$i18n.address.form.label_placeholder}
		required={false}
		showResetButton={!disabled}
		testId={ADDRESS_BOOK_ADDRESS_ALIAS_INPUT}
		bind:value={addressLabel}
	/>

	{#if nonNullish(labelError)}
		<p class="pt-2 text-error-primary" transition:slide={SLIDE_DURATION}>
			{replacePlaceholders($i18n.address.form.error.label_too_long, {
				$maxCharacters: `${CONTACT_MAX_LABEL_LENGTH}`
			})}
		</p>
	{/if}
</div>
