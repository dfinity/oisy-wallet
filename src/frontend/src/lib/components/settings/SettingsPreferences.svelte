<script lang="ts">
	import LanguageDropdown from '$lib/components/core/LanguageDropdown.svelte';
	import CurrencyDropdown from '$lib/components/currency/CurrencyDropdown.svelte';
	import IconDollarSign from '$lib/components/icons/IconDollarSign.svelte';
	import IconWorld from '$lib/components/icons/IconWorld.svelte';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<SettingsCard>
	{#snippet title()}{$i18n.settings.text.preferences}{/snippet}

	<SettingsCardItem>
		{#snippet key()}
			<span class="flex items-center gap-2">
				<IconWorld />
				{$i18n.core.text.language}
			</span>
		{/snippet}
		{#snippet value()}<LanguageDropdown />{/snippet}
	</SettingsCardItem>

	<SettingsCardItem>
		{#snippet key()}
			<span class="flex items-center gap-2">
				<IconDollarSign />
				{$i18n.core.text.currency}
			</span>
		{/snippet}
		{#snippet value()}<CurrencyDropdown />{/snippet}
	</SettingsCardItem>
</SettingsCard>
