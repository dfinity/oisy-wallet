export const themeVariables = {
	screens: {
		// we need to use rem instead of px because the default tailwind values changed to rem,
		// and mixing units breaks custom screen definitions
		xs: '28rem', // 448px
		'1.5md': '56rem', // 896px
		'1.5lg': '72rem', // 1152px
		'1.5xl': '88rem', // 1408px
		'2.5xl': '108rem', // 1728px
		'h-md': { raw: '(max-height: 68rem)' } // ~1090px
	},
	background: {
		page: 'var(--color-background-page)',
		surface: 'var(--color-background-surface)',
		primary: 'var(--color-background-primary)',
		'primary-light': 'var(--color-background-primary-light)',
		'primary-alt': 'var(--color-background-primary-alt)',
		'primary-inverted': 'var(--color-background-primary-inverted)',
		'primary-inverted-alt': 'var(--color-background-primary-inverted-alt)',
		secondary: 'var(--color-background-secondary)',
		'secondary-alt': 'var(--color-background-secondary-alt)',
		'secondary-inverted': 'var(--color-background-secondary-inverted)',
		tertiary: 'var(--color-background-tertiary)',
		'tertiary-alt': 'var(--color-background-tertiary-alt)',
		'tertiary-inverted': 'var(--color-background-tertiary-inverted)',
		disabled: 'var(--color-background-disabled)',
		'disabled-alt': 'var(--color-background-disabled-alt)',
		'disabled-alt2': 'var(--color-background-disabled-alt2)',
		brand: {
			'subtle-5': 'var(--color-background-brand-subtle-5)',
			'subtle-10': 'var(--color-background-brand-subtle-10)',
			'subtle-20': 'var(--color-background-brand-subtle-20)',
			'subtle-30': 'var(--color-background-brand-subtle-30)',
			primary: 'var(--color-background-brand-primary)',
			secondary: 'var(--color-background-brand-secondary)',
			tertiary: 'var(--color-background-brand-tertiary)',
			disabled: 'var(--color-background-brand-disabled)',
			light: 'var(--color-background-brand-light)'
		},
		success: {
			'subtle-10': 'var(--color-background-success-subtle-10)',
			'subtle-20': 'var(--color-background-success-subtle-20)',
			'subtle-30': 'var(--color-background-success-subtle-30)',
			primary: 'var(--color-background-success-primary)',
			secondary: 'var(--color-background-success-secondary)',
			tertiary: 'var(--color-background-success-tertiary)',
			light: 'var(--color-background-success-light)'
		},
		warning: {
			'subtle-10': 'var(--color-background-warning-subtle-10)',
			'subtle-20': 'var(--color-background-warning-subtle-20)',
			'subtle-30': 'var(--color-background-warning-subtle-30)',
			primary: 'var(--color-background-warning-primary)',
			secondary: 'var(--color-background-warning-secondary)',
			tertiary: 'var(--color-background-warning-tertiary)',
			light: 'var(--color-background-warning-light)'
		},
		error: {
			'subtle-10': 'var(--color-background-error-subtle-10)',
			'subtle-20': 'var(--color-background-error-subtle-20)',
			'subtle-30': 'var(--color-background-error-subtle-30)',
			primary: 'var(--color-background-error-primary)',
			secondary: 'var(--color-background-error-secondary)',
			tertiary: 'var(--color-background-error-tertiary)',
			light: 'var(--color-background-error-light)'
		},
		contact: {
			'1': 'var(--color-background-contact-1)',
			'2': 'var(--color-background-contact-2)',
			'3': 'var(--color-background-contact-3)',
			'4': 'var(--color-background-contact-4)',
			'5': 'var(--color-background-contact-5)',
			'6': 'var(--color-background-contact-6)',
			'7': 'var(--color-background-contact-7)',
			'8': 'var(--color-background-contact-8)',
			'9': 'var(--color-background-contact-9)'
		},
		overlay: {
			'page-30': 'color-mix(in srgb, var(--color-background-page) 30%, transparent)'
		}
	},
	border: {
		basic: 'var(--color-border-basic)',
		primary: 'var(--color-border-primary)',
		'primary-inverted': 'var(--color-border-primary-inverted)',
		secondary: 'var(--color-border-secondary)',
		'secondary-inverted': 'var(--color-border-secondary-inverted)',
		tertiary: 'var(--color-border-tertiary)',
		'tertiary-inverted': 'var(--color-border-tertiary-inverted)',
		disabled: 'var(--color-border-disabled)',
		brand: {
			'subtle-10': 'var(--color-border-brand-subtle-10)',
			'subtle-20': 'var(--color-border-brand-subtle-20)',
			'subtle-30': 'var(--color-border-brand-subtle-30)',
			primary: 'var(--color-border-brand-primary)',
			secondary: 'var(--color-border-brand-secondary)',
			tertiary: 'var(--color-border-brand-tertiary)',
			disabled: 'var(--color-border-brand-disabled)'
		},
		success: {
			'subtle-10': 'var(--color-border-success-subtle-10)',
			'subtle-20': 'var(--color-border-success-subtle-20)',
			'subtle-30': 'var(--color-border-success-subtle-30)',
			solid: 'var(--color-border-success-solid)',
			'solid-alt': 'var(--color-border-success-solid-alt)'
		},
		warning: {
			'subtle-10': 'var(--color-border-warning-subtle-10)',
			'subtle-20': 'var(--color-border-warning-subtle-20)',
			'subtle-30': 'var(--color-border-warning-subtle-30)',
			solid: 'var(--color-border-warning-solid)',
			'solid-alt': 'var(--color-border-warning-solid-alt)'
		},
		error: {
			'subtle-10': 'var(--color-border-error-subtle-10)',
			'subtle-20': 'var(--color-border-error-subtle-20)',
			'subtle-30': 'var(--color-border-error-subtle-30)',
			solid: 'var(--color-border-error-solid)',
			'solid-alt': 'var(--color-border-error-solid-alt)'
		}
	},
	foreground: {
		primary: 'var(--color-foreground-primary)',
		'primary-inverted': 'var(--color-foreground-primary-inverted)',
		'primary-inverted-alt': 'var(--color-foreground-primary-inverted-alt)',
		secondary: 'var(--color-foreground-secondary)',
		'secondary-inverted': 'var(--color-foreground-secondary-inverted)',
		tertiary: 'var(--color-foreground-tertiary)',
		'tertiary-inverted': 'var(--color-foreground-tertiary-inverted)',
		disabled: 'var(--color-foreground-disabled)',
		brand: {
			primary: 'var(--color-foreground-brand-primary)',
			'primary-alt': 'var(--color-foreground-brand-primary-alt)',
			'primary-inverted': 'var(--color-foreground-brand-primary-inverted)',
			secondary: 'var(--color-foreground-brand-secondary)',
			'secondary-alt': 'var(--color-foreground-brand-secondary-alt)',
			tertiary: 'var(--color-foreground-brand-tertiary)',
			'tertiary-alt': 'var(--color-foreground-brand-tertiary-alt)',
			disabled: 'var(--color-foreground-brand-disabled)'
		},
		'success-primary': 'var(--color-foreground-success-primary)',
		'success-alt': 'var(--color-foreground-success-alt)',
		'success-secondary': 'var(--color-foreground-success-secondary)',
		'warning-primary': 'var(--color-foreground-warning-primary)',
		'warning-alt': 'var(--color-foreground-warning-alt)',
		'error-primary': 'var(--color-foreground-error-primary)',
		'error-alt': 'var(--color-foreground-error-alt)',
		'error-secondary': 'var(--color-foreground-error-secondary)',
		contact: {
			'1': 'var(--color-foreground-contact-1)',
			'2': 'var(--color-foreground-contact-2)',
			'3': 'var(--color-foreground-contact-3)',
			'4': 'var(--color-foreground-contact-4)',
			'5': 'var(--color-foreground-contact-5)',
			'6': 'var(--color-foreground-contact-6)',
			'7': 'var(--color-foreground-contact-7)',
			'8': 'var(--color-foreground-contact-8)',
			'9': 'var(--color-foreground-contact-9)'
		}
	},

	// custom hard coded gradient colors
	gradient: {
		'default-0': '#016DFC',
		'default-100': '#004EB5',
		'icp-0': '#3607B1',
		'icp-100': '#1E0071',
		'btc-0': '#F7931A',
		'btc-100': '#DE7900',
		'eth-0': '#627EEA',
		'eth-100': '#E18DFF',
		'base-0': '#0066FF',
		'base-100': '#0066FF',
		'bsc-0': '#FB8202',
		'bsc-100': '#FEBE38',
		'polygon-0': '#6C00F6',
		'polygon-100': '#4301A9',
		'sol-0': '#904EFA',
		'sol-100': '#1DE59D',
		'trump-0': '#232BCC',
		'trump-100': '#000797',
		'gold-0': '#CCA055',
		'gold-100': '#EBD27F',
		'arbitrum-0': '#11AAFF',
		'arbitrum-100': '#203147'
	}
};
