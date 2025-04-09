<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import * as z from 'zod';
	import ContactForm from '$lib/components/address-book/ContactForm.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { modalContactData } from '$lib/derived/modal.derived';
	import type { Contact } from '$lib/types/contact';

	onMount(async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}
	});

	const data = $modalContactData;
	let contact: Partial<Contact> = data.contact || {
		addresses: []
	};

	function close() {
		console.log(data);
		if (data.previousModal) {
			modalStore.open(data.previousModal);
		} else {
			modalStore.close();
		}
	}

	const newRecord = !contact.id;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><span class="text-xl">{newRecord ? 'New Contact' : 'Edit COntact'}</span>
	</svelte:fragment>

	{#if contact}
		<ContactForm {contact} {close}></ContactForm>
	{/if}
</Modal>
