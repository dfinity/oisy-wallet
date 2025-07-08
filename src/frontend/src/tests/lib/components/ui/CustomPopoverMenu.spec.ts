import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
import TestWrapper from '$tests/lib/components/ui/TestWrapper.test.svelte';
import { POPOVER_MENU_ITEM } from '$lib/constants/test-ids.constants';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { vi } from 'vitest';

describe('CustomPopoverMenu', () => {
  const items = [
    {
      logo: IconTrash,
      title: 'Replace',
      action: vi.fn(),
      testId: POPOVER_MENU_ITEM
    },
    {
      logo: IconTrash,
      title: 'Remove',
      action: vi.fn(),
      testId: POPOVER_MENU_ITEM
    }
  ];

  beforeEach(() => {
    items.forEach(item => vi.mocked(item.action).mockClear());
  });

  it('toggles menu visibility when trigger is clicked', async () => {
    render(TestWrapper, { 
      props: { 
        items,
        title: undefined
      } 
    });
    await tick();

    expect(screen.queryByRole('menu')).toBeNull();

    const triggerBtn = screen.getByText('Test Trigger');
    await fireEvent.click(triggerBtn);
    await tick();

    expect(screen.getByRole('menu')).toBeInTheDocument();

    await fireEvent.click(triggerBtn);
    await tick();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('renders title and executes item action then closes', async () => {
    const { action } = items[0];
    render(TestWrapper, { 
      props: { 
        items, 
        title: 'My Menu'
      } 
    });
    await tick();

    const triggerBtn = screen.getByText('Test Trigger');
    await fireEvent.click(triggerBtn);
    await tick();

    const menu = screen.getByRole('menu');

    expect(within(menu).getByText('My Menu')).toBeInTheDocument();

    const firstItem = within(menu).getByText('Replace');
    await fireEvent.click(firstItem);

    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes menu when clicking outside', async () => {
    render(TestWrapper, { 
      props: { 
        items,
        title: undefined
      } 
    });
    await tick();

    const triggerBtn = screen.getByText('Test Trigger');
    await fireEvent.click(triggerBtn);
    await tick();
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await fireEvent.click(document.body);
    await tick();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});