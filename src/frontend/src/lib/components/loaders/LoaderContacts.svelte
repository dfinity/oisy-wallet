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

		loadContacts(identity);
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
