<script lang="ts">
	import { IconInfo } from '@dfinity/gix-components';
	import { ERC20_ICP_REPO_URL } from '$eth/constants/erc20-icp.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<a
	href={ERC20_ICP_REPO_URL}
	rel="external noopener noreferrer"
	target="_blank"
	class="gap-2 pt-6 pb-3 text-xs font-bold md:text-base inline-flex items-center text-center no-underline"
>
	<IconInfo />
	<span class="pl-1">{$i18n.hero.text.learn_more_about_erc20_icp}</span>
</a>

<style lang="scss">
	@use '../../styles/mixins/media';

	a {
		color: var(--color-white);
		margin: 0 auto;

		:global(svg) {
			vertical-align: bottom;

			@include media.min-width(medium) {
				vertical-align: sub;
			}
		}
	}
</style>
