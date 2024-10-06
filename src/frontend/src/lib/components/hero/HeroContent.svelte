<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import Back from '$lib/components/core/Back.svelte';
	import Erc20Icp from '$lib/components/core/Erc20Icp.svelte';
	import Balance from '$lib/components/hero/Balance.svelte';
	import ContextMenu from '$lib/components/hero/ContextMenu.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
</script>

<article class="main relative flex flex-col items-center pb-6 pt-10">
	{#if nonNullish($token)}
		<div class="grid w-full grid-cols-[1fr_auto_1fr] flex-row items-start justify-between">
			<Back />

			<div>
				<div class="flex items-center justify-center pt-2">
					<Logo
						src={$token.icon}
						size="big"
						alt={replacePlaceholders($i18n.core.alt.logo, { $name: $token.name })}
					/>
				</div>

				<Balance token={$token} />
			</div>

			<ContextMenu />
		</div>
	{/if}

	{#if isErc20Icp($token)}
		<Erc20Icp />
	{/if}
</article>
