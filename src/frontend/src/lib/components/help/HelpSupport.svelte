<script lang="ts">
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_SUPPORT_URL } from '$lib/constants/oisy.constants';
	import { HELP_SUPPORT_CARD, HELP_SUPPORT_LINK } from '$lib/constants/test-ids.constants';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_HELP
	} from '$lib/enums/plausible';
	import { buildHelpEvent } from '$lib/services/help-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div data-tid={HELP_SUPPORT_CARD}>
	<SettingsCard>
		{#snippet title()}{$i18n.help.text.support_title}{/snippet}

		<p class="mb-3 text-sm text-tertiary">
			{replaceOisyPlaceholders($i18n.help.text.support_description)}
		</p>

		<ExternalLink
			ariaLabel={replaceOisyPlaceholders($i18n.navigation.alt.support)}
			href={OISY_SUPPORT_URL}
			iconAsLast
			styleClass="font-bold"
			testId={HELP_SUPPORT_LINK}
			trackEvent={buildHelpEvent({
				action: 'contact',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.SUPPORT,
				link: OISY_SUPPORT_URL
			})}
		>
			{$i18n.help.text.support_link}
		</ExternalLink>
	</SettingsCard>
</div>
