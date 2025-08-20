<script lang="ts">
	import helpAuthBanner from '$lib/assets/help-auth-banner.svg';
	import IconAnnoyed from '$lib/components/icons/lucide/IconAnnoyed.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		TRACK_HELP_CONCERNED_ABOUT_SECURITY,
		TRACK_HELP_GOT_CONFUSED,
		TRACK_HELP_LOST_INTERNET_IDENTITY,
		TRACK_HELP_OTHER
	} from '$lib/constants/analytics.contants';
	import {
		HELP_AUTH_GOT_CONFUSED_BUTTON,
		HELP_AUTH_IMAGE_BANNER,
		HELP_AUTH_LOST_IDENTITY_BUTTON,
		HELP_AUTH_OTHER_BUTTON,
		HELP_AUTH_SECURITY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';

	export let onLostIdentity: () => void;
	export let onOther: () => void;
</script>

<div class="grid gap-6">
	<Img src={helpAuthBanner} styleClass="w-full" testId={HELP_AUTH_IMAGE_BANNER} />

	<span>{$i18n.auth.help.text.description}</span>

	<div>
		<p class="text-md font-bold">{$i18n.auth.help.text.subtitle}</p>
		<div class="grid gap-2">
			<Button
				colorStyle="secondary"
				fullWidth
				onclick={() => {
					trackEvent({
						name: TRACK_HELP_LOST_INTERNET_IDENTITY
					});
					onLostIdentity();
				}}
				testId={HELP_AUTH_LOST_IDENTITY_BUTTON}
				type="button"
			>
				<span class="text-error-primary"><IconClose size="24" /></span>{$i18n.auth.help.text
					.lost_identity}
			</Button>

			<Button
				colorStyle="secondary"
				fullWidth
				onclick={() => {
					trackEvent({
						name: TRACK_HELP_CONCERNED_ABOUT_SECURITY
					});
					onOther();
				}}
				testId={HELP_AUTH_SECURITY_BUTTON}
				type="button"
			>
				<span class="text-error-primary"><IconShieldCheck /></span>{$i18n.auth.help.text.security}
			</Button>

			<Button
				colorStyle="secondary"
				fullWidth
				onclick={() => {
					trackEvent({
						name: TRACK_HELP_GOT_CONFUSED
					});
					onOther();
				}}
				testId={HELP_AUTH_GOT_CONFUSED_BUTTON}
				type="button"
			>
				<span class="text-error-primary"><IconAnnoyed /></span>{$i18n.auth.help.text.got_confused}
			</Button>

			<Button
				colorStyle="secondary"
				fullWidth
				onclick={() => {
					trackEvent({
						name: TRACK_HELP_OTHER
					});
					onOther();
				}}
				testId={HELP_AUTH_OTHER_BUTTON}
				type="button">{$i18n.auth.help.text.other}</Button
			>
		</div>
	</div>

	<div>
		<i class="block">{$i18n.auth.help.text.feedback_text}</i>
		<i class="block">{$i18n.auth.help.text.thanks_text}</i>
	</div>
</div>
