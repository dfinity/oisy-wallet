<script lang="ts">
	export let size: 'small' | 'big' = 'small';
</script>

<div aria-hidden="true">
	<div
		class="aspect-square animate-pulse rounded-full bg-disabled-alt"
		class:w-[52px]={size === 'small'}
		class:w-[64px]={size === 'big'}
	></div>
</div>
