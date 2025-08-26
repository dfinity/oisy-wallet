<script lang="ts">
	import { MinterAlreadyProcessingError, MinterNoNewUtxosError } from '@dfinity/ckbtc';
	import { IconReimbursed, Modal } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { blur } from 'svelte/transition';
	import IcTransactionsBitcoinStatus from '$icp/components/transactions/IcTransactionsBitcoinStatusProgress.svelte';
	import { tokenAsIcToken } from '$icp/derived/ic-token.derived';
	import { updateBalance } from '$icp/services/ckbtc.services';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalReceiveBitcoin } from '$lib/derived/modal.derived';
	import { ProgressStepsUpdateBalanceCkBtc } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { token } from '$lib/stores/token.store';
	import type { SyncState } from '$lib/types/sync';

	let receiveProgressStep: string | undefined = undefined;

	const modalId = Symbol();

	const receive = async () => {
		if (isNullish($token)) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_undefined }
			});
			return;
		}

		receiveProgressStep = ProgressStepsUpdateBalanceCkBtc.INITIALIZATION;

		modalStore.openReceiveBitcoin(modalId);

		try {
			await updateBalance({
				token: $tokenAsIcToken,
				identity: $authIdentity,
				progress: (step: ProgressStepsUpdateBalanceCkBtc) => (receiveProgressStep = step)
			});

			receiveProgressStep = ProgressStepsUpdateBalanceCkBtc.DONE;

			setTimeout(() => modalStore.close(), 750);
		} catch (err: unknown) {
			if (err instanceof MinterNoNewUtxosError) {
				toastsShow({
					text: $i18n.receive.bitcoin.info.no_new_btc,
					level: 'info',
					duration: 2000
				});

				modalStore.close();
				return;
			}

			if (err instanceof MinterAlreadyProcessingError) {
				toastsShow({
					text: $i18n.receive.bitcoin.info.check_btc_progress,
					level: 'info',
					duration: 2000
				});

				modalStore.close();
				return;
			}

			toastsError({
				msg: { text: $i18n.receive.bitcoin.error.unexpected_btc },
				err
			});

			modalStore.close();
		}
	};

	let ckBtcUpdateBalanceSyncState: SyncState | undefined = undefined;
	const debounceUpdateSyncState = debounce(
		(state: SyncState) => (ckBtcUpdateBalanceSyncState = state)
	);
	const onSyncState = ({ detail: state }: CustomEvent<SyncState>) => debounceUpdateSyncState(state);
</script>

<svelte:window on:oisyCkBtcUpdateBalance={onSyncState} />

{#if nonNullish(ckBtcUpdateBalanceSyncState)}
	{#if ckBtcUpdateBalanceSyncState === 'in_progress'}<div class="animate-pulse text-tertiary">
			<span in:blur>{$i18n.receive.bitcoin.text.checking_status}</span>
		</div>{:else}
		<button
			class="text flex gap-2 border-0 text-brand-primary hover:text-brand-secondary active:text-brand-secondary"
			on:click={async () => await receive()}
			in:blur><IconReimbursed size="24" /> {$i18n.core.text.refresh}</button
		>
	{/if}
{/if}

{#if $modalReceiveBitcoin}
	<Modal disablePointerEvents={true} on:nnsClose={modalStore.close}>
		<svelte:fragment slot="title">{$i18n.receive.bitcoin.text.refresh_status}</svelte:fragment>

		<div class="stretch">
			<IcTransactionsBitcoinStatus bind:receiveProgressStep />
		</div>
	</Modal>
{/if}
