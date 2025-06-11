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

	let {
		contact = $bindable(),
		disabled = false,
		onSubmit = () => {}
	}: { contact: Partial<ContactUi>; disabled?: boolean; onSubmit?: () => void } = $props();

	const trimmedName = $derived((contact.name ?? '').trim());
	const isNameTooLong = $derived(trimmedName.length > CONTACT_MAX_NAME_LENGTH);

	const assertValid = (): boolean => notEmptyString(trimmedName) && !isNameTooLong;

	const isValid = $derived(assertValid());

	const handleKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter' && assertValid()) {
			event.preventDefault();
			onSubmit();
		}
	};

	export { isValid };
</script>

<svelte:window on:keydown={handleKeydown} />

<form class="w-full" style="--input-font-size: var(--text-base)">
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
		{#if isNameTooLong}
			<p transition:slide={SLIDE_DURATION} class="pt-2 text-error-primary">
				{replacePlaceholders($i18n.contact.error.name_too_long, {
					$maxCharacters: `${CONTACT_MAX_NAME_LENGTH}`
				})}</p
			>
		{/if}
	</div>
</form>
