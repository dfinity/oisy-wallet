<script lang="ts">
	import helpAuthNewIdentityBanner from '$lib/assets/help-auth-new-identity-banner.webp';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		OISY_INTERNET_IDENTITY_HELP_CENTER_URL,
		OISY_INTERNET_IDENTITY_VERSION_2_0_DOCS_URL
	} from '$lib/constants/oisy.constants';
	import {
		HELP_AUTH_BACK_BUTTON,
		HELP_AUTH_DONE_BUTTON,
		HELP_AUTH_IDENTITY_IMAGE_BANNER,
		HELP_AUTH_INTERNET_IDENTITY_HELP_CENTER_LINK,
		HELP_AUTH_SWITCH_TO_NEW_INTERNET_IDENTITY_LINK
	} from '$lib/constants/test-ids.constants';
	import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { InternetIdentityDomain } from '$lib/types/auth';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onBack: () => void;
		onDone: () => void;
		hideBack?: boolean;
	}

	let { onBack, onDone, hideBack = false }: Props = $props();

	const trackingEventKey = 'main_page_button';

</script>

<ContentWithToolbar>
	<div class="grid gap-6">
		<Img
			alt={$i18n.auth.help.alt.internet_identity}
			src={helpAuthNewIdentityBanner}
			styleClass="w-full rounded-xl"
			testId={HELP_AUTH_IDENTITY_IMAGE_BANNER}
		/>

		<div>
			<p>
				{replaceOisyPlaceholders($i18n.auth.help.text.identity_new_identity_title)}
			</p>

			<p>
				{$i18n.auth.help.text.identity_new_identity_item_1}
			</p>

			<p class="mb-0">
				<ExternalLink
					ariaLabel={replaceOisyPlaceholders($i18n.auth.help.text.internet_identity_help_center)}
					href={OISY_INTERNET_IDENTITY_HELP_CENTER_URL}
					iconAsLast
					styleClass="font-semibold"
					testId={HELP_AUTH_INTERNET_IDENTITY_HELP_CENTER_LINK}
					trackEvent={{
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'internet_identity_help_center'
						}
					}}
				>
					{replaceOisyPlaceholders($i18n.auth.help.text.internet_identity_help_center)}
				</ExternalLink>
			</p>

			<p>
				<ExternalLink
					ariaLabel={$i18n.auth.help.text.switch_to_new_internet_identity}
					href={OISY_INTERNET_IDENTITY_VERSION_2_0_DOCS_URL}
					iconAsLast
					styleClass="font-semibold"
					testId={HELP_AUTH_SWITCH_TO_NEW_INTERNET_IDENTITY_LINK}
					trackEvent={{
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'switch_to_new_internet_identity'
						}
					}}
				>
					{replaceOisyPlaceholders($i18n.auth.help.text.switch_to_new_internet_identity)}
				</ExternalLink>
			</p>
		</div>
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			{#if !hideBack}
				<ButtonBack onclick={onBack} testId={HELP_AUTH_BACK_BUTTON} />
			{/if}
			<ButtonDone onclick={onDone} testId={HELP_AUTH_DONE_BUTTON} />
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
