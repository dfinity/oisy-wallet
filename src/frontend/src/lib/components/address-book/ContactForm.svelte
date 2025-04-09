<script lang="ts">
	import { z, ZodError } from 'zod';
	import { saveContact } from '$icp/services/manage-contacts.services';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import type { Contact } from '$lib/types/contact';

	const { contact, close } = $props();
	let error = $state<ZodError | null>(null);
	let progress = $state(false);

	const save = async (contact: Partial<Contact>) => {
		try {
			progress = true;
			await saveContact(contact);
			close();
		} catch (e) {
			if (e instanceof z.ZodError) {
				console.error(e);
				error = e;
			}
		} finally {
			progress = false;
		}
	};
</script>

<ContentWithToolbar styleClass="flex items-center justify-center">
	<div>
		<form>
			<InputText name="name" placeholder="Name" bind:value={contact.name} />
			{#if !error?.isEmpty}
				{error?.issues.map((i) => `${i.path.join('.')} ${i.message}`)}
			{/if}
		</form>
	</div>

	<ButtonGroup slot="toolbar">
		<ButtonCancel on:click={close} disabled={progress}></ButtonCancel>
		<Button colorStyle="primary" disabled={progress} on:click={() => save(contact)}>
			{contact.id ? 'Save' : 'Add'}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
