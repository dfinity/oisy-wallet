<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import helpAuthIdentityBanner from '$lib/assets/help-auth-identity-banner.svg';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { TRACK_COUNT_LEGACY_SIGN_IN_CLICK } from '$lib/constants/analytics.contants';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import { HELP_AUTH_IDENTITY_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let onBack: () => void;
	export let onDone: () => void;

	const onLegacySignIn = async () => {
		await trackEvent({
			name: TRACK_COUNT_LEGACY_SIGN_IN_CLICK
		});

		onDone();
		await signIn({ domain: 'ic0.app' });
	};
</script>

<ContentWithToolbar>
	<div class="grid gap-6">
		<Img
			src={helpAuthIdentityBanner}
			styleClass="w-full"
			testId={HELP_AUTH_IDENTITY_IMAGE_BANNER}
		/>

		<div>
			<p>
				<Html text={replaceOisyPlaceholders($i18n.auth.help.text.identity_new_identity)} />
			</p>
			<p>
				{$i18n.auth.help.text.identity_legacy_description}
			</p>
			<p>
				<Button link on:click={onLegacySignIn}
					>{$i18n.auth.help.text.identity_legacy_sign_in}</Button
				>
			</p>
			<p class="mb-0">
				<ExternalLink
					styleClass="font-semibold flex flex-row-reverse"
					ariaLabel={$i18n.auth.help.alt.identity_learn_more}
					href={OISY_DOCS_URL}
				>
					{replaceOisyPlaceholders($i18n.auth.help.text.identity_learn_more)}
				</ExternalLink>
			</p>
		</div>
	</div>

	<ButtonGroup slot="toolbar">
		<ButtonBack on:click={onBack} />
		<ButtonDone on:click={onDone} />
	</ButtonGroup>
</ContentWithToolbar>
