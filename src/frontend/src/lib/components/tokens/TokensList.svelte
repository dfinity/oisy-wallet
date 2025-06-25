<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import Listener from '$lib/components/core/Listener.svelte';
	import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
	import NoTokensPlaceholder from '$lib/components/tokens/NoTokensPlaceholder.svelte';
	import NothingFoundPlaceholder from '$lib/components/tokens/NothingFoundPlaceholder.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import TokenGroupCard from '$lib/components/tokens/TokenGroupCard.svelte';
	import TokensDisplayHandler from '$lib/components/tokens/TokensDisplayHandler.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { modalManageTokens, modalManageTokensData } from '$lib/derived/modal.derived';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import type { TokenUiOrGroupUi } from '$lib/types/token-group';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { isTokenUiGroup } from '$lib/utils/token-group.utils';
	import { getFilteredTokenList } from '$lib/utils/token-list.utils';
	import { pinEnabledTokensAtTop, sortTokens } from '$lib/utils/tokens.utils';
	import type { ExchangesData } from '$lib/types/exchange';
	import { onMount } from 'svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import type { Token, TokenUi } from '$lib/types/token';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import { mapTokenUi } from '$lib/utils/token.utils';
	import { balancesStore } from '$lib/stores/balances.store';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import type { Erc20UserToken } from '$eth/types/erc20-user-token';
	import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
	import { saveIcrcCustomTokens } from '$icp/services/manage-tokens.services';
	import type { SaveUserToken } from '$eth/services/erc20-user-tokens.services';
	import { saveErc20UserTokens } from '$eth/services/manage-tokens.services';
	import type { SaveSplCustomToken } from '$sol/types/spl-custom-token';
	import { saveSplCustomTokens } from '$sol/services/manage-tokens.services';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { isTokenDip20, isTokenIcrc } from '$icp/utils/icrc.utils';
	import { isTokenErc20UserToken } from '$eth/utils/erc20.utils';
	import { isTokenSplToggleable } from '$sol/utils/spl.utils';
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import { get } from 'svelte/store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { SolanaNetwork } from '$sol/types/network';

	let tokens: TokenUiOrGroupUi[] | undefined = $state();

	let animating = $state(false);

	const handleAnimationStart = () => {
		animating = true;

		// The following is to guarantee that the function is triggered, even if 'animationend' event is not triggered.
		// It may happen if the animation aborts before reaching completion.
		debouncedHandleAnimationEnd();
	};

	const handleAnimationEnd = () => (animating = false);

	const debouncedHandleAnimationEnd = debounce(() => {
		if (animating) {
			handleAnimationEnd();
		}
	}, 250);

	let loading: boolean = $derived($erc20UserTokensNotInitialized || isNullish(tokens));

	let filteredTokens: TokenUiOrGroupUi[] | undefined = $derived(
		getFilteredTokenList({ filter: $tokenListStore.filter, list: tokens ?? [] })
	);

	// To avoid strange behavior when the exchange data changes (for example, the tokens may shift
	// since some of them are sorted by market cap), we store the exchange data in a variable during
	// the life of the component.
	let exchangesStaticData: ExchangesData | undefined = $state();

	onMount(() => {
		exchangesStaticData = nonNullish($exchanges) ? { ...$exchanges } : undefined;
	});

	let allTokensSorted: TokenUiOrGroupUi[] = $derived(
		getFilteredTokenList({
			filter: $tokenListStore.filter,
			list: (nonNullish(exchangesStaticData)
				? pinEnabledTokensAtTop(
						sortTokens({
							$tokens: $allTokens,
							$exchanges: exchangesStaticData,
							$tokensToPin
						})
					)
				: []
			).map((t) => ({
				token: mapTokenUi({ token: t, $balances: $balancesStore, $exchanges })
			})) as TokenUiOrGroupUi[]
		})
	);

	let {
		initialSearch,
		message
	}: { initialSearch: string | undefined; message?: string | undefined } = $derived(
		nonNullish($modalManageTokensData)
			? $modalManageTokensData
			: { initialSearch: undefined, message: undefined }
	);

	let modifiedTokens: Record<string, Token> = $state({});

	const onToggle = ({ detail: { id, network, ...rest } }: CustomEvent<Token>) => {
		const { id: networkId } = network;
		const { [`${networkId.description}-${id.description}`]: current, ...tokens } = modifiedTokens;

		if (nonNullish(current)) {
			modifiedTokens = { ...tokens };
			return;
		}

		modifiedTokens = {
			[`${networkId.description}-${id.description}`]: { id, network, ...rest },
			...tokens
		};

		const grouped = Object.values(modifiedTokens).reduce<{
			icrc: IcrcCustomToken[];
			erc20: Erc20UserToken[];
			spl: SplTokenToggleable[];
		}>(
			({ icrc, erc20, spl }, token) => ({
				icrc: [
					...icrc,
					...(isTokenIcrc(token) || isTokenDip20(token) ? [token as IcrcCustomToken] : [])
				],
				erc20: [...erc20, ...(isTokenErc20UserToken(token) ? [token] : [])],
				spl: [...spl, ...(isTokenSplToggleable(token) ? [token] : [])]
			}),
			{ icrc: [], erc20: [], spl: [] }
		);

		saveTokens(grouped);
	};

	const saveTokens = async ({
		icrc,
		erc20,
		spl
	}: {
		icrc: IcrcCustomToken[];
		erc20: Erc20UserToken[];
		spl: SplTokenToggleable[];
	}) => {
		if (icrc.length === 0 && erc20.length === 0 && spl.length === 0) {
			toastsShow({
				text: $i18n.tokens.manage.info.no_changes,
				level: 'info',
				duration: 5000
			});

			return;
		}

		await Promise.allSettled([
			...(icrc.length > 0 ? [saveIcrc(icrc.map((t) => ({ ...t, networkKey: 'Icrc' })))] : []),
			...(erc20.length > 0 ? [saveErc20(erc20)] : []),
			...(spl.length > 0 ? [saveSpl(spl)] : [])
		]);
	};

	let saveProgressStep: ProgressStepsAddToken = $state(ProgressStepsAddToken.INITIALIZATION);
	const progress = (step: ProgressStepsAddToken) => (saveProgressStep = step);

	const saveIcrc = (tokens: SaveCustomTokenWithKey[]): Promise<void> =>
		saveIcrcCustomTokens({
			tokens,
			progress,
			modalNext: () => null,
			onSuccess: close,
			onError: () => null,
			identity: $authIdentity
		});

	const saveErc20 = (tokens: SaveUserToken[]): Promise<void> =>
		saveErc20UserTokens({
			tokens,
			progress,
			modalNext: () => null,
			onSuccess: close,
			onError: () => null,
			identity: $authIdentity
		});

	const saveSpl = (tokens: SaveSplCustomToken[]): Promise<void> =>
		saveSplCustomTokens({
			tokens,
			progress,
			modalNext: () => null,
			onSuccess: close,
			onError: () => null,
			identity: $authIdentity
		});
