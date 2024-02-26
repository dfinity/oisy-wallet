<script lang="ts">
	export let size: 'small' | 'big' = 'small';
</script>

<div class="opacity-40" aria-hidden="true">
	<div
		class="aspect-square bg-grey rounded-full animate-pulse"
		class:w-[46px]={size === 'small'}
		class:w-[64px]={size === 'big'}
	></div>
</div>
