<script lang="ts">
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import IconBook from '$lib/components/icons/IconBook.svelte';

	export let asMenuItem = false;
	export let asMenuItemCondensed = false;
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
	{replaceOisyPlaceholders($i18n.navigation.text.documentation)}
</ExternalLink>
