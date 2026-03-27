<script lang="ts">
	import { isIOS } from '@dfinity/gix-components';

	interface Props {
		size?: 'small' | 'big';
	}

	let { size = 'small' }: Props = $props();
</script>

<div aria-hidden="true">
	<div
		class="aspect-square rounded-full bg-disabled-alt"
		class:animate-pulse={!isIOS()}
		class:w-[52px]={size === 'small'}
		class:w-[64px]={size === 'big'}
	></div>
</div>
