<script lang="ts">
	import AddressesBadge from '$lib/components/contact/AddressesBadge.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import type { ContactUi } from '$lib/types/contact';
	import type { AvatarVariants } from '$lib/types/style';

	interface Props {
		contact: ContactUi;
		badge?: {
			address: string;
		};
		variant?: AvatarVariants;
	}

	const { contact, variant }: Props = $props();
</script>

<div class="relative">
	<Avatar name={contact.name} {variant} styleClass="md:text-[19.2px]"></Avatar>
	<AddressesBadge addresses={contact.addresses} />
</div>
