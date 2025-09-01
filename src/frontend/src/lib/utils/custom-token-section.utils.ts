import type { TokenSection } from '$declarations/backend/backend.did';
import { CustomTokenSection } from '$lib/enums/custom-token-section';

export const mapTokenSection = (section: TokenSection): CustomTokenSection | undefined => {
	if ('Spam' in section) {
		return CustomTokenSection.SPAM;
	}
	if ('Hidden' in section) {
		return CustomTokenSection.HIDDEN;
	}

	return undefined;
};

export const mapCustomTokenSection = (section: CustomTokenSection): TokenSection | undefined => {
	if (section === CustomTokenSection.SPAM) {
		return { Spam: null };
	}
	if (section === CustomTokenSection.HIDDEN) {
		return { Hidden: null };
	}

	return undefined;
};