/**
 * The functions in this file should have gone in the `agreements.utils.spec.ts` module.
 * However, in their usage there is a circular reference somewhere in the build that makes it fail.
 * I was still unable to find the source of the issue, so I decided to keep them here for now.
 * TODO: investigate the circular reference issue and move these functions to `agreements.utils.spec.ts`
 **/

import { Languages } from '$lib/enums/languages';
import { i18n } from '$lib/stores/i18n.store';
import { formatUpdatedAgreementsHtml } from '$lib/utils/agreements-formatter.utils';
import { get } from 'svelte/store';

describe('agreements-formatter.utils', () => {
	describe('formatUpdatedAgreementsHtml', () => {
		type UsedLanguages = Languages.ENGLISH | Languages.ITALIAN | Languages.GERMAN;

		const cls =
			'class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt"';

		const licenseAgreementLink = ({ ariaLabel, text }: { ariaLabel: string; text: string }) =>
			`<a target="_blank" ${cls} aria-label="${ariaLabel}" href="/license-agreement/">${text} <!----></a>`;
		const termsOfUseLink = ({ ariaLabel, text }: { ariaLabel: string; text: string }) =>
			`<a target="_blank" ${cls} aria-label="${ariaLabel}" href="/terms-of-use/">${text} <!----></a>`;
		const privacyPolicyLink = ({ ariaLabel, text }: { ariaLabel: string; text: string }) =>
			`<a target="_blank" ${cls} aria-label="${ariaLabel}" href="/privacy-policy/">${text} <!----></a>`;

		const testCases = [
			{
				agreements: {
					licenseAgreement: true,
					termsOfUse: true,
					privacyPolicy: true
				},
				expected: {
					[Languages.ENGLISH]:
						`our ${licenseAgreementLink({ ariaLabel: 'The OISY Wallet License Agreement', text: 'License Agreement' })}, ` +
						`our ${termsOfUseLink({ ariaLabel: 'Terms of Use Link', text: 'Terms of Use' })}, ` +
						`and our ${privacyPolicyLink({ ariaLabel: 'Privacy Policy Link', text: 'Privacy Policy' })}`,
					[Languages.ITALIAN]:
						`il nostro ${licenseAgreementLink({ ariaLabel: "L'Accordo di Licenza di OISY Wallet", text: 'Accordo di Licenza' })}, ` +
						`i nostri ${termsOfUseLink({ ariaLabel: 'Link ai termini di utilizzo', text: 'Termini di utilizzo' })} ` +
						`e la nostra ${privacyPolicyLink({ ariaLabel: "Link all'informativa sulla privacy", text: 'Politica sulla riservatezza' })}`,
					[Languages.GERMAN]:
						`unsere ${licenseAgreementLink({ ariaLabel: 'Die Lizenzvereinbarung von OISY Wallet', text: 'Lizenzvereinbarung' })}, ` +
						`unsere ${termsOfUseLink({ ariaLabel: 'Link zu den Nutzungsbedingungen', text: 'Nutzungsbedingungen' })} ` +
						`und unsere ${privacyPolicyLink({ ariaLabel: 'Link zur Datenschutzrichtlinie', text: 'Datenschutzrichtlinie' })}`
				}
			},
			{
				agreements: {
					licenseAgreement: true,
					termsOfUse: true
				},
				expected: {
					[Languages.ENGLISH]:
						`our ${licenseAgreementLink({ ariaLabel: 'The OISY Wallet License Agreement', text: 'License Agreement' })} ` +
						`and our ${termsOfUseLink({ ariaLabel: 'Terms of Use Link', text: 'Terms of Use' })}`,
					[Languages.ITALIAN]:
						`il nostro ${licenseAgreementLink({ ariaLabel: "L'Accordo di Licenza di OISY Wallet", text: 'Accordo di Licenza' })} ` +
						`e i nostri ${termsOfUseLink({ ariaLabel: 'Link ai termini di utilizzo', text: 'Termini di utilizzo' })}`,
					[Languages.GERMAN]:
						`unsere ${licenseAgreementLink({ ariaLabel: 'Die Lizenzvereinbarung von OISY Wallet', text: 'Lizenzvereinbarung' })} ` +
						`und unsere ${termsOfUseLink({ ariaLabel: 'Link zu den Nutzungsbedingungen', text: 'Nutzungsbedingungen' })}`
				}
			},
			{
				agreements: {
					licenseAgreement: true,
					privacyPolicy: true
				},
				expected: {
					[Languages.ENGLISH]:
						`our ${licenseAgreementLink({ ariaLabel: 'The OISY Wallet License Agreement', text: 'License Agreement' })} ` +
						`and our ${privacyPolicyLink({ ariaLabel: 'Privacy Policy Link', text: 'Privacy Policy' })}`,
					[Languages.ITALIAN]:
						`il nostro ${licenseAgreementLink({ ariaLabel: "L'Accordo di Licenza di OISY Wallet", text: 'Accordo di Licenza' })} ` +
						`e la nostra ${privacyPolicyLink({ ariaLabel: "Link all'informativa sulla privacy", text: 'Politica sulla riservatezza' })}`,
					[Languages.GERMAN]:
						`unsere ${licenseAgreementLink({ ariaLabel: 'Die Lizenzvereinbarung von OISY Wallet', text: 'Lizenzvereinbarung' })} ` +
						`und unsere ${privacyPolicyLink({ ariaLabel: 'Link zur Datenschutzrichtlinie', text: 'Datenschutzrichtlinie' })}`
				}
			},
			{
				agreements: {
					termsOfUse: true,
					privacyPolicy: true
				},
				expected: {
					[Languages.ENGLISH]:
						`our ${termsOfUseLink({ ariaLabel: 'Terms of Use Link', text: 'Terms of Use' })} ` +
						`and our ${privacyPolicyLink({ ariaLabel: 'Privacy Policy Link', text: 'Privacy Policy' })}`,
					[Languages.ITALIAN]:
						`i nostri ${termsOfUseLink({ ariaLabel: 'Link ai termini di utilizzo', text: 'Termini di utilizzo' })} ` +
						`e la nostra ${privacyPolicyLink({ ariaLabel: "Link all'informativa sulla privacy", text: 'Politica sulla riservatezza' })}`,
					[Languages.GERMAN]:
						`unsere ${termsOfUseLink({ ariaLabel: 'Link zu den Nutzungsbedingungen', text: 'Nutzungsbedingungen' })} ` +
						`und unsere ${privacyPolicyLink({ ariaLabel: 'Link zur Datenschutzrichtlinie', text: 'Datenschutzrichtlinie' })}`
				}
			},
			{
				agreements: {
					licenseAgreement: true
				},
				expected: {
					[Languages.ENGLISH]: `our ${licenseAgreementLink({ ariaLabel: 'The OISY Wallet License Agreement', text: 'License Agreement' })}`,
					[Languages.ITALIAN]: `il nostro ${licenseAgreementLink({ ariaLabel: "L'Accordo di Licenza di OISY Wallet", text: 'Accordo di Licenza' })}`,
					[Languages.GERMAN]: `unsere ${licenseAgreementLink({ ariaLabel: 'Die Lizenzvereinbarung von OISY Wallet', text: 'Lizenzvereinbarung' })}`
				}
			},
			{
				agreements: {
					termsOfUse: true
				},
				expected: {
					[Languages.ENGLISH]: `our ${termsOfUseLink({ ariaLabel: 'Terms of Use Link', text: 'Terms of Use' })}`,
					[Languages.ITALIAN]: `i nostri ${termsOfUseLink({ ariaLabel: 'Link ai termini di utilizzo', text: 'Termini di utilizzo' })}`,
					[Languages.GERMAN]: `unsere ${termsOfUseLink({ ariaLabel: 'Link zu den Nutzungsbedingungen', text: 'Nutzungsbedingungen' })}`
				}
			},
			{
				agreements: {
					privacyPolicy: true
				},
				expected: {
					[Languages.ENGLISH]: `our ${privacyPolicyLink({ ariaLabel: 'Privacy Policy Link', text: 'Privacy Policy' })}`,
					[Languages.ITALIAN]: `la nostra ${privacyPolicyLink({ ariaLabel: "Link all'informativa sulla privacy", text: 'Politica sulla riservatezza' })}`,
					[Languages.GERMAN]: `unsere ${privacyPolicyLink({ ariaLabel: 'Link zur Datenschutzrichtlinie', text: 'Datenschutzrichtlinie' })}`
				}
			}
		];

		describe.each([Languages.ENGLISH, Languages.ITALIAN, Languages.GERMAN])(
			'for language: %s',
			(language) => {
				beforeEach(async () => {
					await i18n.switchLang(language);
				});

				it.each(testCases)(
					`should format agreements html correctly for agreements: $agreements`,
					({ agreements, expected }) => {
						expect(
							formatUpdatedAgreementsHtml({
								agreements,
								i18n: get(i18n)
							})
						).toBe(expected[language as UsedLanguages]);
					}
				);
			}
		);
	});
});
