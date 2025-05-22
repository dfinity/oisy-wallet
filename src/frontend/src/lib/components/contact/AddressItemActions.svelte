<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import {
		ADDRESS_LIST_ITEM_COPY_BUTTON,
		ADDRESS_LIST_ITEM_INFO_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi } from '$lib/types/contact';

	interface Props {
		address: ContactAddressUi;
		onInfo?: () => void;
		styleClass?: string;
	}
	let { address, onInfo, styleClass = '' }: Props = $props();
</script>

<div class={`flex ${styleClass}`}>
	<Copy
		testId={ADDRESS_LIST_ITEM_COPY_BUTTON}
		text={$i18n.wallet.text.address_copied}
		value={address.address}
	/>
	{#if nonNullish(onInfo)}
		<ButtonIcon
			styleClass="-m-1 md:m-0 hover:text-inherit"
			ariaLabel={$i18n.core.text.view}
			testId={ADDRESS_LIST_ITEM_INFO_BUTTON}
			onclick={onInfo}
		>
			{#snippet icon()}
				<IconInfo />
			{/snippet}
		</ButtonIcon>
	{/if}
</div>
