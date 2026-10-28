<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { CANISTER_TOP_UP_ENABLED } from '$env/canister-top-up.env';
	import { getCanisterExistence } from '$icp/api/canister-state.api';
	import CyclesTopUpCanisterTabs from '$icp/components/cycles-top-up/CyclesTopUpCanisterTabs.svelte';
	import CyclesTopUpRecentCanisters from '$icp/components/cycles-top-up/CyclesTopUpRecentCanisters.svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import { parseCanisterId } from '$icp/utils/cycles-top-up.utils';
	import { isIcrcAddress } from '$icp/utils/icrc-account.utils';
	import { isTokenIcp } from '$icp/utils/icrc.utils';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
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
	import { fade } from '$lib/utils/transitions.utils';

	interface Props {
		canisterIdText: string;
		// What the top-up is paid with: TCYCLES, or ICP.
		token: IcToken;
		// The TCYCLES token, whose history lists the canisters topped up before. Absent while
		// TCYCLES is not enabled.
		cyclesToken?: IcToken;
		// Back to the token picker, when there was a choice to make; Cancel otherwise.
		onBack?: () => void;
		onCancel: () => void;
		onNext: () => void;
	}

	let {
		canisterIdText = $bindable(''),
		token,
		cyclesToken,
		onBack,
		onCancel,
		onNext
	}: Props = $props();

	let paidWithIcp = $derived(isTokenIcp(token));

	let canisterId = $derived(parseCanisterId(canisterIdText));

	// A complete principal or account that is not a canister ID is flagged at once, however
	// short (`aaaaa-aa`, `2vxsx-fae`). Other text only once it is too long to be still typing.
	let invalid = $derived(
		isNullish(canisterId) &&
			(canisterIdText.trim().length > MIN_DESTINATION_LENGTH_FOR_ERROR_STATE ||
				isIcrcAddress(canisterIdText.trim()))
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

	// Checks are numbered, so only the latest one acts on its answer: picking another recently
	// topped-up canister starts a new check while one may still be running.
	let latestCheck = 0;

	// Only an existing canister can take cycles: a top-up to an ID with nothing behind it is
	// refunded minus the ledger's fees. A canister without code is fine.
	const next = async () => {
		if (isNullish(canisterId) || isNullish($authIdentity)) {
			return;
		}

		const checkedText = canisterIdText;

		latestCheck += 1;

		const thisCheck = latestCheck;

		checking = true;

		const existence = await getCanisterExistence({ identity: $authIdentity, canisterId });

		if (thisCheck !== latestCheck) {
			return;
		}

		checking = false;

		// The ID was edited or reset while it was checked, so the answer is not about it.
		if (checkedText !== canisterIdText) {
			return;
		}

		if (existence === 'exists') {
			check = undefined;
			onNext();
			return;
		}

		check = { canisterIdText: checkedText, existence };
	};

	const select = async (selected: string) => {
		canisterIdText = selected;

		await next();
	};
</script>

<ContentWithToolbar testId={CYCLES_TOP_UP_CANISTER}>
	<p class="mb-4 text-sm text-tertiary">
		{replacePlaceholders(
			paidWithIcp ? $i18n.cycles_top_up.text.description_icp : $i18n.cycles_top_up.text.description,
			{ $token: token.symbol }
		)}
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
	{#if CANISTER_TOP_UP_ENABLED}
		<CyclesTopUpCanisterTabs onSelect={select} {paidWithIcp} token={cyclesToken} />
	{:else if nonNullish(cyclesToken)}
		<CyclesTopUpRecentCanisters onSelect={select} token={cyclesToken} />
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			{#if nonNullish(onBack)}
				<ButtonBack onclick={onBack} />
			{:else}
				<ButtonCancel onclick={onCancel} />
			{/if}

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
