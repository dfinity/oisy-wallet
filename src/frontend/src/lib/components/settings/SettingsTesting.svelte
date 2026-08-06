<script lang="ts">
	import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { toastsShow } from '$lib/stores/toasts.store';
	import {
		getSimulatedCanisterFailures,
		resolveSimulatedCanisterIds,
		setSimulatedCanisterFailures,
		type SimulatedCanisterKind
	} from '$lib/utils/simulated-canister-failures.utils';

	// QA harness - DO NOT MERGE. Deliberately not translated: the section never reaches a user.

	let indexSymbols = $state('');
	let ledgerSymbols = $state('');
	let saving = $state(false);

	const symbolsOf = ({
		canisterIds,
		kind
	}: {
		canisterIds: string[];
		kind: SimulatedCanisterKind;
	}): string =>
		$enabledIcrcTokens
			.filter(({ ledgerCanisterId, indexCanisterId }) =>
				canisterIds.includes((kind === 'index' ? indexCanisterId : ledgerCanisterId) ?? '')
			)
			.map(({ symbol }) => symbol)
			.join(', ');

	// Show what is currently simulated, so a reload does not hide a switch left on. Once only: the
	// token list refreshes on its own, and re-running this would wipe what the tester is typing.
	let prefilled = false;

	$effect(() => {
		const tokens = $enabledIcrcTokens;

		if (prefilled || tokens.length === 0) {
			return;
		}

		prefilled = true;

		void (async () => {
			const { indexCanisterIds, ledgerCanisterIds } = await getSimulatedCanisterFailures();

			// Never clobber something typed while this was loading.
			if (indexSymbols === '') {
				indexSymbols = symbolsOf({ canisterIds: indexCanisterIds, kind: 'index' });
			}

			if (ledgerSymbols === '') {
				ledgerSymbols = symbolsOf({ canisterIds: ledgerCanisterIds, kind: 'ledger' });
			}
		})();
	});

	const save = async () => {
		saving = true;

		try {
			const index = resolveSimulatedCanisterIds({
				symbols: indexSymbols,
				tokens: $enabledIcrcTokens,
				kind: 'index'
			});

			const ledger = resolveSimulatedCanisterIds({
				symbols: ledgerSymbols,
				tokens: $enabledIcrcTokens,
				kind: 'ledger'
			});

			await setSimulatedCanisterFailures({
				indexCanisterIds: index.canisterIds,
				ledgerCanisterIds: ledger.canisterIds
			});

			const unknownSymbols = [...index.unknownSymbols, ...ledger.unknownSymbols];

			const failing = [
				...index.matchedSymbols.map((symbol) => `${symbol} (index)`),
				...ledger.matchedSymbols.map((symbol) => `${symbol} (ledger)`)
			];

			toastsShow({
				text:
					unknownSymbols.length > 0
						? `Not an enabled ICRC token (or no index canister): ${unknownSymbols.join(', ')}`
						: failing.length > 0
							? `Simulating a failure for ${failing.join(', ')} - takes effect on the next 30s cycle.`
							: 'Simulated failures cleared - takes effect on the next 30s cycle.',
				level: unknownSymbols.length > 0 ? 'warn' : 'success',
				duration: 5000
			});
		} finally {
			saving = false;
		}
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
				disabled={saving}
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
				disabled={saving}
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
			<Button disabled={saving} onclick={save}>Apply</Button>
		{/snippet}

		{#snippet info()}
			Applies within one 30s wallet cycle - no reload needed. Empty both fields and apply to stop
			simulating.
		{/snippet}
	</SettingsCardItem>
</SettingsCard>
