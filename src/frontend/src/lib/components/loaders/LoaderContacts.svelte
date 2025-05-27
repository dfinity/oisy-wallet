<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadContacts } from '$lib/services/manage-contacts.service';
	import { contactsStore } from '$lib/stores/contacts.store';
	import type { OptionIdentity } from '$lib/types/identity';

	interface Props {
		children?: Snippet;
	}

	const { children }: Props = $props();

	const load = (identity: OptionIdentity) => {
		if (isNullish(identity)) {
			contactsStore.reset();
			return;
		}

		//loadContacts(identity);
		contactsStore.addContact({
			id: 0n,
			name: 'Dave myself',
			updateTimestampNs: 0n,
			addresses: [
				{
					label: 'my',
					addressType: 'Icrcv2',
					address: 'ca0b4e6b21f6ced815fcd14a4742411c3dbda1320a98f29aac756d0a020b4c42'
				}
			]
		});
	};

	$effect(() => {
		load($authIdentity);
	});

	const reload = () => {
		load($authIdentity);
	};
</script>

<svelte:window on:oisyRefreshContacts={reload} />

{@render children?.()}
