<script lang="ts">
	import IconOisyMenu from '$lib/components/icons/IconOisyMenu.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { emit } from '$lib/utils/events.utils';

	interface Props {
		onClick?: () => void;
	}

	let { onClick }: Props = $props();

	const openReceive = () => {
		onClick?.();
		emit({ message: 'oisyReceive' });
	};
</script>

<button class="nav-item nav-item-condensed" onclick={openReceive}>
	<IconOisyMenu size="20" />
	{$i18n.wallet.text.your_addresses}
</button>
