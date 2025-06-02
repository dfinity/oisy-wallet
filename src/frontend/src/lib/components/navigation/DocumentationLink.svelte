<script lang="ts">
	import IconBook from '$lib/components/icons/IconBook.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		asMenuItem?: boolean;
		asMenuItemCondensed?: boolean;
		shortTextOnMobile?: boolean;
	}

	// We display an alternative "Docs" text instead of "Documentation" to avoid design breaks on small screens
	let {
		asMenuItem = false,
		asMenuItemCondensed = false,
		shortTextOnMobile = false
	}: Props = $props();
</script>

<ExternalLink
	{asMenuItem}
	{asMenuItemCondensed}
	href={OISY_DOCS_URL}
	ariaLabel={replaceOisyPlaceholders($i18n.navigation.alt.documentation)}
	iconVisible={false}
	styleClass={asMenuItem ? '' : 'font-bold'}
>
	{#if asMenuItem}
		<IconBook />
	{/if}
	<span class:hidden={shortTextOnMobile} class:md:inline={shortTextOnMobile}
		>{replaceOisyPlaceholders($i18n.navigation.text.documentation)}</span
	>
	<span class="hidden" class:inline={shortTextOnMobile} class:md:hidden={shortTextOnMobile}
		>{replaceOisyPlaceholders($i18n.navigation.short.documentation)}</span
	>
</ExternalLink>
