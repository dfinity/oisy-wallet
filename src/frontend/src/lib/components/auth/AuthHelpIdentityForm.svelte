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
	import { OISY_FIND_INTERNET_IDENTITY_URL } from '$lib/constants/oisy.constants';
	import {
		HELP_AUTH_BACK_BUTTON,
		HELP_AUTH_DONE_BUTTON,
		HELP_AUTH_IDENTITY_IMAGE_BANNER,
		HELP_AUTH_LEARN_MORE_LINK,
		HELP_AUTH_LEGACY_SIGN_IN_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let onBack: () => void;
	export let onDone: () => void;
	export let hideBack = false;

	const onLegacySignIn = async () => {
		onDone();

		await signIn({ domain: 'ic0.app', i18n: $i18n });
	};
</script>

<ContentWithToolbar>
	<div class="grid gap-6">
		<Img
			alt={$i18n.auth.help.alt.internet_identity}
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
				<Button link onclick={onLegacySignIn} testId={HELP_AUTH_LEGACY_SIGN_IN_BUTTON}
					>{$i18n.auth.help.text.identity_legacy_sign_in}</Button
				>
			</p>
			<p class="mb-0">
				<ExternalLink
					ariaLabel={$i18n.auth.help.alt.identity_learn_more}
					href={OISY_FIND_INTERNET_IDENTITY_URL}
					iconAsLast
					styleClass="font-semibold"
					testId={HELP_AUTH_LEARN_MORE_LINK}
				>
					{replaceOisyPlaceholders($i18n.auth.help.text.identity_learn_more)}
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
