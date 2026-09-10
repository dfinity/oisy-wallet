<script lang="ts">
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_SUPPORT_URL } from '$lib/constants/oisy.constants';
	import { SUPPORT_HELP_CARD, SUPPORT_HELP_LINK } from '$lib/constants/test-ids.constants';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_SUPPORT
	} from '$lib/enums/plausible';
	import { buildSupportEvent } from '$lib/services/support-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div data-tid={SUPPORT_HELP_CARD}>
	<SettingsCard>
		{#snippet title()}{$i18n.support.text.help_title}{/snippet}

		<p class="mb-3 text-sm text-tertiary">
			{replaceOisyPlaceholders($i18n.support.text.help_description)}
		</p>

		<ExternalLink
			ariaLabel={replaceOisyPlaceholders($i18n.navigation.alt.support)}
			href={OISY_SUPPORT_URL}
			iconVisible={false}
			styleClass="font-bold"
			testId={SUPPORT_HELP_LINK}
			trackEvent={buildSupportEvent({
				action: 'contact',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_SUPPORT.HELP,
				link: OISY_SUPPORT_URL
			})}
		>
			{$i18n.support.text.help_link}
		</ExternalLink>
	</SettingsCard>
</div>
