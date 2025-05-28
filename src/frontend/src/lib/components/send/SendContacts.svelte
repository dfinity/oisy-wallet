<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { NetworkContacts } from '$lib/types/transactions';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		networkContacts?: NetworkContacts;
		contact?: ContactUi;
		destination: string;
	}

	let { networkContacts, contact = $bindable(), destination = $bindable() }: Props = $props();

	const dispatch = createEventDispatcher();
</script>

{#if nonNullish(networkContacts) && Object.keys(networkContacts).length > 0}
	<div class="flex flex-col overflow-y-hidden sm:max-h-[13.5rem]">
		<ul class="list-none overflow-y-auto overscroll-contain">
			{#each Object.keys(networkContacts) as address, index (index)}
				<LogoButton styleClass="group" onClick={() => dispatch('click')}>
					{#snippet logo()}
						<AvatarWithBadge
							contact={networkContacts[address]}
							badge={{ type: 'addressType', address }}
							variant="sm"
						/>
					{/snippet}

					{#snippet title()}
						{networkContacts[address].name}
					{/snippet}

					{#snippet description()}
						{shortenWithMiddleEllipsis({ text: address })}
					{/snippet}

					{#snippet descriptionEnd()}
						<div class="hidden text-brand-primary group-hover:block">
							{$i18n.send.text.send_again}
						</div>
					{/snippet}
				</LogoButton>
			{/each}
		</ul>
	</div>
{:else}
	<EmptyState
		title={$i18n.send.text.contacts_empty_state_title}
		description={$i18n.send.text.contacts_empty_state_description}
	/>
{/if}
