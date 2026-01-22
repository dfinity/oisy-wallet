<script lang="ts">
	import helpAuthInterruptedBanner from '$lib/assets/help-auth-interrupted-banner.webp';
	import Button from '$lib/components/ui/Button.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		OISY_ACCESS_CONTROL_URL,
		OISY_DOCS_URL,
		OISY_LOGGING_INTO_OISY_URL,
		OISY_CREATING_A_WALLET_URL
	} from '$lib/constants/oisy.constants';
	import {
		HELP_AUTH_ISSUE_WITH_LOGIN_PAGE_BUTTON,
		HELP_AUTH_USE_IDENTITY_NUMBER_BUTTON,
		HELP_AUTH_IMAGE_BANNER,
		HELP_AUTH_INTRODUCTION_LINK,
		HELP_AUTH_ASSET_CONTROL_LINK,
		HELP_AUTH_LOGGING_INTO_OISY_LINK,
		HELP_AUTH_CREATING_A_WALLET_LINK
	} from '$lib/constants/test-ids.constants';
	import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onOpenNewIdentityHelp: () => void;
	}

	let { onOpenNewIdentityHelp }: Props = $props();

	const trackingEventKey = 'main_page_button';
</script>

<div class="grid gap-6">
	<Img
		src={helpAuthInterruptedBanner}
		styleClass="w-full rounded-xl"
		testId={HELP_AUTH_IMAGE_BANNER}
	/>

	<span>{$i18n.auth.help.text.description}</span>

	<div>
		<div class="grid gap-2">
			<Button
				ariaLabel={$i18n.auth.help.text.issue_with_login_page}
				colorStyle="secondary-light"
				fullWidth
				onclick={() => {
					trackEvent({
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: { event_key: trackingEventKey, event_value: 'issue_with_login_page' }
					});
					onOpenNewIdentityHelp();
				}}
				testId={HELP_AUTH_ISSUE_WITH_LOGIN_PAGE_BUTTON}
				type="button"
			>
				{$i18n.auth.help.text.issue_with_login_page}
			</Button>

			<Button
				ariaLabel={$i18n.auth.help.text.use_identity_number}
				colorStyle="secondary-light"
				fullWidth
				onclick={() => {
					trackEvent({
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'use_identity_number'
						}
					});
					onOpenNewIdentityHelp();
				}}
				testId={HELP_AUTH_USE_IDENTITY_NUMBER_BUTTON}
				type="button"
			>
				{$i18n.auth.help.text.use_identity_number}
			</Button>

			<div class="mt-6 mb-2 font-bold">{$i18n.auth.help.text.useful_links}</div>

			<div>
				<ExternalLink
					ariaLabel={$i18n.auth.help.text.oisy_introduction}
					href={OISY_DOCS_URL}
					iconAsLast
					styleClass="font-semibold"
					testId={HELP_AUTH_INTRODUCTION_LINK}
					trackEvent={{
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'oisy_introduction'
						}
					}}
				>
					{replaceOisyPlaceholders($i18n.auth.help.text.oisy_introduction)}
				</ExternalLink>
			</div>

			<div>
				<ExternalLink
					ariaLabel={$i18n.auth.help.text.logging_into_oisy}
					href={OISY_LOGGING_INTO_OISY_URL}
					iconAsLast
					styleClass="font-semibold"
					testId={HELP_AUTH_LOGGING_INTO_OISY_LINK}
					trackEvent={{
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'logging_into_oisy'
						}
					}}
				>
					{replaceOisyPlaceholders($i18n.auth.help.text.logging_into_oisy)}
				</ExternalLink>
			</div>

			<div>
				<ExternalLink
					ariaLabel={$i18n.auth.help.text.creating_a_wallet}
					href={OISY_CREATING_A_WALLET_URL}
					iconAsLast
					styleClass="font-semibold"
					testId={HELP_AUTH_CREATING_A_WALLET_LINK}
					trackEvent={{
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'creating_a_wallet'
						}
					}}
				>
					{replaceOisyPlaceholders($i18n.auth.help.text.creating_a_wallet)}
				</ExternalLink>
			</div>

			<div>
				<ExternalLink
					ariaLabel={replaceOisyPlaceholders($i18n.auth.help.text.asset_control)}
					href={OISY_ACCESS_CONTROL_URL}
					iconAsLast
					styleClass="font-semibold"
					testId={HELP_AUTH_ASSET_CONTROL_LINK}
					trackEvent={{
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'asset_control'
						}
					}}
				>
					{replaceOisyPlaceholders($i18n.auth.help.text.asset_control)}
				</ExternalLink>
			</div>
		</div>
	</div>

	<div class="mb-6">
		<i class="block">{replaceOisyPlaceholders($i18n.auth.help.text.feedback_text)}</i>
		<i class="block">{$i18n.auth.help.text.thanks_text}</i>
	</div>
</div>
