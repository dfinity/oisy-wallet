<script lang="ts">
	import { PRIMARY_INTERNET_IDENTITY_VERSION } from '$env/auth.env';
	import helpAuthIdentityBanner from '$lib/assets/help-auth-identity-banner.webp';
	import Button from '$lib/components/ui/Button.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		OISY_ACCESS_CONTROL_URL,
		OISY_DOCS_URL,
		OISY_FAQ_URL_WHO_CONTROLS_THE_PRIVATE_KEY,
		OISY_INTERNET_IDENTITY_VERSION_2_0_DOCS_URL,
		OISY_INTERNET_IDENTITY_HELP_CENTER_URL
	} from '$lib/constants/oisy.constants';
	import {
		HELP_AUTH_USE_IDENTITY_NUMBER_BUTTON,
		HELP_AUTH_IMAGE_BANNER,
		HELP_AUTH_LOST_IDENTITY_BUTTON,
		HELP_AUTH_NEW_IDENTITY_VERSION_BUTTON,
		HELP_AUTH_SWITCH_TO_NEW_INTERNET_IDENTITY_LINK,
		HELP_AUTH_INTRODUCTION_LINK,
		HELP_AUTH_PRIVATE_KEY_LINK,
		HELP_AUTH_ASSET_CONTROL_LINK,
		HELP_AUTH_INTERNET_IDENTITY_HELP_CENTER_LINK
	} from '$lib/constants/test-ids.constants';
	import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onOpenNewIdentityHelp: () => void;
		onOpenLegacyIdentityHelp: () => void;
	}

	let { onOpenLegacyIdentityHelp, onOpenNewIdentityHelp }: Props = $props();

	const trackingEventKey = 'main_page_button';

	let isPrimaryIdentityVersion2 = $derived(PRIMARY_INTERNET_IDENTITY_VERSION === '2.0');
</script>

<div class="grid gap-6">
	<Img
		src={helpAuthIdentityBanner}
		styleClass="w-full rounded-xl"
		testId={HELP_AUTH_IMAGE_BANNER}
	/>

	<span>{$i18n.auth.help.text.description}</span>

	<div>
		<div class="grid gap-2">
			{#if isPrimaryIdentityVersion2}
				<Button
					ariaLabel={$i18n.auth.help.text.login_page_looks_different}
					colorStyle="secondary-light"
					fullWidth
					onclick={() => {
						trackEvent({
							name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
							metadata: { event_key: trackingEventKey, event_value: 'login_page_looks_different' }
						});
						onOpenNewIdentityHelp();
					}}
					testId={HELP_AUTH_NEW_IDENTITY_VERSION_BUTTON}
					type="button"
				>
					{$i18n.auth.help.text.login_page_looks_different}
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
			{/if}

			<Button
				ariaLabel={$i18n.auth.help.text.lost_identity_number}
				colorStyle="secondary-light"
				fullWidth
				onclick={() => {
					trackEvent({
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'lost_identity_number'
						}
					});
					onOpenLegacyIdentityHelp();
				}}
				testId={HELP_AUTH_LOST_IDENTITY_BUTTON}
				type="button"
			>
				{$i18n.auth.help.text.lost_identity_number}
			</Button>

			<div class="mt-6 mb-2 font-bold">{$i18n.auth.help.text.useful_links}</div>

			<div>
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
			</div>

			<div>
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
			</div>

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
					ariaLabel={$i18n.auth.help.text.private_key}
					href={OISY_FAQ_URL_WHO_CONTROLS_THE_PRIVATE_KEY}
					iconAsLast
					styleClass="font-semibold"
					testId={HELP_AUTH_PRIVATE_KEY_LINK}
					trackEvent={{
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'private_key'
						}
					}}
				>
					{$i18n.auth.help.text.private_key}
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
