<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { ADDRESS_BOOK_CONTACT_NAME_INPUT } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';

	let {
		contact = $bindable(),
		disabled = false,
		onSubmit = () => {}
	}: { contact: Partial<ContactUi>; disabled?: boolean; onSubmit?: () => void } = $props();

	let isValid = $derived(notEmptyString(contact?.name?.trim?.()));

	const handleKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			onSubmit();
		}
	};

	export { isValid };
</script>

<svelte:window on:keydown={handleKeydown} />

<form class="w-full">
	<div class="rounded-lg bg-brand-subtle-10 p-4 pb-6 pt-4 text-sm md:p-6 md:text-base md:font-bold">
		{$i18n.contact.fields.name}
		<InputText
			name="name"
			placeholder=""
			bind:value={contact.name}
			showResetButton={!disabled}
			testId={ADDRESS_BOOK_CONTACT_NAME_INPUT}
			autofocus={true}
			{disabled}
		/>
	</div>
</form>
