<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import InputText from '$lib/components/ui/InputText.svelte';
	import {
		ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
		ADDRESS_BOOK_ADDRESS_ALIAS_INPUT
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address } from '$lib/types/contact';

	// TODO integrate validation of AddressInput
	// let inputAddress: InputAddress | undefined = $state();

	let { address = $bindable() }: { address: Partial<Address> } = $props();

	// const handleQRCodeScan = () => {};

	let isNewAddress = $derived(!nonNullish(address.id));
	let title = $derived(
		isNewAddress ? $i18n.address.form.new_address : $i18n.address.form.edit_address
	);
	// TODO integrate validation of AddressInput
	// let isValid = $derived(inputAddress?.isValid);
	let isValid = $derived(nonNullish(address.address));
	export { isValid };
</script>

<form class="w-full">
	<div class="rounded-lg bg-brand-light p-4 pb-6 pt-4 text-sm md:p-6 md:text-base md:font-bold">
		<div class="pb-4 text-xl">{title}</div>

		<label for="address" class="">{$i18n.address.fields.address}</label>

		<!--
		TODO Use the InputAddress component here
		https://github.com/dfinity/oisy-wallet/pull/6284
		 <InputAddress
			bind:this={inputAddress}
			name="address"
			placeholder={$i18n.address.form.address_placeholder}
			bind:value={address.address}
			testId={ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT}
			showPasteButton
			showResetButton
			disabled={!isNewAddress}
			onQRCodeScan={handleQRCodeScan}
		/> -->
		<Input
			name="address"
			inputType="text"
			placeholder={$i18n.address.form.address_placeholder}
			bind:value={address.address}
			testId={ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT}
			disabled={!isNewAddress}
		></Input>

		<label for="alias">{$i18n.address.fields.alias}</label>
		<InputText
			name="alias"
			placeholder={$i18n.address.form.alias_placeholder}
			bind:value={address.alias}
			testId={ADDRESS_BOOK_ADDRESS_ALIAS_INPUT}
		/>
	</div>
</form>
