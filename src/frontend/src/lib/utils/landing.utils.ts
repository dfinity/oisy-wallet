export interface LandingSectionLink {
	href: `#landing-${string}`;
	label: string;
}

/** The landing sections the header row and the phone menu jump to, in page order. */
export const landingSectionLinks = (i18n: I18n): LandingSectionLink[] => [
	{ href: '#landing-hold', label: i18n.navigation.text.tokens },
	{ href: '#landing-security', label: i18n.auth.landing.security_eyebrow },
	{ href: '#landing-swap', label: i18n.swap.text.swap },
	{ href: '#landing-borrow', label: i18n.auth.landing.borrow_eyebrow }
];
