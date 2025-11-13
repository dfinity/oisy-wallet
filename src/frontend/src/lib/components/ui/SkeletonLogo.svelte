<script lang="ts">
	import { isIos } from '$lib/utils/device.utils';

	interface Props {
		size?: 'small' | 'big';
	}

	let { size = 'small' }: Props = $props();
</script>

<div aria-hidden="true">
	<div
		class="aspect-square rounded-full bg-disabled-alt"
		class:animate-pulse={!isIos()}
		class:w-[52px]={size === 'small'}
		class:w-[64px]={size === 'big'}
	></div>
</div>
