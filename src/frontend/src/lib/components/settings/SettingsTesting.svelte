<script lang="ts">
	import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { toastsShow } from '$lib/stores/toasts.store';
	import {
		parseSimulatedSymbols,
		simulatedFailuresStore,
		simulatedSummary,
		unknownSimulatedSymbols
	} from '$lib/utils/simulated-canister-failures.utils';

	// QA harness - DO NOT MERGE. Deliberately not translated: the section never reaches a user.

	let indexSymbols = $state($simulatedFailuresStore.indexSymbols.join(', '));
	let ledgerSymbols = $state($simulatedFailuresStore.ledgerSymbols.join(', '));

	const apply = () => {
		const failures = {
			indexSymbols: parseSimulatedSymbols(indexSymbols),
			ledgerSymbols: parseSimulatedSymbols(ledgerSymbols)
		};

		simulatedFailuresStore.set(failures);

		// Warn rather than block: a symbol that matches no enabled token simply never fires, and the
		// tester should see that rather than wonder why nothing happens.
		const unknown = unknownSimulatedSymbols({
			symbols: [...failures.indexSymbols, ...failures.ledgerSymbols],
			tokens: $enabledIcrcTokens
		});

		const summary = simulatedSummary(failures);

		toastsShow({
			text:
				unknown.length > 0
					? `Not an enabled ICRC token: ${unknown.join(', ')}. Now simulating: ${summary === '' ? 'nothing' : summary}`
					: summary === ''
						? 'Simulated failures cleared - takes effect on the next 30s cycle.'
						: `Simulating a failure for ${summary} - takes effect on the next 30s cycle.`,
			level: unknown.length > 0 ? 'warn' : 'success',
			duration: 5000
		});
	};
</script>

<SettingsCard>
	{#snippet title()}Testing{/snippet}

	<SettingsCardItem permanentInfo>
		{#snippet key()}
			Failing index canisters
		{/snippet}

		{#snippet value()}
			<InputText
				name="simulated-index-failures"
				placeholder="GLDT, PANDA"
				required={false}
				bind:value={indexSymbols}
			/>
		{/snippet}

		{#snippet info()}
			Comma-separated symbols of enabled ICRC tokens whose index canister should stop responding.
			Balances keep updating, the transactions already loaded stay, and the Activity warning appears
			after 3 consecutive failures.
		{/snippet}
	</SettingsCardItem>

	<SettingsCardItem permanentInfo>
		{#snippet key()}
			Failing ledger canisters
		{/snippet}

		{#snippet value()}
			<InputText
				name="simulated-ledger-failures"
				placeholder="GLDT, PANDA"
				required={false}
				bind:value={ledgerSymbols}
			/>
		{/snippet}

		{#snippet info()}
			Same, for the ledger canister. A ledger failure is fatal for the sync: the balance is dropped,
			while the transactions already loaded stay.
		{/snippet}
	</SettingsCardItem>

	<SettingsCardItem permanentInfo>
		{#snippet key()}{/snippet}

		{#snippet value()}
			<Button onclick={apply}>Apply</Button>
		{/snippet}

		{#snippet info()}
			Applies on the next 30s wallet cycle - no reload needed, and it survives one. Empty both
			fields and apply to stop simulating.
		{/snippet}
	</SettingsCardItem>
</SettingsCard>
