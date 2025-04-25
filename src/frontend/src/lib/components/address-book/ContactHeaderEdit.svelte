<script lang="ts">
	import type { Contact } from '$lib/types/contact';
	import IconPencil from '../icons/lucide/IconPencil.svelte';
	import Avatar from './Avatar.svelte';

	let { contact, select }: { contact: Contact; select: () => void } = $props();
</script>

<button
	onclick={select}
	class="hover:bg-brand-primary/10 flex w-full items-center gap-3 rounded-xl p-2"
>
	<Avatar name={contact.name} variant="xs" styleClass="md:text-[19.2px]"></Avatar>
	<div class="text-xl font-bold md:text-2xl">{contact.name}</div>
	<div class="flex-grow"></div>
	<div class="size-7 p-1 text-brand-primary md:size-10 md:p-2">
		<IconPencil size="100%" />
	</div>
</button>
