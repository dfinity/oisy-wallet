<script lang="ts">
	import IconAddressBook from '$lib/components/icons/IconAddressBook.svelte';
	import IconCircleArrowRight from '$lib/components/icons/lucide/IconCircleArrowRight.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex flex-col items-center gap-8 md:gap-10">
	<div class="text-brand-primary">
		<IconAddressBook />
	</div>

	<div class="flex flex-col gap-3 text-center">
		<h1>{$i18n.address_book.text.empty_title}</h1>
		<span>{$i18n.address_book.text.empty_text}</span>
	</div>

	<!-- TODO: Add open modal when new contact modal is impemented -->
	<Button disabled>
		{$i18n.address_book.text.add_new_contact}
		<IconCircleArrowRight />
	</Button>
</div>
