<script lang="ts">
	import { IconInfo } from '@dfinity/gix-components';
	import { ERC20_ICP_REPO_URL } from '$eth/constants/erc20-icp.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<a
	class="inline-flex items-center gap-2 pb-3 pt-6 text-center text-xs font-bold no-underline md:text-base"
	href={ERC20_ICP_REPO_URL}
	rel="external noopener noreferrer"
	target="_blank"
>
	<IconInfo />
	<span class="pl-1">{$i18n.hero.text.learn_more_about_erc20_icp}</span>
</a>

<style lang="scss">
	@use '../../styles/mixins/media';

	a {
		color: var(--color-base-white);
		margin: 0 auto;

		:global(svg) {
			vertical-align: bottom;

			@include media.min-width(medium) {
				vertical-align: sub;
			}
		}
	}
</style>
