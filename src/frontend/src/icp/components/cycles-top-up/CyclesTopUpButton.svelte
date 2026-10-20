<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import CyclesTopUpModal from '$icp/components/cycles-top-up/CyclesTopUpModal.svelte';
	import { unansweredCyclesTopUps } from '$icp/stores/cycles-top-up.store';
	import type { IcToken } from '$icp/types/ic-token';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconFuelPump from '$lib/components/icons/IconFuelPump.svelte';
	import { CYCLES_TOP_UP_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalCyclesTopUp } from '$lib/derived/modal.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		// The page's TCYCLES token.
		token: IcToken;
	}

	let { token }: Props = $props();

	// A top-up spends TCYCLES, so it is off whenever Send is, except to resend the signed-in
	// principal's top-up that got no answer: the ledger answers that resend as a duplicate,
	// whatever the balance, if the first one went through, as an empty balance after a Max
	// top-up suggests.
	const { outflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);

	let hasUnanswered = $derived(
		nonNullish($authIdentity) &&
			nonNullish($unansweredCyclesTopUps[$authIdentity.getPrincipal().toText()])
	);

	const modalId = Symbol();
</script>

<ButtonHero
	ariaLabel={$i18n.cycles_top_up.text.title}
	disabled={$isBusy || ($outflowActionsDisabled && !hasUnanswered)}
	onclick={() => modalStore.openCyclesTopUp(modalId)}
	testId={CYCLES_TOP_UP_BUTTON}
>
	{#snippet icon()}
		<IconFuelPump size="24" />
	{/snippet}
	{#snippet label()}
		{$i18n.cycles_top_up.text.top_up}
	{/snippet}
</ButtonHero>

{#if $modalCyclesTopUp && $modalStore?.id === modalId}
	<CyclesTopUpModal {token} />
{/if}
