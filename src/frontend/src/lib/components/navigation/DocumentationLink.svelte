<script lang="ts">
	import IconBook from '$lib/components/icons/IconBook.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

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
