<script lang="ts">
	export let size: 'small' | 'big' = 'small';
</script>

<div class="opacity-40" aria-hidden="true">
	<div
		class="aspect-square animate-pulse rounded-full bg-grey"
		class:w-[52px]={size === 'small'}
		class:w-[64px]={size === 'big'}
	></div>
</div>
