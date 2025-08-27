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
