<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { getCanisterExistence } from '$icp/api/canister-state.api';
	import CyclesTopUpRecentCanisters from '$icp/components/cycles-top-up/CyclesTopUpRecentCanisters.svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import { parseCanisterId } from '$icp/utils/cycles-top-up.utils';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonReset from '$lib/components/ui/ButtonReset.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { MIN_DESTINATION_LENGTH_FOR_ERROR_STATE } from '$lib/constants/app.constants';
	import {
		CYCLES_TOP_UP_CANISTER,
		CYCLES_TOP_UP_CANISTER_INPUT,
		CYCLES_TOP_UP_CANISTER_NEXT_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isDesktop } from '$lib/utils/device.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		canisterIdText: string;
		// The page's TCYCLES token.
		token: IcToken;
		onCancel: () => void;
		onNext: () => void;
	}

	let { canisterIdText = $bindable(''), token, onCancel, onNext }: Props = $props();

	let canisterId = $derived(parseCanisterId(canisterIdText));

	let invalid = $derived(
		isNullish(canisterId) && canisterIdText.trim().length > MIN_DESTINATION_LENGTH_FOR_ERROR_STATE
	);

	// The outcome of the last existence check, cleared as soon as the ID changes. A check that
	// could not be made can be made again with the same ID; a canister that does not exist
	// cannot be topped up.
	let check = $state<{ canisterIdText: string; existence: 'not_found' | 'unknown' } | undefined>();

	let checkFailure = $derived(
		check?.canisterIdText === canisterIdText ? check.existence : undefined
	);

	let checking = $state(false);

	let errorMessage = $derived(
		invalid
			? $i18n.cycles_top_up.error.invalid_canister_id
			: checkFailure === 'not_found'
				? $i18n.cycles_top_up.error.canister_not_found
				: checkFailure === 'unknown'
					? $i18n.cycles_top_up.error.canister_check_failed
					: undefined
	);

	let inputElement = $state<HTMLInputElement | undefined>();

	// Only an existing canister can take cycles: a top-up to an ID with nothing behind it is
	// refunded minus the ledger's fees. A canister without code is fine.
	const next = async () => {
		if (isNullish(canisterId) || isNullish($authIdentity)) {
			return;
		}

		const checkedText = canisterIdText;

		checking = true;

		const existence = await getCanisterExistence({ identity: $authIdentity, canisterId });

		checking = false;

		if (existence === 'exists') {
			check = undefined;
			onNext();
			return;
		}

		check = { canisterIdText: checkedText, existence };
	};
</script>

<ContentWithToolbar testId={CYCLES_TOP_UP_CANISTER}>
	<p class="mb-4 text-sm text-tertiary">
		{replacePlaceholders($i18n.cycles_top_up.text.description, { $token: token.symbol })}
	</p>

	<div class="rounded-lg border border-solid border-secondary bg-secondary p-5 text-left">
		<label class="font-bold" for="canister-id">{$i18n.tokens.import.text.canister_id}</label>

		<InputTextWithAction
			name="canister-id"
			autofocus={isDesktop()}
			placeholder={$i18n.cycles_top_up.text.canister_id_placeholder}
			testId={CYCLES_TOP_UP_CANISTER_INPUT}
			bind:value={canisterIdText}
			bind:inputElement
		>
			{#snippet innerEnd()}
				{#if notEmptyString(canisterIdText)}
					<ButtonReset
						onclick={() => {
							canisterIdText = '';
							inputElement?.focus();
						}}
					/>
				{/if}
			{/snippet}
		</InputTextWithAction>
	</div>

	{#if nonNullish(errorMessage)}
		<div class="mt-4" in:fade>
			<MessageBox level="error">{errorMessage}</MessageBox>
		</div>
	{/if}

	<!-- As in the send flow, picking a canister goes on, after the same check as Next. -->
	<CyclesTopUpRecentCanisters
		onSelect={async (selected) => {
			canisterIdText = selected;

			await next();
		}}
		{token}
	/>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onCancel} />

			<Button
				disabled={isNullish(canisterId) || checking || checkFailure === 'not_found'}
				loading={checking}
				onclick={next}
				testId={CYCLES_TOP_UP_CANISTER_NEXT_BUTTON}
			>
				{checking ? $i18n.cycles_top_up.text.checking_canister : $i18n.core.text.next}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
