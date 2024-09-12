<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import SkeletonText from '../ui/SkeletonText.svelte';
	import ReceiveActions from '$lib/components/receive/ReceiveActions.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { RECEIVE_TOKENS_MODAL_ADDRESS_LABEL } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionString } from '$lib/types/string';
	import type { Token } from '$lib/types/token';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let token: Token;
	export let address: OptionString;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;
	export let invisibleLogo = false;
	export let testId: string | undefined = undefined;
</script>

<div class="flex gap-8 justify-between mb-6" data-tid={testId}>
	<div class="grid grid-cols-[minmax(52px,auto),1fr] gap-4 content-center w-full">
		<div class="col-start-1">
			{#if !invisibleLogo}
				<Logo
					color="white"
					src={token.network.icon}
					alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.network.name })}
					size="medium"
				/>
			{/if}
		</div>

		<div class="col-start-2 content-center">
			<div class="flex flex-row justify-between">
				<Card noMargin>
					<slot />

					<svelte:fragment slot="description">
						{#if isNullish(address)}
							<span class="w-full max-w-[150px] mt-2"><SkeletonText /></span>
						{:else}
							<span class="break-all" data-tid={RECEIVE_TOKENS_MODAL_ADDRESS_LABEL}>
								{shortenWithMiddleEllipsis(address)}
							</span>
						{/if}
					</svelte:fragment>
				</Card>

				{#if nonNullish(address)}
					<ReceiveActions on:click {address} {qrCodeAriaLabel} {copyAriaLabel} />
				{/if}
			</div>
			<slot name="notes" />
		</div>
	</div>
</div>
