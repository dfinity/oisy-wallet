import { Canister, createServices, type QueryParams } from '@dfinity/utils';
import { idlFactory as idlFactoryBackend } from '$declarations/backend/backend.factory.did';
import { idlFactory as idlCertifiedFactoryBackend } from '$declarations/backend/backend.factory.certified.did';
import type { Contact, ContactGroup, ContactNetwork } from '$declarations/backend/backend.did';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { getAgent } from '$lib/actors/agents.ic';

export class ContactsCanister extends Canister<any> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<any>): Promise<ContactsCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<any>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryBackend,
			certifiedIdlFactory: idlCertifiedFactoryBackend
		});

		return new ContactsCanister(canisterId, service, certifiedService);
	}

	// Mock data for contacts
	private mockContacts: Contact[] = [
		{
			address: '0x1234567890abcdef1234567890abcdef12345678',
			alias: 'John Doe',
			notes: 'My Ethereum friend',
			network: { Ethereum: null },
			group: 'Friends',
			is_favorite: true,
			last_used: BigInt(Date.now())
		},
		{
			address: '0x2345678901abcdef2345678901abcdef23456789',
			alias: 'Jane Smith',
			notes: 'Work colleague',
			network: { Ethereum: null },
			group: 'Work',
			is_favorite: false,
			last_used: null
		},
		{
			address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
			alias: 'Bob Johnson',
			notes: 'Bitcoin trader',
			network: { Bitcoin: null },
			group: 'Business',
			is_favorite: true,
			last_used: BigInt(Date.now() - 86400000) // 1 day ago
		},
		{
			address: '5KJvsngHeMpm884wtkJNzQGaCErckhHJBGFsvd3VyK5qMZXj3hS',
			alias: 'Alice Williams',
			notes: 'Bitcoin investor',
			network: { Bitcoin: null },
			group: 'Investors',
			is_favorite: false,
			last_used: null
		},
		{
			address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
			alias: 'Charlie Brown',
			notes: 'Ripple enthusiast',
			network: { InternetComputer: null },
			group: 'Crypto Friends',
			is_favorite: true,
			last_used: BigInt(Date.now() - 172800000) // 2 days ago
		},
		{
			address: '9XDJJDsP6Sd9TQzpzCEt8wPp4oKvgXgZtAw4Z5JQhzKJ',
			alias: 'David Miller',
			notes: 'Solana developer',
			network: { Solana: null },
			group: 'Developers',
			is_favorite: false,
			last_used: BigInt(Date.now() - 259200000) // 3 days ago
		},
		{
			address: 'tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb',
			alias: 'Eva Garcia',
			notes: 'Tezos fan',
			network: { InternetComputer: null },
			group: 'Crypto Friends',
			is_favorite: true,
			last_used: BigInt(Date.now() - 345600000) // 4 days ago
		},
		{
			address: '0x3456789012abcdef3456789012abcdef34567890',
			alias: 'Frank Wilson',
			notes: 'Ethereum developer',
			network: { Ethereum: null },
			group: 'Developers',
			is_favorite: false,
			last_used: null
		},
		{
			address: 'cosmos1z8mzakma7vnaajysmtkwt4wgjqr2m84tzvyfkz',
			alias: 'Grace Lee',
			notes: 'Cosmos validator',
			network: { InternetComputer: null },
			group: 'Validators',
			is_favorite: true,
			last_used: BigInt(Date.now() - 432000000) // 5 days ago
		},
		{
			address: 'addr1qxck7azyc8wqxll7s48xzqt0kjxv7k9lauz6xgartmrxvjf5j9uh4jp0v0xf8603zs7jz9fy8h4juhazccj6s3a00h3qj4p8xz',
			alias: 'Henry Taylor',
			notes: 'Cardano enthusiast',
			network: { InternetComputer: null },
			group: 'Crypto Friends',
			is_favorite: false,
			last_used: null
		}
	];

	// Mock data for contact groups
	private mockContactGroups: ContactGroup[] = [
		{
			name: 'Friends',
			description: 'Personal friends',
			icon: '👥'
		},
		{
			name: 'Work',
			description: 'Work colleagues',
			icon: '💼'
		},
		{
			name: 'Business',
			description: 'Business contacts',
			icon: '🤝'
		},
		{
			name: 'Investors',
			description: 'Investment partners',
			icon: '💰'
		},
		{
			name: 'Crypto Friends',
			description: 'Cryptocurrency enthusiasts',
			icon: '🪙'
		},
		{
			name: 'Developers',
			description: 'Software developers',
			icon: '👨‍💻'
		},
		{
			name: 'Validators',
			description: 'Blockchain validators',
			icon: '✅'
		}
	];

	// Contact methods
	getContacts = ({ certified = true }: QueryParams = {}): Promise<Contact[]> => {
		// In a real implementation, this would call the backend service
		// const { get_contacts } = this.caller({ certified });
		// return get_contacts();

		// For mock purposes, return the mock data
		return Promise.resolve(this.mockContacts);
	};

	getContactGroups = ({ certified = true }: QueryParams = {}): Promise<ContactGroup[]> => {
		// In a real implementation, this would call the backend service
		// const { get_contact_groups } = this.caller({ certified });
		// return get_contact_groups();

		// For mock purposes, return the mock data
		return Promise.resolve(this.mockContactGroups);
	};

	// Add more methods as needed for contact management
	// These would typically call the corresponding backend methods
	// but for now they just manipulate the mock data

	addContact = (contact: Contact): Promise<null> => {
		this.mockContacts.push(contact);
		return Promise.resolve(null);
	};

	updateContact = (address: string, network: ContactNetwork, updates: Partial<Contact>): Promise<null> => {
		const index = this.mockContacts.findIndex(
			(c) => c.address === address && JSON.stringify(c.network) === JSON.stringify(network)
		);
		if (index !== -1) {
			this.mockContacts[index] = { ...this.mockContacts[index], ...updates };
		}
		return Promise.resolve(null);
	};

	deleteContact = (address: string, network: ContactNetwork): Promise<null> => {
		this.mockContacts = this.mockContacts.filter(
			(c) => !(c.address === address && JSON.stringify(c.network) === JSON.stringify(network))
		);
		return Promise.resolve(null);
	};

	addContactGroup = (group: ContactGroup): Promise<null> => {
		this.mockContactGroups.push(group);
		return Promise.resolve(null);
	};

	updateContactGroup = (name: string, updates: Partial<ContactGroup>): Promise<null> => {
		const index = this.mockContactGroups.findIndex((g) => g.name === name);
		if (index !== -1) {
			this.mockContactGroups[index] = { ...this.mockContactGroups[index], ...updates };
		}
		return Promise.resolve(null);
	};

	deleteContactGroup = (name: string): Promise<null> => {
		this.mockContactGroups = this.mockContactGroups.filter((g) => g.name !== name);
		return Promise.resolve(null);
	};
}