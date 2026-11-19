<script lang="ts">
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { TOOLS_CANISTER_TOP_UP_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const modalId = Symbol();
</script>

<SettingsCard>
	{#snippet title()}{$i18n.cycles_top_up.text.canister_top_up}{/snippet}

	<SettingsCardItem>
		{#snippet key()}
			{$i18n.tools.text.top_up_canister}
		{/snippet}

		{#snippet value()}
			<Button
				ariaLabel={$i18n.tools.text.top_up_canister}
				link
				onclick={() => modalStore.openCanisterTopUp(modalId)}
				testId={TOOLS_CANISTER_TOP_UP_BUTTON}>{$i18n.cycles_top_up.text.top_up} ></Button
			>
		{/snippet}
	</SettingsCardItem>
</SettingsCard>
