<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { checkIcrcLedgerStatus } from '$icp/services/icrc-ledger-status.services';
	import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
	import { icrcUnavailableCustomTokensStore } from '$icp/stores/icrc-unavailable-custom-tokens.store';
	import type { LedgerCanisterIdText } from '$icp/types/canister';
	import type { IcrcLedgerStatus, IcrcUnavailableCustomToken } from '$icp/types/icrc-custom-token';
	import { removeCustomToken } from '$lib/api/backend.api';
	import { deleteIdbIcToken } from '$lib/api/idb-tokens.api';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import BottomSheetConfirmationPopup from '$lib/components/ui/BottomSheetConfirmationPopup.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import {
		HELP_UNAVAILABLE_TOKENS_CARD,
		HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON,
		HELP_UNAVAILABLE_TOKENS_COPY_BUTTON,
		HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON,
		HELP_UNAVAILABLE_TOKENS_STATUS
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { escapeHtml } from '$lib/utils/html.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	let confirmLedgerCanisterId: LedgerCanisterIdText | undefined = $state();

	// Gone once the token is deleted, which closes the confirmation.
	let confirmToken = $derived(
		$icrcUnavailableCustomTokensStore.find(
			({ ledgerCanisterId }) => ledgerCanisterId === confirmLedgerCanisterId
		)
	);

	let deleting = $state(false);

	// What each listed ledger canister answered when this card checked it, once per visit.
	const ledgerStatuses = new SvelteMap<LedgerCanisterIdText, IcrcLedgerStatus | 'checking'>();

	$effect(() => {
		const identity = $authIdentity;

		if (isNullish(identity)) {
			return;
		}

		$icrcUnavailableCustomTokensStore.forEach(({ ledgerCanisterId }) => {
			if (untrack(() => ledgerStatuses.has(ledgerCanisterId))) {
				return;
			}

			ledgerStatuses.set(ledgerCanisterId, 'checking');

			checkIcrcLedgerStatus({ identity, ledgerCanisterId })
				.then((status) => ledgerStatuses.set(ledgerCanisterId, status))
				.catch(() => ledgerStatuses.set(ledgerCanisterId, { status: 'error' }));
		});
	});

	// The name the "not responding" warning uses for the token.
	const tokenName = ({ symbol, ledgerCanisterId }: IcrcUnavailableCustomToken): string =>
		symbol ?? ledgerCanisterId;

	// The name too when it says more than the symbol. A token OISY never listed has neither.
	const tokenLabel = ({ symbol, name }: IcrcUnavailableCustomToken): string | undefined =>
		nonNullish(symbol) && nonNullish(name) && name !== symbol ? `${name} (${symbol})` : symbol;

	const statusText = (status: IcrcLedgerStatus | 'checking'): string => {
		if (status === 'checking') {
			return $i18n.help.text.unavailable_tokens_checking;
		}

		switch (status.status) {
			case 'responding':
				return $i18n.help.text.unavailable_tokens_responding;
			case 'no_ledger':
				return $i18n.help.text.unavailable_tokens_no_ledger;
			case 'not_responding':
				return $i18n.help.text.unavailable_tokens_not_responding;
			case 'error':
				return nonNullish(status.errorCode)
					? `${$i18n.help.text.unavailable_tokens_error} (${status.errorCode})`
					: $i18n.help.text.unavailable_tokens_error;
		}
	};

	const deleteToken = async (token: IcrcUnavailableCustomToken) => {
		if (isNullish($authIdentity)) {
			return;
		}

		deleting = true;

		try {
			await removeCustomToken({ identity: $authIdentity, token: token.customToken });

			// The backend no longer has the token, so both lists drop it before the cache cleanup, which
			// can fail. Like the token page, that includes the main token list: a token whose query
			// answer mapped while its certified answer did not is in it too.
			icrcCustomTokensStore.resetByIdentifier(token.ledgerCanisterId);
			icrcUnavailableCustomTokensStore.remove(token.ledgerCanisterId);

			await deleteIdbIcToken({ identity: $authIdentity, token: token.customToken });

			toastsShow({
				text: replacePlaceholders(
					replaceOisyPlaceholders($i18n.tokens.details.deletion_confirmation),
					{
						$token: tokenName(token)
					}
				),
				level: 'success',
				duration: 2000
			});
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_error_on_token_delete },
				err
			});
		} finally {
			deleting = false;

			confirmLedgerCanisterId = undefined;
		}
	};
