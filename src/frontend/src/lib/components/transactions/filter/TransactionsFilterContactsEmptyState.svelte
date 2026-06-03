<script lang="ts">
	import IconAddressBook from '$lib/components/icons/IconAddressBook.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TRANSACTIONS_FILTER_CONTACTS_EMPTY_CTA } from '$lib/constants/test-ids.constants';
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
	import { buildLearnMoreEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const learnMoreUrl = 'https://docs.oisy.com/introduction/oisy-keeps-you-protected#contacts';

	const openAddressBook = () => {
		modalStore.openAddressBook({ id: Symbol() });
	};
</script>

<div class="flex flex-col items-center gap-3 px-2 py-4 text-center">
	<div class="w-16 text-brand-primary [&_svg]:h-auto [&_svg]:w-full" aria-hidden="true">
		<IconAddressBook />
	</div>

	<p class="text-sm text-secondary">{$i18n.transaction.filter.contacts_empty_title}</p>

	<p class="text-sm text-tertiary">
		<strong
			><span class="relative -top-px mr-1 inline-block align-middle text-success-primary"
				><IconShieldCheck size="16" /></span
			>{`${replaceOisyPlaceholders($i18n.core.text.oisy_protects_you)} `}</strong
		>{$i18n.transaction.filter.contacts_empty_description}<br />
		<ExternalLink
			ariaLabel={$i18n.core.alt.learn_more}
			color="blue"
			href={learnMoreUrl}
			iconVisible={false}
			trackEvent={buildLearnMoreEvent({
				sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TRANSACTIONS,
				eventSubcontext: 'core.text.learn_more',
				url: learnMoreUrl
			})}>{$i18n.core.text.learn_more}</ExternalLink
		>
	</p>

	<Button
		colorStyle="primary"
		fullWidth
		onclick={openAddressBook}
		testId={TRANSACTIONS_FILTER_CONTACTS_EMPTY_CTA}
		type="button"
	>
		{$i18n.transaction.filter.contacts_empty_cta}
	</Button>
</div>
