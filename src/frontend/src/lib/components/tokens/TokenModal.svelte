<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
	import { isTokenErc20UserToken } from '$eth/utils/erc20.utils';
	import { toUserToken } from '$icp-eth/services/user-token.services';
	import { removeUserToken } from '$lib/api/backend.api';
	import TokenModalContent from '$lib/components/tokens/TokenModalContent.svelte';
	import TokenModalDeleteConfirmation from '$lib/components/tokens/TokenModalDeleteConfirmation.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { OptionToken } from '$lib/types/token';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { gotoReplaceRoot } from '$lib/utils/nav.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface BaseTokenModalProps {
		token: OptionToken;
		children?: Snippet;
		isDeletable?: boolean;
	}

	let { children, token, isDeletable = false }: BaseTokenModalProps = $props();

	let showDeleteConfirmation = $state(false);
	let loading = $state(false);

	const onTokenDeleteSuccess = async () => {
		loading = false;

		modalStore.close();

		await gotoReplaceRoot();

		if (nonNullish(token)) {
			toastsShow({
				text: replacePlaceholders(
					replaceOisyPlaceholders($i18n.tokens.details.deletion_confirmation),
					{
						$token: getTokenDisplaySymbol(token)
					}
				),
				level: 'success'
			});
		}
	};

	const onTokenDelete = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish(token)) {
			return;
		}

		// TODO: update this function to handle ICRC/SPL when BE supports removing custom tokens
		if (isTokenErc20UserToken(token)) {
			loading = true;

			const { chain_id, contract_address } = toUserToken(token);

			try {
				await removeUserToken({
					chain_id,
					contract_address,
					identity: $authIdentity
				});

				erc20UserTokensStore.reset(token.id);

				await onTokenDeleteSuccess();
			} catch (err: unknown) {
				toastsError({
					msg: { text: $i18n.tokens.error.unexpected_error_on_token_delete },
					err
				});

				loading = false;
				showDeleteConfirmation = false;
			}
		}
	};
</script>

<Modal on:nnsClose={modalStore.close} disablePointerEvents={loading}>
	<svelte:fragment slot="title">
		{showDeleteConfirmation
			? $i18n.tokens.details.confirm_deletion_title
			: $i18n.tokens.details.title}
	</svelte:fragment>

	{#if showDeleteConfirmation}
		<TokenModalDeleteConfirmation
			{token}
			{loading}
			onCancel={() => (showDeleteConfirmation = false)}
			onConfirm={onTokenDelete}
		/>
	{:else}
		<TokenModalContent
			{token}
			{...isDeletable && { onDeleteClick: () => (showDeleteConfirmation = true) }}
		>
			{@render children?.()}
		</TokenModalContent>
	{/if}
</Modal>
