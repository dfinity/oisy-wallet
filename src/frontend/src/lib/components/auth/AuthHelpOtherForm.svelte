<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
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
				styleClass="font-semibold flex flex-row-reverse"
				ariaLabel={replaceOisyPlaceholders($i18n.auth.help.alt.other_introduction)}
				href=""
			>
				{replaceOisyPlaceholders($i18n.auth.help.text.other_introduction)}
			</ExternalLink>
		</p>
		<p>
			<ExternalLink
				styleClass="font-semibold flex flex-row-reverse"
				ariaLabel={replaceOisyPlaceholders($i18n.auth.help.alt.other_docs)}
				href=""
			>
				{replaceOisyPlaceholders($i18n.auth.help.text.other_docs)}
			</ExternalLink>
		</p>
		<p>
			<ExternalLink
				styleClass="font-semibold flex flex-row-reverse"
				ariaLabel={$i18n.auth.help.alt.other_private_key}
				href=""
			>
				{$i18n.auth.help.text.other_private_key}
			</ExternalLink>
		</p>
		<p class="mb-0">
			<ExternalLink
				styleClass="font-semibold flex flex-row-reverse"
				ariaLabel={replaceOisyPlaceholders($i18n.auth.help.alt.other_asset_control)}
				href=""
			>
				{replaceOisyPlaceholders($i18n.auth.help.text.other_asset_control)}
			</ExternalLink>
		</p>
	</div>

	<ButtonGroup slot="toolbar">
		<ButtonBack on:click={onBack} />
		<ButtonDone on:click={onDone} />
	</ButtonGroup>
</ContentWithToolbar>
