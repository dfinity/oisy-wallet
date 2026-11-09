<script lang="ts">
	import { page } from '$app/state';
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_EXTENSION_PANEL_ACTIVITY_LIMIT } from '$lib/constants/extension.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<section class="flex flex-col gap-2">
	<div class="flex items-center justify-between gap-2">
		<h2 class="text-base font-bold">{$i18n.activity.text.title}</h2>

		<ExternalLink
			ariaLabel={$i18n.extension.panel.all_activity}
			href={`${page.url.origin}${AppPath.Activity}`}
			iconAsLast
			iconSize="16"
			styleClass="text-sm"
		>
			{$i18n.extension.panel.view_all}
		</ExternalLink>
	</div>

	<AllTransactionsList preview={{ limit: OISY_EXTENSION_PANEL_ACTIVITY_LIMIT }} />
</section>
