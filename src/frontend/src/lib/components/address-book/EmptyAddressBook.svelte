<script lang="ts">
	import IconAddressBook from '$lib/components/icons/IconAddressBook.svelte';
	import IconCircleArrowRight from '$lib/components/icons/lucide/IconCircleArrowRight.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ADDRESS_BOOK_ADD_CONTACT_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onAddContact: () => void;
	}

	let { onAddContact }: Props = $props();
</script>

<div class="flex flex-col items-center gap-8 md:gap-10">
	<div class="text-brand-primary">
		<IconAddressBook />
	</div>

	<div class="flex flex-col gap-3 text-center">
		<h1>{$i18n.address_book.text.empty_title}</h1>
		<span>{$i18n.address_book.text.empty_text}</span>
	</div>

	<Button onclick={() => onAddContact()} testId={ADDRESS_BOOK_ADD_CONTACT_BUTTON}>
		{$i18n.address_book.text.add_new_contact}
		<IconCircleArrowRight />
	</Button>
</div>