</script>

<TokensDisplayHandler bind:tokens>
	<TokensSkeletons {loading}>
		<div class="mb-3 flex flex-col gap-3">
			{#each filteredTokens as tokenOrGroup (isTokenUiGroup(tokenOrGroup) ? tokenOrGroup.group.id : tokenOrGroup.token.id)}
				<div
					class="overflow-hidden rounded-xl"
					transition:fade
					animate:flip={{ duration: 250 }}
					on:animationstart={handleAnimationStart}
					on:animationend={handleAnimationEnd}
					class:pointer-events-none={animating}
				>
					{#if isTokenUiGroup(tokenOrGroup)}
						{@const { group: tokenGroup } = tokenOrGroup}

						<TokenGroupCard {tokenGroup} />
					{:else}
						{@const { token } = tokenOrGroup}

						<Listener {token}>
							<div class="transition duration-300 hover:bg-primary">
								<TokenCard data={token} on:click={() => goto(transactionsUrl({ token }))} />
							</div>
						</Listener>
					{/if}
				</div>
			{/each}
		</div>

		{#if filteredTokens?.length === 0}
			{#if $tokenListStore.filter === ''}
				<NoTokensPlaceholder />
			{:else}
				<NothingFoundPlaceholder />
			{/if}
		{/if}

		{#if $tokenListStore.filter !== ''}
			<div class="mb-3 mt-12 flex flex-col gap-3">
				<h2 class="text-base">Enable more assets</h2>

				{#each allTokensSorted as tokenOrGroup (isTokenUiGroup(tokenOrGroup) ? tokenOrGroup.group.id : tokenOrGroup.token.id)}
					<div
						class="overflow-hidden rounded-xl"
						transition:fade
						animate:flip={{ duration: 250 }}
						on:animationstart={handleAnimationStart}
						on:animationend={handleAnimationEnd}
						class:pointer-events-none={animating}
					>
						<div class="transition duration-300 hover:bg-primary">
							{#if !isTokenUiGroup(tokenOrGroup)}
								<TokenCard data={tokenOrGroup.token} togglable ontoggle={onToggle} />
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if $modalManageTokens}
			<ManageTokensModal {initialSearch}>
				{#snippet infoElement()}
					{#if nonNullish(message)}
						<MessageBox level="info">
							{message}
						</MessageBox>
					{/if}
				{/snippet}
			</ManageTokensModal>
		{/if}
	</TokensSkeletons>
</TokensDisplayHandler>
