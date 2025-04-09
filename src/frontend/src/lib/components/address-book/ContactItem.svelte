<script lang="ts">
	import { z } from 'zod';
	import { ContactSchema } from '$env/schema/env-contact.schema';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';

	const { contact }: { contact: z.infer<typeof ContactSchema> } = $props();

	const initials = $derived(
		contact.name
			.split(' ')
			.map((w) => w.slice(0, 1))
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
	function selectContact() {}
</script>

<div class="flex-cols flex w-full gap-4">
	<span
		class="inline-block inline-flex h-20 w-20 items-center justify-center rounded-full bg-[lightgray] text-4xl font-bold"
		>{initials}</span
	>

	<div class="flex items-center">
		<div class="text-xl font-bold">{contact.name}</div>
	</div>

	<div class="flex-1"></div>
	<div class="flex items-center">
		<ButtonIcon ariaLabel="Info" on:click={selectContact}>
			<IconInfo slot="icon"></IconInfo></ButtonIcon
		>
	</div>
</div>
