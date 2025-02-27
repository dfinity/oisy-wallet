<script lang="ts">
	import IconHelp from '$lib/components/icons/IconHelp.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_SUPPORT_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let asMenuItem = false;
	export let asMenuItemCondensed = false;

	// See comment on onClick property in ExternalLink.svelte
	export let onClick: undefined | ((e: MouseEvent) => void) = undefined;
</script>

<ExternalLink
	{asMenuItem}
	{asMenuItemCondensed}
	href={OISY_SUPPORT_URL}
	ariaLabel={replaceOisyPlaceholders($i18n.navigation.alt.support)}
	iconVisible={false}
	styleClass={asMenuItem ? '' : 'font-bold'}
	bind:onClick
>
	<IconHelp />
	{replaceOisyPlaceholders($i18n.navigation.text.support)}
</ExternalLink>
