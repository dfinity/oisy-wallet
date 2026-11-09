<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadContacts, resetContacts } from '$lib/services/manage-contacts.service';
	import type { NullishIdentity } from '$lib/types/identity';
	import { consoleError } from '$lib/utils/console.utils';

	const load = (identity: NullishIdentity) => {
		if (isNullish(identity)) {
			resetContacts();
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
