<script lang="ts">
	import IconOisyMenu from '$lib/components/icons/IconOisyMenu.svelte';
	import { NAVIGATION_MENU_RECEIVE_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { getSymbol } from '$lib/utils/modal.utils';

	interface Props {
		onClick?: () => void;
	}

	let { onClick }: Props = $props();

	const openReceive = () => {
		modalStore.openReceive(getSymbol('menu-addresses'));
		onClick?.();
	};
</script>

<button
	class="nav-item nav-item-condensed"
	data-tid={NAVIGATION_MENU_RECEIVE_BUTTON}
	onclick={openReceive}
>
	<IconOisyMenu size="20" />
	{$i18n.wallet.text.your_addresses}
</button>
