<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import * as z from 'zod';
	import { ContactSchema } from '$env/schema/env-contact.schema';
	import ContactForm from '$lib/components/address-book/ContactForm.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	onMount(async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}
	});

	const crudContactSchema = ContactSchema.partial();

	let contact: z.infer<typeof crudContactSchema> | null = null;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><span class="text-xl">{$i18n.address_book.text.title}</span>
	</svelte:fragment>

  {#if contact}
	<ContactForm {contact} close={() => (contact = null)}></ContactForm>
  {:else}
  NO CONTACT
  {/if}

</Modal>
