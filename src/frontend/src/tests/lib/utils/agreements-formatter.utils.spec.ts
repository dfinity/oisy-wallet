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

		const testCases = [
			{
				agreements: {
					licenseAgreement: true,
					termsOfUse: true,
					privacyPolicy: true
				},
				expected: {
					[Languages.ENGLISH]:
						'our <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="The OISY Wallet License Agreement">License Agreement <!----></a>, ' +
						'our <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Terms of Use Link">Terms of Use <!----></a>, ' +
						'and our <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Privacy Policy Link">Privacy Policy <!----></a>',
					[Languages.ITALIAN]:
						'il nostro <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="L\'Accordo di Licenza di OISY Wallet">Accordo di Licenza <!----></a>, ' +
						'i nostri <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link ai termini di utilizzo">Termini di utilizzo <!----></a> ' +
						'e la nostra <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link all\'informativa sulla privacy">Politica sulla riservatezza <!----></a>',
					[Languages.GERMAN]:
						'unsere <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Die Lizenzvereinbarung von OISY Wallet">Lizenzvereinbarung <!----></a>, ' +
						'unsere <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link zu den Nutzungsbedingungen">Nutzungsbedingungen <!----></a> ' +
						'und unsere <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link zur Datenschutzrichtlinie">Datenschutzrichtlinie <!----></a>'
				}
			},
			{
				agreements: {
					licenseAgreement: true,
					termsOfUse: true
				},
				expected: {
					[Languages.ENGLISH]:
						'our <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="The OISY Wallet License Agreement">License Agreement <!----></a> ' +
						'and our <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Terms of Use Link">Terms of Use <!----></a>',
					[Languages.ITALIAN]:
						'il nostro <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="L\'Accordo di Licenza di OISY Wallet">Accordo di Licenza <!----></a> ' +
						'e i nostri <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link ai termini di utilizzo">Termini di utilizzo <!----></a>',
					[Languages.GERMAN]:
						'unsere <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Die Lizenzvereinbarung von OISY Wallet">Lizenzvereinbarung <!----></a> ' +
						'und unsere <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link zu den Nutzungsbedingungen">Nutzungsbedingungen <!----></a>'
				}
			},
			{
				agreements: {
					licenseAgreement: true,
					privacyPolicy: true
				},
				expected: {
					[Languages.ENGLISH]:
						'our <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="The OISY Wallet License Agreement">License Agreement <!----></a> ' +
						'and our <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Privacy Policy Link">Privacy Policy <!----></a>',
					[Languages.ITALIAN]:
						'il nostro <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="L\'Accordo di Licenza di OISY Wallet">Accordo di Licenza <!----></a> ' +
						'e la nostra <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link all\'informativa sulla privacy">Politica sulla riservatezza <!----></a>',
					[Languages.GERMAN]:
						'unsere <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Die Lizenzvereinbarung von OISY Wallet">Lizenzvereinbarung <!----></a> ' +
						'und unsere <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link zur Datenschutzrichtlinie">Datenschutzrichtlinie <!----></a>'
				}
			},
			{
				agreements: {
					termsOfUse: true,
					privacyPolicy: true
				},
				expected: {
					[Languages.ENGLISH]:
						'our <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Terms of Use Link">Terms of Use <!----></a> ' +
						'and our <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Privacy Policy Link">Privacy Policy <!----></a>',
					[Languages.ITALIAN]:
						'i nostri <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link ai termini di utilizzo">Termini di utilizzo <!----></a> ' +
						'e la nostra <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link all\'informativa sulla privacy">Politica sulla riservatezza <!----></a>',
					[Languages.GERMAN]:
						'unsere <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link zu den Nutzungsbedingungen">Nutzungsbedingungen <!----></a> ' +
						'und unsere <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link zur Datenschutzrichtlinie">Datenschutzrichtlinie <!----></a>'
				}
			},
			{
				agreements: {
					licenseAgreement: true
				},
				expected: {
					[Languages.ENGLISH]:
						'our <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="The OISY Wallet License Agreement">License Agreement <!----></a>',
					[Languages.ITALIAN]:
						'il nostro <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="L\'Accordo di Licenza di OISY Wallet">Accordo di Licenza <!----></a>',
					[Languages.GERMAN]:
						'unsere <a href="/license-agreement" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Die Lizenzvereinbarung von OISY Wallet">Lizenzvereinbarung <!----></a>'
				}
			},
			{
				agreements: {
					termsOfUse: true
				},
				expected: {
					[Languages.ENGLISH]:
						'our <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Terms of Use Link">Terms of Use <!----></a>',
					[Languages.ITALIAN]:
						'i nostri <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link ai termini di utilizzo">Termini di utilizzo <!----></a>',
					[Languages.GERMAN]:
						'unsere <a href="/terms-of-use" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link zu den Nutzungsbedingungen">Nutzungsbedingungen <!----></a>'
				}
			},
			{
				agreements: {
					privacyPolicy: true
				},
				expected: {
					[Languages.ENGLISH]:
						'our <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Privacy Policy Link">Privacy Policy <!----></a>',
					[Languages.ITALIAN]:
						'la nostra <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link all\'informativa sulla privacy">Politica sulla riservatezza <!----></a>',
					[Languages.GERMAN]:
						'unsere <a href="/privacy-policy" target="_blank" class="inline-flex items-center gap-1 active:text-brand-secondary hover:text-brand-secondary text-brand-primary-alt" aria-label="Link zur Datenschutzrichtlinie">Datenschutzrichtlinie <!----></a>'
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
