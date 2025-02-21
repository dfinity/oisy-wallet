<script lang="ts">
	export let size: 'small' | 'big' = 'small';
</script>

<div aria-hidden="true">
	<div
		class="bg-disabled-alt aspect-square animate-pulse rounded-full"
		class:w-[52px]={size === 'small'}
		class:w-[64px]={size === 'big'}
	></div>
</div>