</script>

{#snippet ledgerCanisterIdWithCopy(ledgerCanisterId: LedgerCanisterIdText)}
	{ledgerCanisterId}<Copy
		inline
		testId={`${HELP_UNAVAILABLE_TOKENS_COPY_BUTTON}-${ledgerCanisterId}`}
		text={$i18n.tokens.import.text.ledger_canister_id_copied}
		value={ledgerCanisterId}
	/>
{/snippet}

<!-- Only a user with a saved token that OISY skips or cannot load has anything to do here. -->
{#if $icrcUnavailableCustomTokensStore.length > 0}
	<div data-tid={HELP_UNAVAILABLE_TOKENS_CARD}>
		<SettingsCard>
			{#snippet title()}{$i18n.help.text.unavailable_tokens_title}{/snippet}

			<!-- Pulled up to the title it explains: the card's title gap is sized for rows. -->
			<p class="-mt-4 text-sm text-tertiary">
				{replaceOisyPlaceholders($i18n.help.text.unavailable_tokens_description)}
			</p>

			<ul class="flex list-none flex-col">
				{#each $icrcUnavailableCustomTokensStore as token (token.ledgerCanisterId)}
					{@const label = tokenLabel(token)}
					{@const ledgerStatus = ledgerStatuses.get(token.ledgerCanisterId)}

					<li class="mt-3">
						<div class="flex w-full flex-col">
							<!-- "Delete token" shares only the first line, so the lines under it get the full
							     width: on a phone, the ID and its copy button then fit on one line. -->
							<div class="flex flex-row items-center justify-between gap-3">
								<!-- break-words, not break-all: a ledger canister ID then wraps at a hyphen. -->
								<span class="min-w-0 flex-1 break-words">
									{#if nonNullish(label)}
										{label}
									{:else}
										{@render ledgerCanisterIdWithCopy(token.ledgerCanisterId)}
									{/if}
								</span>

								<!-- Button is flex-1 by default, which would stretch it across the row. -->
								<Button
									disabled={deleting}
									link
									onclick={() => (confirmLedgerCanisterId = token.ledgerCanisterId)}
									styleClass="flex-none"
									testId={HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON}
									type="button"
								>
									{$i18n.tokens.text.delete_token}
								</Button>
							</div>

							<!-- Under a name and symbol too, so the user can check the exact ledger and copy its ID. -->
							{#if nonNullish(label)}
								<span class="text-sm break-words text-tertiary">
									{@render ledgerCanisterIdWithCopy(token.ledgerCanisterId)}
								</span>
							{/if}

							{#if nonNullish(ledgerStatus)}
								<span
									class="text-sm text-tertiary"
									data-tid={`${HELP_UNAVAILABLE_TOKENS_STATUS}-${token.ledgerCanisterId}`}
								>
									{statusText(ledgerStatus)}
								</span>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</SettingsCard>
	</div>
{/if}

<!-- The same popup as deleting a contact or a note. It can't be dismissed while the delete runs. -->
{#if nonNullish(confirmToken)}
	{@const token = confirmToken}

	<BottomSheetConfirmationPopup
		disabled={deleting}
		onCancel={() => (confirmLedgerCanisterId = undefined)}
		showCloseButton={false}
	>
		{#snippet title()}
			{$i18n.tokens.text.delete_token}
		{/snippet}

		{#snippet content()}
			<ContentWithToolbar>
				<!-- break-words, not break-all: a ledger canister ID then wraps at a hyphen. -->
				<p class="my-5 px-5 text-center break-words">
					<Html
						text={replacePlaceholders(
							replaceOisyPlaceholders($i18n.tokens.details.confirm_deletion_description),
							{
								$token: escapeHtml(tokenName(token))
							}
						)}
					/>
				</p>

				{#snippet toolbar()}
					<ButtonGroup>
						<ButtonCancel
							disabled={deleting}
							onclick={() => (confirmLedgerCanisterId = undefined)}
						/>

						<Button
							colorStyle="error"
							disabled={deleting}
							onclick={() => deleteToken(token)}
							testId={HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON}
							type="button"
						>
							{$i18n.core.text.delete}
						</Button>
					</ButtonGroup>
				{/snippet}
			</ContentWithToolbar>
		{/snippet}
	</BottomSheetConfirmationPopup>
{/if}
