<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import Divider from '$lib/components/common/Divider.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';

	interface Props {
		contact: ContactUi;
		contactAddress?: ContactAddressUi;
	}

	const { contact, contactAddress }: Props = $props();

	const addressAlias = $derived(contactAddress?.label);
</script>

<span class="inline-flex min-w-0 items-center gap-1" in:slide={SLIDE_PARAMS}>
	<span class="shrink-0">
		<Avatar name={contact.name} image={contact.image} variant="xxs" />
	</span>

	<span class="flex min-w-0 flex-wrap items-center">
		<span class="inline-block max-w-38 truncate">
			{contact.name}
		</span>
		{#if notEmptyString(addressAlias)}
			<span class="inline-flex items-center text-tertiary">
				<Divider />
				<span class="inline-block max-w-20 truncate sm:max-w-29 lg:max-w-34">
					{addressAlias}
				</span>
			</span>
		{/if}
	</span>
</span>
