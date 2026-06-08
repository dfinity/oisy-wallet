<script lang="ts">
	import LanguageDropdown from '$lib/components/core/LanguageDropdown.svelte';
	import CurrencyDropdown from '$lib/components/currency/CurrencyDropdown.svelte';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<SettingsCard>
	{#snippet title()}{$i18n.settings.text.preferences}{/snippet}

	<SettingsCardItem>
		{#snippet key()}{$i18n.core.text.language}{/snippet}
		{#snippet value()}<LanguageDropdown />{/snippet}
	</SettingsCardItem>

	<SettingsCardItem>
		{#snippet key()}{$i18n.core.text.currency}{/snippet}
		{#snippet value()}<CurrencyDropdown />{/snippet}
	</SettingsCardItem>
</SettingsCard>
