import type { CustomTokenSection } from '$lib/enums/custom-token-section';

export interface NonFungibleTokenAppearance {
	section?: CustomTokenSection;
	allowExternalContentSource?: boolean;
}
