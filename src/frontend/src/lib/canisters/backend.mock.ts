import type { Contact, ContactGroup, ContactNetwork } from '$declarations/backend/backend.did';
import { BackendCanister } from './backend.canister';
import { ContactOperationError } from './backend.contact.errors';

/**
 * Mock implementation of the BackendCanister for testing purposes
 */
export class MockBackendCanister extends BackendCanister {
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

  // Override contact methods with mock implementations
  override getContacts = (): Promise<Contact[]> => {
    return Promise.resolve(this.mockContacts);
  };

  override getContactGroups = (): Promise<ContactGroup[]> => {
    return Promise.resolve(this.mockContactGroups);
  };

  override addContact = async ({ 
    contact, 
    currentUserVersion 
  }: { 
    contact: Contact; 
    currentUserVersion?: bigint 
  }): Promise<void> => {
    // Check if contact already exists
    const exists = this.mockContacts.some(
      c => c.address === contact.address && 
           JSON.stringify(c.network) === JSON.stringify(contact.network)
    );
    
    if (exists) {
      throw new ContactOperationError(
        'CONTACT_ALREADY_EXISTS',
        'A contact with this address and network already exists.'
      );
    }
    
    this.mockContacts.push(contact);
    return Promise.resolve();
  };

  override updateContact = async ({ 
    address, 
    network, 
    alias, 
    notes, 
    group, 
    isFavorite, 
    currentUserVersion 
  }: { 
    address: string; 
    network: ContactNetwork; 
    alias: string; 
    notes: string | null; 
    group: string | null; 
    isFavorite: boolean; 
    currentUserVersion?: bigint 
  }): Promise<void> => {
    const index = this.mockContacts.findIndex(
      c => c.address === address && JSON.stringify(c.network) === JSON.stringify(network)
    );
    
    if (index === -1) {
      throw new ContactOperationError(
        'CONTACT_NOT_FOUND',
        'The specified contact could not be found.'
      );
    }
    
    // Check if group exists if specified
    if (group && !this.mockContactGroups.some(g => g.name === group)) {
      throw new ContactOperationError(
        'GROUP_NOT_FOUND',
        'The specified contact group could not be found.'
      );
    }
    
    this.mockContacts[index] = {
      ...this.mockContacts[index],
      alias,
      notes,
      group,
      is_favorite: isFavorite
    };
    
    return Promise.resolve();
  };

  override deleteContact = async ({ 
    address, 
    network, 
    currentUserVersion 
  }: { 
    address: string; 
    network: ContactNetwork; 
    currentUserVersion?: bigint 
  }): Promise<void> => {
    const index = this.mockContacts.findIndex(
      c => c.address === address && JSON.stringify(c.network) === JSON.stringify(network)
    );
    
    if (index === -1) {
      throw new ContactOperationError(
        'CONTACT_NOT_FOUND',
        'The specified contact could not be found.'
      );
    }
    
    this.mockContacts.splice(index, 1);
    return Promise.resolve();
  };

  override toggleContactFavorite = async ({ 
    address, 
    network, 
    isFavorite, 
    currentUserVersion 
  }: { 
    address: string; 
    network: ContactNetwork; 
    isFavorite: boolean; 
    currentUserVersion?: bigint 
  }): Promise<void> => {
    const index = this.mockContacts.findIndex(
      c => c.address === address && JSON.stringify(c.network) === JSON.stringify(network)
    );
    
    if (index === -1) {
      throw new ContactOperationError(
        'CONTACT_NOT_FOUND',
        'The specified contact could not be found.'
      );
    }
    
    this.mockContacts[index].is_favorite = isFavorite;
    
    // Update last_used if marking as favorite
    if (isFavorite) {
      this.mockContacts[index].last_used = BigInt(Date.now());
    }
    
    return Promise.resolve();
  };

  override addContactGroup = async ({ 
    group, 
    currentUserVersion 
  }: { 
    group: ContactGroup; 
    currentUserVersion?: bigint 
  }): Promise<void> => {
    // Check if group already exists
    if (this.mockContactGroups.some(g => g.name === group.name)) {
      throw new ContactOperationError(
        'GROUP_ALREADY_EXISTS',
        'A contact group with this name already exists.'
      );
    }
    
    this.mockContactGroups.push(group);
    return Promise.resolve();
  };

  override updateContactGroup = async ({ 
    name, 
    description, 
    icon, 
    currentUserVersion 
  }: { 
    name: string; 
    description: string | null; 
    icon: string | null; 
    currentUserVersion?: bigint 
  }): Promise<void> => {
    const index = this.mockContactGroups.findIndex(g => g.name === name);
    
    if (index === -1) {
      throw new ContactOperationError(
        'GROUP_NOT_FOUND',
        'The specified contact group could not be found.'
      );
    }
    
    this.mockContactGroups[index] = {
      ...this.mockContactGroups[index],
      description,
      icon
    };
    
    return Promise.resolve();
  };

  override deleteContactGroup = async ({ 
    name, 
    currentUserVersion 
  }: { 
    name: string; 
    currentUserVersion?: bigint 
  }): Promise<void> => {
    const index = this.mockContactGroups.findIndex(g => g.name === name);
    
    if (index === -1) {
      throw new ContactOperationError(
        'GROUP_NOT_FOUND',
        'The specified contact group could not be found.'
      );
    }
    
    // Check if group is in use
    if (this.mockContacts.some(c => c.group === name)) {
      throw new ContactOperationError(
        'GROUP_IN_USE',
        'This contact group cannot be deleted because it is still being used by one or more contacts.'
      );
    }
    
    this.mockContactGroups.splice(index, 1);
    return Promise.resolve();
  };
}