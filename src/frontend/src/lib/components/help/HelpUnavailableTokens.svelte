<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { icrcUnavailableCustomTokensStore } from '$icp/stores/icrc-unavailable-custom-tokens.store';
	import type { LedgerCanisterIdText } from '$icp/types/canister';
	import type { IcrcUnavailableCustomToken } from '$icp/types/icrc-custom-token';
	import { removeCustomToken } from '$lib/api/backend.api';
	import { deleteIdbIcToken } from '$lib/api/idb-tokens.api';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import {
		HELP_UNAVAILABLE_TOKENS_CARD,
		HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON,
		HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { escapeHtml } from '$lib/utils/html.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	let confirmLedgerCanisterId: LedgerCanisterIdText | undefined = $state();

	let deleting = $state(false);

	// The name the "not responding" warning uses for the token.
	const tokenName = ({ symbol, ledgerCanisterId }: IcrcUnavailableCustomToken): string =>
		symbol ?? ledgerCanisterId;

	const deleteToken = async (token: IcrcUnavailableCustomToken) => {
		if (isNullish($authIdentity)) {
			return;
		}

		deleting = true;

		try {
			await removeCustomToken({ identity: $authIdentity, token: token.customToken });

			await deleteIdbIcToken({ identity: $authIdentity, token: token.customToken });

			icrcUnavailableCustomTokensStore.update((tokens) =>
				tokens.filter(({ ledgerCanisterId }) => ledgerCanisterId !== token.ledgerCanisterId)
			);

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

<!-- Only a user with a saved token that OISY skips or cannot load has anything to do here. -->
{#if $icrcUnavailableCustomTokensStore.length > 0}
	<div data-tid={HELP_UNAVAILABLE_TOKENS_CARD}>
		<SettingsCard>
			{#snippet title()}{$i18n.help.text.unavailable_tokens_title}{/snippet}

			<p class="text-sm text-tertiary">
				{replaceOisyPlaceholders($i18n.help.text.unavailable_tokens_description)}
			</p>

			<ul class="flex list-none flex-col">
				{#each $icrcUnavailableCustomTokensStore as token (token.ledgerCanisterId)}
					<li class="mt-3">
						{#if confirmLedgerCanisterId === token.ledgerCanisterId}
							<p class="mb-3 break-words">
								<Html
									text={replacePlaceholders(
										replaceOisyPlaceholders($i18n.tokens.details.confirm_deletion_description),
										{
											$token: escapeHtml(tokenName(token))
										}
									)}
								/>
							</p>

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
						{:else}
							<div class="flex w-full flex-row items-center justify-between gap-3">
								<!-- break-words, not break-all: a ledger canister ID then wraps at a hyphen. -->
								<span class="min-w-0 flex-1 break-words">{tokenName(token)}</span>

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
						{/if}
					</li>
				{/each}
			</ul>
		</SettingsCard>
	</div>
{/if}
