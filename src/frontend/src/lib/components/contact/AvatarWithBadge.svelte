<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import emptyOisyLogo from '$lib/assets/oisy-logo-empty.svg';
	import AddressesBadge from '$lib/components/contact/AddressesBadge.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import type { ContactUi } from '$lib/types/contact';
	import type { AvatarVariants } from '$lib/types/style';

	interface Props {
		contact?: ContactUi;
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

<div class="relative flex">
	{#if nonNullish(contact)}
		<Avatar name={contact.name} {variant} />
		{#if nonNullish(badge)}
			<AddressesBadge
				addresses={contact.addresses}
				selectedAddress={badge.type === 'addressType' ? badge.address : undefined}
			/>
		{/if}
	{:else}
		<Img src={emptyOisyLogo} width="60px" height="60px" />
		<!-- Todo: add badge for string address, needs util to get address type for address -->
	{/if}
</div>
