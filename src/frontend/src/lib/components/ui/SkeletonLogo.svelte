<script lang="ts">
	interface Props {
		size?: 'small' | 'big';
	}

	let { size = 'small' }: Props = $props();
</script>

<div aria-hidden="true">
	<div
		class="aspect-square animate-pulse rounded-full bg-disabled-alt"
		class:w-[52px]={size === 'small'}
		class:w-[64px]={size === 'big'}
	></div>
</div>
