<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import { extCustomTokensNotInitialized } from '$icp/derived/ext.derived';
	import { icPunksCustomTokensNotInitialized } from '$icp/derived/icpunks.derived';
	import { icrc7CustomTokensNotInitialized } from '$icp/derived/icrc7.derived';
	import { resolveIcrc7CollectionDeepLinkAction } from '$icp/services/icrc7-deep-link.services';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { WizardStepsManageTokens } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const icrc7DeepLinkManageTokensId = Symbol();
	const handledIcrc7DeepLinkCanisterIds = new SvelteSet<string>();

	const icrc7DeepLinkAction = $derived.by(() => {
		if (
			isNullish($authIdentity) ||
			$extCustomTokensNotInitialized ||
			$icPunksCustomTokensNotInitialized ||
			$icrc7CustomTokensNotInitialized
		) {
			return undefined;
		}

		return resolveIcrc7CollectionDeepLinkAction({
			url: page.url,
			tokens: $nonFungibleTokens
		});
	});

	$effect(() => {
		const action = icrc7DeepLinkAction;

		if (
			isNullish(action) ||
			action.type === 'ready' ||
			handledIcrc7DeepLinkCanisterIds.has(action.canisterId)
		) {
			return;
		}

		handledIcrc7DeepLinkCanisterIds.add(action.canisterId);

		if (action.type === 'import') {
			const data = {
				initialNetwork: ICP_NETWORK,
				initialTokenData: { icrc7CanisterId: action.canisterId },
				initialSearch: action.canisterId,
				initialStep: WizardStepsManageTokens.REVIEW
			};

			modalStore.openManageTokens({
				id: icrc7DeepLinkManageTokensId,
				data
			});
			return;
		}

		const data = {
			initialNetwork: ICP_NETWORK,
			initialSearch: action.canisterId,
			message: $i18n.transactions.text.token_needs_enabling
		};

		modalStore.openManageTokens({
			id: icrc7DeepLinkManageTokensId,
			data
		});
	});
</script>
