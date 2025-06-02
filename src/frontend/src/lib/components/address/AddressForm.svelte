<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
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
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		address: Partial<ContactAddressUi>;
		disableAddressField?: boolean;
		isInvalid: boolean;
		disabled?: boolean;
	}
	let {
		address = $bindable(),
		disableAddressField = false,
		isInvalid = $bindable(),
		disabled = false
	}: Props = $props();

	let addressParseError = $state<ZodError | undefined>();
	let labelError = $derived(ContactAddressUiSchema.shape.label.safeParse(address.label)?.error);

	$effect(() => {
		isInvalid = nonNullish(addressParseError) || nonNullish(labelError);
	});
</script>

<form class="w-full">
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
	/>

	<label for="label" class="font-bold">{$i18n.address.fields.label}</label>
	<InputText
		name="label"
		placeholder={$i18n.address.form.label_placeholder}
		bind:value={address.label}
		testId={ADDRESS_BOOK_ADDRESS_ALIAS_INPUT}
		{disabled}
	/>
	{#if nonNullish(labelError)}
		<p transition:slide={SLIDE_DURATION} class="pt-2 text-error-primary">
			{replacePlaceholders($i18n.address.form.error.label_too_long, {
				$maxCharacters: `${CONTACT_MAX_LABEL_LENGTH}`
			})}
		</p>
	{/if}
</form>
