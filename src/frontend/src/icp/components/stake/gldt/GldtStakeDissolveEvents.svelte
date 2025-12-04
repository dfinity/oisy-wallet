<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import GldtStakeDissolveEvent from '$icp/components/stake/gldt/GldtStakeDissolveEvent.svelte';
	import { withdrawGldtStakingDissolvedTokens } from '$icp/services/gldt-stake.services';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import type { IcToken } from '$icp/types/ic-token';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		TRACK_COUNT_WITHDRAW_ERROR,
		TRACK_COUNT_WITHDRAW_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { STAKE_DISSOLVE_EVENTS_WITHDRAW_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';

	interface Props {
		gldtToken?: IcToken;
	}

	let { gldtToken }: Props = $props();

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	let sortedEvents = $derived(
		($gldtStakeStore?.position?.dissolve_events ?? []).sort((a, b) =>
			Number(a.dissolved_date - b.dissolved_date)
		)
	);

	let withdrawButtonEnabled = $derived(
		($gldtStakeStore?.position?.dissolve_events ?? []).some(
			({ dissolved_date }) => Number(dissolved_date) <= Date.now()
		)
	);

	let loading = $state(false);

	const onWithdraw = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		try {
			loading = true;

			const withdrawCompleted = () => {
				trackEvent({
					name: TRACK_COUNT_WITHDRAW_SUCCESS,
					metadata: {
						token: 'GLDT'
					}
				});
			};

			const result = await withdrawGldtStakingDissolvedTokens({
				identity: $authIdentity,
				withdrawCompleted
			});

			gldtStakeStore.setPosition(result);

			toastsShow({
				text: $i18n.stake.text.withdraw_successful,
				level: 'success',
				duration: 2000
			});
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_WITHDRAW_ERROR,
				metadata: {
					token: 'GLDT'
				}
			});

			toastsError({
				msg: { text: $i18n.stake.error.unexpected_error_on_withdraw },
				err
			});
		}

		loading = false;
	};
</script>

{#if nonNullish(gldtToken) && sortedEvents.length > 0}
	<StakeContentSection>
		{#snippet title()}
			<h4>{$i18n.stake.text.unlock_requests}</h4>
		{/snippet}

		{#snippet action()}
			<Button
				colorStyle="success"
				disabled={!withdrawButtonEnabled}
				{loading}
				onclick={onWithdraw}
				paddingSmall
				testId={STAKE_DISSOLVE_EVENTS_WITHDRAW_BUTTON}
			>
				{$i18n.stake.text.withdraw}
			</Button>
		{/snippet}

		{#snippet content()}
			<div class="mt-4">
				{#each sortedEvents as event, index (index)}
					<GldtStakeDissolveEvent {event} {gldtToken} />
				{/each}
			</div>
		{/snippet}
	</StakeContentSection>
{/if}
