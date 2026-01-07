<script lang="ts">
	import { PRIMARY_INTERNET_IDENTITY_VERSION } from '$env/auth.env';
	import helpAuthBanner from '$lib/assets/help-auth-banner.svg';
	import Button from '$lib/components/ui/Button.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		HELP_AUTH_COULD_NOT_ENTER_IDENTITY_NUMBER_BUTTON,
		HELP_AUTH_GOT_CONFUSED_BUTTON,
		HELP_AUTH_IMAGE_BANNER,
		HELP_AUTH_LOST_IDENTITY_BUTTON,
		HELP_AUTH_NEW_IDENTITY_VERSION_BUTTON,
		HELP_AUTH_NO_SIGN_UP_NEEDED_BUTTON,
		HELP_AUTH_OTHER_BUTTON,
		HELP_AUTH_SECURITY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onLostIdentity: () => void;
		onOther: () => void;
	}

	let { onLostIdentity, onOther }: Props = $props();

	const trackingEventKey = 'main_page_button';

	let isPrimaryIdentityVersion2 = $derived(PRIMARY_INTERNET_IDENTITY_VERSION === '2.0');
</script>

<div class="grid gap-6">
	<Img src={helpAuthBanner} styleClass="w-full" testId={HELP_AUTH_IMAGE_BANNER} />

	<span>{$i18n.auth.help.text.description}</span>

	<div>
		<div class="grid gap-2">
			{#if isPrimaryIdentityVersion2}
				<Button
					colorStyle="secondary-light"
					fullWidth
					onclick={() => {
						trackEvent({
							name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
							metadata: { event_key: trackingEventKey, event_value: 'new_auth_version' }
						});
						onLostIdentity();
					}}
					testId={HELP_AUTH_NEW_IDENTITY_VERSION_BUTTON}
					type="button"
				>
					{$i18n.auth.help.text.new_auth_version}
				</Button>

				<Button
					colorStyle="secondary-light"
					fullWidth
					onclick={() => {
						trackEvent({
							name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
							metadata: {
								event_key: trackingEventKey,
								event_value: 'could_not_enter_identity_number'
							}
						});
						onLostIdentity();
					}}
					testId={HELP_AUTH_COULD_NOT_ENTER_IDENTITY_NUMBER_BUTTON}
					type="button"
				>
					{$i18n.auth.help.text.could_not_enter_identity_number}
				</Button>
			{/if}

			<Button
				colorStyle="secondary-light"
				fullWidth
				onclick={() => {
					trackEvent({
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'lost_identity'
						}
					});
					onLostIdentity();
				}}
				testId={HELP_AUTH_LOST_IDENTITY_BUTTON}
				type="button"
			>
				{$i18n.auth.help.text.lost_identity}
			</Button>

			<Button
				colorStyle="secondary-light"
				fullWidth
				onclick={() => {
					trackEvent({
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'security'
						}
					});
					onOther();
				}}
				testId={HELP_AUTH_SECURITY_BUTTON}
				type="button"
			>
				{$i18n.auth.help.text.security}
			</Button>

			<Button
				colorStyle="secondary-light"
				fullWidth
				onclick={() => {
					trackEvent({
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'got_confused'
						}
					});
					onOther();
				}}
				testId={HELP_AUTH_GOT_CONFUSED_BUTTON}
				type="button"
			>
				{$i18n.auth.help.text.got_confused}
			</Button>

			{#if isPrimaryIdentityVersion2}
				<Button
					colorStyle="secondary-light"
					fullWidth
					onclick={() => {
						trackEvent({
							name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
							metadata: {
								event_key: trackingEventKey,
								event_value: 'no_signup_needed'
							}
						});
						onLostIdentity();
					}}
					testId={HELP_AUTH_NO_SIGN_UP_NEEDED_BUTTON}
					type="button"
				>
					{$i18n.auth.help.text.no_signup_needed}
				</Button>
			{/if}

			<Button
				colorStyle="secondary-light"
				fullWidth
				onclick={() => {
					trackEvent({
						name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
						metadata: {
							event_key: trackingEventKey,
							event_value: 'other'
						}
					});
					onOther();
				}}
				testId={HELP_AUTH_OTHER_BUTTON}
				type="button">{$i18n.auth.help.text.other}</Button
			>
		</div>
	</div>

	<div class="mb-6">
		<i class="block">{replaceOisyPlaceholders($i18n.auth.help.text.feedback_text)}</i>
		<i class="block">{$i18n.auth.help.text.thanks_text}</i>
	</div>
</div>
