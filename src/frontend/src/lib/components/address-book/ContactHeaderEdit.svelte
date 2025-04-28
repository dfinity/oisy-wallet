<script lang="ts">
	import Avatar from './Avatar.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import { CONTACT_HEADER_EDITING_EDIT_BUTTON } from '$lib/constants/test-ids.constants';
	import type { Contact } from '$lib/types/contact';

	let { contact, select }: { contact: Contact; select: (contact: Contact) => void } = $props();
</script>

<button
	onclick={() => select(contact)}
	class="hover:bg-brand-primary/10 flex w-full items-center gap-3 rounded-xl p-2"
	data-tid={CONTACT_HEADER_EDITING_EDIT_BUTTON}
>
	<Avatar name={contact.name} variant="xs" styleClass="md:text-[19.2px]"></Avatar>
	<div class="text-xl font-bold md:text-2xl">{contact.name}</div>
	<div class="flex-grow"></div>
	<div class="size-7 p-1 text-brand-primary md:size-10 md:p-2">
		<IconPencil size="100%" />
	</div>
</button>
