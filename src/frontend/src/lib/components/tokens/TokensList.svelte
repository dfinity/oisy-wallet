<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import Listener from '$lib/components/core/Listener.svelte';
	import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
	import NoTokensPlaceholder from '$lib/components/tokens/NoTokensPlaceholder.svelte';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import TokenGroupCard from '$lib/components/tokens/TokenGroupCard.svelte';
	import TokensDisplayHandler from '$lib/components/tokens/TokensDisplayHandler.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { modalManageTokens } from '$lib/derived/modal.derived';
	import type { TokenUiOrGroupUi } from '$lib/types/token-group';
	import { isTokenUiGroup } from '$lib/utils/token-group.utils';

	let tokens: TokenUiOrGroupUi[] | undefined;

	let animating = false;
	let shake = false;

	const handleAnimationStart = () => {
		animating = true;

		// The following is to guarantee that the function is triggered, even if 'animationend' event is not triggered.
		// It may happen if the animation aborts before reaching completion.
		debouncedHandleAnimationEnd();
	};

	const handleAnimationEnd = () => {
		animating = false;
		shake = false;
	};

	const debouncedHandleAnimationEnd = debounce(() => {
		if (animating) {
			handleAnimationEnd();
		}
	}, 250);

	const onClick = () => {
		if (animating) {
			shake = true;
		}
	};

	let loading: boolean;
	$: loading = $erc20UserTokensNotInitialized || isNullish(tokens);
</script>

<TokensDisplayHandler bind:tokens>
	<TokensSkeletons {loading}>
		<div class="mb-3 flex flex-col gap-3" class:shake>
			{#each tokens ?? [] as token (token.id)}
				<div
					transition:fade
					animate:flip={{ duration: 2000 }}
					on:animationstart={handleAnimationStart}
					on:animationend={handleAnimationEnd}
				>
					{#if isTokenUiGroup(token)}
						<TokenGroupCard tokenGroup={token} />
					{:else}
						<Listener {token}>
							<TokenCardWithUrl {token} disabled={animating} on:click={onClick}>
								<TokenCardContent data={token} />
							</TokenCardWithUrl>
						</Listener>
					{/if}
				</div>
			{/each}
		</div>

		{#if tokens?.length === 0}
			<NoTokensPlaceholder />
		{/if}

		{#if $modalManageTokens}
			<ManageTokensModal />
		{/if}
	</TokensSkeletons>
</TokensDisplayHandler>

<style>
	@keyframes shake {
		0% {
			transform: translateX(0px);
		}
		20% {
			transform: translateX(10px);
		}
		40% {
			transform: translateX(-10px);
		}
		60% {
			transform: translateX(5px);
		}
		80% {
			transform: translateX(-5px);
		}
		90% {
			transform: translateX(1px);
		}
		95% {
			transform: translateX(-1px);
		}
		100% {
			transform: translateX(0px);
		}
	}

	.shake {
		animation: shake 0.3s ease;
	}
</style>
