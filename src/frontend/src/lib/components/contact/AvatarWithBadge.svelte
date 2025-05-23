<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AddressesBadge from '$lib/components/contact/AddressesBadge.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import type { ContactUi } from '$lib/types/contact';
	import type { AvatarVariants } from '$lib/types/style';

	interface Props {
		contact: ContactUi;
		badge?:
			| { type: 'addressTypeOrCount' }
			| {
					type: 'addressType';
					address: string;
			  };
		variant?: AvatarVariants;
	}

	const { contact, badge, variant }: Props = $props();
</script>

<div class="flex">
	<div class="relative">
		<Avatar name={contact.name} {variant} />
		{#if nonNullish(badge)}
			{#if badge.type === 'addressTypeOrCount'}
				<AddressesBadge addresses={contact.addresses} />
			{:else if badge.type === 'addressType'}
				<AddressesBadge addresses={contact.addresses} selectedAddress={badge.address} />
			{/if}
		{/if}
	</div>
</div>
