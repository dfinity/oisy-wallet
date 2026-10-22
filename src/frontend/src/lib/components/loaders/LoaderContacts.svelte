<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadContacts } from '$lib/services/manage-contacts.service';
	import { contactsStore } from '$lib/stores/contacts.store';
	import type { NullishIdentity } from '$lib/types/identity';
	import { consoleError } from '$lib/utils/console.utils';

	const load = (identity: NullishIdentity) => {
		if (isNullish(identity)) {
			contactsStore.reset();
			return;
		}

		loadContacts(identity).catch(consoleError);
	};

	$effect(() => {
		load($authIdentity);
	});

	const reload = () => {
		load($authIdentity);
	};
</script>

<svelte:window onoisyRefreshContacts={reload} />
