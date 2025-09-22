<script lang="ts">
	import IconOisyMenu from '$lib/components/icons/IconOisyMenu.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { getSymbol } from '$lib/utils/modal.utils';

	interface Props {
		onClick?: () => void;
	}

	let { onClick }: Props = $props();

	const openReceive = () => {
		onClick?.();
		modalStore.openReceive(getSymbol('menu-addresses'));
	};
</script>

<button class="nav-item nav-item-condensed" onclick={openReceive}>
	<IconOisyMenu size="20" />
	{$i18n.wallet.text.your_addresses}
</button>
