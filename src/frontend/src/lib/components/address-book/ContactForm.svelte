<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { ADDRESS_BOOK_CONTACT_NAME_INPUT } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Contact } from '$lib/types/contact';

	let { contact = $bindable() }: { contact: Partial<Contact> } = $props();

	let isValid = $derived(notEmptyString(contact?.name));

	export { isValid };
</script>

<form class="w-full">
	<div class="rounded-lg bg-brand-light p-4 pb-6 pt-4 text-sm md:p-6 md:text-base md:font-bold">
		{$i18n.contact.fields.name}
		<InputText
			name="name"
			placeholder=""
			bind:value={contact.name}
			showResetButton
			testId={ADDRESS_BOOK_CONTACT_NAME_INPUT}
		/>
	</div>
</form>
