import { render, fireEvent } from '@testing-library/svelte';
import SearchContact from '$lib/components/address-book/SearchContact.svelte';
import { vi } from 'vitest';

describe('SearchContact', () => {
  it('renders the search input with placeholder', () => {
    const { getByPlaceholderText } = render(SearchContact, {
      props: { onSearchChange: () => {} },
    });

    const input = getByPlaceholderText('Search contact');
    expect(input).toBeInTheDocument();
  });

  it('displays IconSearch when input is empty', () => {
    const { container } = render(SearchContact, {
      props: { onSearchChange: () => {} },
    });

    const iconSearch = container.querySelector('svg');
    expect(iconSearch).toBeInTheDocument();
  });

  it('displays IconClose when input has value', async () => {
    const { getByPlaceholderText, container } = render(SearchContact, {
      props: { onSearchChange: () => {} },
    });

    const input = getByPlaceholderText('Search contact');
    await fireEvent.input(input, { target: { value: 'Test' } });

    const iconClose = container.querySelector('svg');
    expect(iconClose).toBeInTheDocument();
  });

  it('calls onSearchChange with the correct value', async () => {
    const mockOnSearchChange = vi.fn();
    const { getByPlaceholderText } = render(SearchContact, {
      props: { onSearchChange: mockOnSearchChange },
    });

    const input = getByPlaceholderText('Search contact');
    await fireEvent.input(input, { target: { value: 'Alice' } });

    expect(mockOnSearchChange).toHaveBeenCalledWith('Alice');
  });

  it('clears the input when IconClose is clicked', async () => {
    const mockOnSearchChange = vi.fn();
    const { getByPlaceholderText, getByLabelText } = render(SearchContact, {
      props: { onSearchChange: mockOnSearchChange },
    });

    const input = getByPlaceholderText('Search contact') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Bob' } });

    const clearButton = getByLabelText('Clear filter');
    await fireEvent.click(clearButton);

    expect(input.value).toBe('');
    expect(mockOnSearchChange).toHaveBeenCalledWith('');
  });
});
