<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { ZodError } from 'zod';
	import InputAddress from '$lib/components/address/InputAddress.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import {
		ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
		ADDRESS_BOOK_ADDRESS_ALIAS_INPUT
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi } from '$lib/types/contact';

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

	$effect(() => {
		isInvalid = nonNullish(addressParseError);
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
</form>
