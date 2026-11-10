<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { icrcUnavailableCustomTokensStore } from '$icp/stores/icrc-unavailable-custom-tokens.store';
	import type { LedgerCanisterIdText } from '$icp/types/canister';
	import type { IcrcUnavailableCustomToken } from '$icp/types/icrc-custom-token';
	import { removeCustomToken } from '$lib/api/backend.api';
	import { deleteIdbIcToken } from '$lib/api/idb-tokens.api';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import {
		MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_CONFIRM_DELETE,
		MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_DELETE,
		MANAGE_TOKENS_IC_UNAVAILABLE_TOKENS
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

{#if $icrcUnavailableCustomTokensStore.length > 0}
	<MessageBox level="warning" testId={MANAGE_TOKENS_IC_UNAVAILABLE_TOKENS}>
		<p class="font-bold">{$i18n.tokens.manage.text.unavailable_tokens}</p>

		<p>{replaceOisyPlaceholders($i18n.tokens.manage.info.unavailable_tokens)}</p>

		<ul class="mt-3 flex list-none flex-col gap-3">
			{#each $icrcUnavailableCustomTokensStore as token (token.ledgerCanisterId)}
				<li>
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
								testId={MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_CONFIRM_DELETE}
								type="button"
							>
								{$i18n.core.text.delete}
							</Button>
						</ButtonGroup>
					{:else}
						<div class="flex flex-wrap items-center gap-x-3">
							<span class="break-all">{tokenName(token)}</span>

							<!-- Keeps the button to its text width: on its own it grows to fill the row. -->
							<div>
								<Button
									disabled={deleting}
									link
									onclick={() => (confirmLedgerCanisterId = token.ledgerCanisterId)}
									paddingSmall
									testId={MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_DELETE}
									type="button"
								>
									{$i18n.tokens.text.delete_token}
								</Button>
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</MessageBox>
{/if}
