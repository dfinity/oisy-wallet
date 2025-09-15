import { AUTH_ALTERNATIVE_ORIGINS, AUTH_DERIVATION_ORIGIN } from '$lib/constants/app.constants';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { notEmptyString } from '@dfinity/utils';

const isAlternativeOrigin = (): boolean => {
	const {
		location: { origin }
	} = window;

	const knownAlternativeOrigins = (AUTH_ALTERNATIVE_ORIGINS ?? '')
		.split(',')
		.filter(notEmptyString);
	return knownAlternativeOrigins.includes(origin);
};

export const getOptionalDerivationOrigin = ():
	| { derivationOrigin: string }
	| Record<string, never> =>
	isAlternativeOrigin() && !isNullishOrEmpty(AUTH_DERIVATION_ORIGIN)
		? {
				derivationOrigin: AUTH_DERIVATION_ORIGIN
			}
		: {};
