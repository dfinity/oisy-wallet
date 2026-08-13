<script lang="ts">
	import { goto } from '$app/navigation';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { PLUG_IMPORT_SETTINGS_LINK } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<SettingsCard>
	{#snippet title()}{$i18n.plug_import.text.settings_entry}{/snippet}

	<SettingsCardItem permanentInfo>
		{#snippet key()}
			{$i18n.plug_import.text.settings_entry}
		{/snippet}

		{#snippet value()}
			<Button
				colorStyle="secondary-light"
				onclick={() => void goto(AppPath.PlugImport)}
				paddingSmall
				testId={PLUG_IMPORT_SETTINGS_LINK}
				type="button"
			>
				{$i18n.plug_import.text.settings_open}
			</Button>
		{/snippet}

		{#snippet info()}
			{$i18n.plug_import.text.settings_entry_description}
		{/snippet}
	</SettingsCardItem>
</SettingsCard>
