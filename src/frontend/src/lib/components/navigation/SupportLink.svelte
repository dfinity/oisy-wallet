<script lang="ts">
	import IconHelp from '$lib/components/icons/lucide/IconHelp.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_SUPPORT_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		asMenuItem?: boolean;
		asMenuItemCondensed?: boolean;
		testId?: string;
	}

	const { asMenuItem = false, asMenuItemCondensed = false, testId }: Props = $props();
</script>

<ExternalLink
	ariaLabel={replaceOisyPlaceholders($i18n.navigation.alt.support)}
	{asMenuItem}
	{asMenuItemCondensed}
	href={OISY_SUPPORT_URL}
	iconVisible={false}
	styleClass={asMenuItem ? '' : 'font-bold'}
	{testId}
>
	<IconHelp />
	{replaceOisyPlaceholders($i18n.navigation.text.support)}
</ExternalLink>
