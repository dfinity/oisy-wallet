<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import {
		OISY_ACCESS_CONTROL_URL,
		OISY_DOCS_URL,
		OISY_FAQ_URL,
		OISY_INTERNET_IDENTITY_URL
	} from '$lib/constants/oisy.constants';
	import {
		HELP_AUTH_ASSET_CONTROL_LINK,
		HELP_AUTH_BACK_BUTTON,
		HELP_AUTH_DOCS_LINK,
		HELP_AUTH_DONE_BUTTON,
		HELP_AUTH_INTRODUCTION_LINK,
		HELP_AUTH_PRIVATE_KEY_LINK
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let onBack: () => void;
	export let onDone: () => void;
</script>

<ContentWithToolbar>
	<div>
		<p>
			<span class="text-lg font-bold">{$i18n.auth.help.text.other_title}</span>
		</p>
		<p>
			<Html text={replaceOisyPlaceholders($i18n.auth.help.text.other_description)} />
		</p>
		<p>
			<ExternalLink
				ariaLabel={replaceOisyPlaceholders($i18n.auth.help.alt.other_introduction)}
				href={OISY_DOCS_URL}
				iconAsLast
				styleClass="font-semibold"
				testId={HELP_AUTH_INTRODUCTION_LINK}
			>
				{replaceOisyPlaceholders($i18n.auth.help.text.other_introduction)}
			</ExternalLink>
		</p>
		<p>
			<ExternalLink
				ariaLabel={replaceOisyPlaceholders($i18n.auth.help.alt.other_docs)}
				href={OISY_INTERNET_IDENTITY_URL}
				iconAsLast
				styleClass="font-semibold"
				testId={HELP_AUTH_DOCS_LINK}
			>
				{replaceOisyPlaceholders($i18n.auth.help.text.other_docs)}
			</ExternalLink>
		</p>
		<p>
			<ExternalLink
				ariaLabel={$i18n.auth.help.alt.other_private_key}
				href={OISY_FAQ_URL}
				iconAsLast
				styleClass="font-semibold"
				testId={HELP_AUTH_PRIVATE_KEY_LINK}
			>
				{$i18n.auth.help.text.other_private_key}
			</ExternalLink>
		</p>
		<p class="mb-0">
			<ExternalLink
				ariaLabel={replaceOisyPlaceholders($i18n.auth.help.alt.other_asset_control)}
				href={OISY_ACCESS_CONTROL_URL}
				iconAsLast
				styleClass="font-semibold"
				testId={HELP_AUTH_ASSET_CONTROL_LINK}
			>
				{replaceOisyPlaceholders($i18n.auth.help.text.other_asset_control)}
			</ExternalLink>
		</p>
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onBack} testId={HELP_AUTH_BACK_BUTTON} />
			<ButtonDone onclick={onDone} testId={HELP_AUTH_DONE_BUTTON} />
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
