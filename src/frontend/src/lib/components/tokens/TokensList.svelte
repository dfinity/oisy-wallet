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
	import { groupTogglableTokens, pinEnabledTokensAtTop, sortTokens } from '$lib/utils/tokens.utils';
	import type { ExchangesData } from '$lib/types/exchange';
	import { onMount, untrack } from 'svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import type { Token } from '$lib/types/token';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { mapTokenUi } from '$lib/utils/token.utils';
	import { balancesStore } from '$lib/stores/balances.store';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
	import { saveIcrcCustomTokens } from '$icp/services/manage-tokens.services';
	import type { SaveUserToken } from '$eth/services/erc20-user-tokens.services';
	import { saveErc20UserTokens } from '$eth/services/manage-tokens.services';
	import type { SaveSplCustomToken } from '$sol/types/spl-custom-token';
	import { saveSplCustomTokens } from '$sol/services/manage-tokens.services';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import Button from '$lib/components/ui/Button.svelte';
	import type { TokenToggleable } from '$lib/types/token-toggleable';
	import Sticky from '$lib/components/ui/Sticky.svelte';

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

	let allTokensFilteredAndSorted: TokenUiOrGroupUi[] = $state([]);

	const updateFilterList = (filter: string) => {
		console.log('Filtr called', filter);
		allTokensFilteredAndSorted = getFilteredTokenList({
			filter,
			list: (nonNullish(exchangesStaticData)
				? pinEnabledTokensAtTop(
						sortTokens({
							$tokens: $allTokens,
							$exchanges: exchangesStaticData,
							$tokensToPin
						})
					)
				: []
			)
				.filter(
					(t) =>
						!t.enabled ||
						(t.enabled && nonNullish(Object.values(modifiedTokens).find((s) => s.id === t.id)))
				)
				.map((t) => ({
					token: mapTokenUi({ token: t, $balances: $balancesStore, $exchanges })
				})) as TokenUiOrGroupUi[]
		});
		modifiedTokens = {};
	};

	$effect(() => {
		const filter = $tokenListStore.filter;
		untrack(() => updateFilterList(filter));
	});

	let {
		initialSearch,
		message
	}: { initialSearch: string | undefined; message?: string | undefined } = $derived(
		nonNullish($modalManageTokensData)
			? $modalManageTokensData
			: { initialSearch: undefined, message: undefined }
	);

	const onSave = async () => {
		const { icrc, erc20, spl } = groupTogglableTokens(modifiedTokens);

		// save the changes
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

		updateFilterList($tokenListStore.filter);
	};

	let modifiedTokens: Record<string, Token> = $state({});

	let saveDisabled = $derived(Object.keys(modifiedTokens).length === 0);

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
	};

	const progress = () => ProgressStepsAddToken.DONE;

	const saveIcrc = (tokens: SaveCustomTokenWithKey[]): Promise<void> =>
		saveIcrcCustomTokens({
			tokens,
			progress,
			modalNext: () => {},
			onSuccess: close,
			onError: () => {},
			identity: $authIdentity
		});

	const saveErc20 = (tokens: SaveUserToken[]): Promise<void> =>
		saveErc20UserTokens({
			tokens,
			progress,
			modalNext: () => {},
			onSuccess: close,
			onError: () => {},
			identity: $authIdentity
		});

	const saveSpl = (tokens: SaveSplCustomToken[]): Promise<void> =>
		saveSplCustomTokens({
			tokens,
			progress,
			modalNext: () => {},
			onSuccess: close,
			onError: () => {},
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
					onanimationstart={handleAnimationStart}
					onanimationend={handleAnimationEnd}
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

		{#if $tokenListStore.filter !== '' && allTokensFilteredAndSorted.length > 0}
			<div class="mb-3 mt-12 flex flex-col gap-3">
				<Sticky>
					<div class="flex max-h-[60px] items-center justify-between py-2">
						<h2 class="text-base">{$i18n.tokens.manage.text.enable_more_assets}</h2>
						<div>
							<Button
								onclick={() => onSave()}
								disabled={saveDisabled}
								paddingSmall
								fullWidth={false}
								styleClass="py-2"
							>
								Apply ({Object.keys(modifiedTokens).length} token)
							</Button>
						</div>
					</div>
				</Sticky>

				{#each allTokensFilteredAndSorted as tokenOrGroup (isTokenUiGroup(tokenOrGroup) ? tokenOrGroup.group.id : tokenOrGroup.token.id)}
					<div
						class="overflow-hidden rounded-xl"
						transition:fade
						animate:flip={{ duration: 250 }}
						onanimationstart={handleAnimationStart}
						onanimationend={handleAnimationEnd}
						class:pointer-events-none={animating}
					>
						<div class="transition duration-300 hover:bg-primary">
							{#if !isTokenUiGroup(tokenOrGroup)}
								<TokenCard data={tokenOrGroup.token} {onToggle} />
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
