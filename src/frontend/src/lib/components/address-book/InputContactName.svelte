<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { CONTACT_MAX_NAME_LENGTH } from '$lib/constants/app.constants';
	import { ADDRESS_BOOK_CONTACT_NAME_INPUT } from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		contact: Partial<ContactUi>;
		disabled?: boolean;
		isValid: boolean;
	}
	let { contact = $bindable(), disabled = false, isValid = $bindable() }: Props = $props();

	let name = $state(contact.name ?? '');

	$effect(() => {
		contact.name = name;
	});

	const trimmedName = $derived(name.trim());
	const isNameTooLong = $derived(trimmedName.length > CONTACT_MAX_NAME_LENGTH);

	$effect(() => {
		isValid = notEmptyString(trimmedName) && !isNameTooLong;
	});
</script>

<div style="--input-font-size: var(--text-base)" class="w-full">
	<div
		class="w-full rounded-lg bg-brand-subtle-10 p-4 pb-6 pt-4 text-sm md:p-6 md:text-base md:font-bold"
	>
		{$i18n.contact.fields.name}
		<InputText
			name="name"
			autofocus={true}
			{disabled}
			placeholder=""
			showResetButton={!disabled}
			testId={ADDRESS_BOOK_CONTACT_NAME_INPUT}
			bind:value={name}
		/>
		{#if isNameTooLong}
			<p class="pt-2 text-error-primary" transition:slide={SLIDE_DURATION}>
				{replacePlaceholders($i18n.contact.error.name_too_long, {
					$maxCharacters: `${CONTACT_MAX_NAME_LENGTH}`
				})}</p
			>
		{/if}
	</div>
</div>
