<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import helpAuthLegacyIdentityBanner from '$lib/assets/help-auth-legacy-identity-banner.webp';
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
		HELP_AUTH_LEARN_MORE_LINK
	} from '$lib/constants/test-ids.constants';
	import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onBack: () => void;
		onDone: () => void;
		hideBack?: boolean;
	}

	let { onBack, onDone, hideBack = false }: Props = $props();
</script>

<ContentWithToolbar>
	<Img
		alt={$i18n.auth.help.alt.internet_identity}
		src={helpAuthLegacyIdentityBanner}
		styleClass="w-full mb-5 rounded-xl"
		testId={HELP_AUTH_IDENTITY_IMAGE_BANNER}
	/>

	<div>
		<p>
			{$i18n.auth.help.text.identity_legacy_identity_title}
		</p>

		<ul class="mb-5 list-disc pl-8">
			<li><Html text={$i18n.auth.help.text.identity_legacy_identity_item_1} /></li>
			<li>{$i18n.auth.help.text.identity_legacy_identity_item_2}</li>
		</ul>

		<p class="mb-0">
			<ExternalLink
				ariaLabel={$i18n.auth.help.text.identity_learn_more}
				href={OISY_FIND_INTERNET_IDENTITY_URL}
				iconAsLast
				styleClass="font-semibold"
				testId={HELP_AUTH_LEARN_MORE_LINK}
				trackEvent={{
					name: PLAUSIBLE_EVENTS.SIGN_IN_CANCELLED_HELP,
					metadata: {
						event_key: 'main_page_button',
						event_value: 'identity_learn_more'
					}
				}}
			>
				{replaceOisyPlaceholders($i18n.auth.help.text.identity_learn_more)}
			</ExternalLink>
		</p>
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
