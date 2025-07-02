import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import DelayedTooltip from '$lib/components/ui/DelayedTooltip.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { tick } from 'svelte';
import { vi } from 'vitest';

describe('DelayedTooltip', () => {
  const testId = 'test-content';
  const children = createMockSnippet(testId);

  const waitForTooltip = async (advanceBy = 1600) => {
    vi.advanceTimersByTime(advanceBy);
  
    return await waitFor(() => {
      const tooltip = document.querySelector('[role="tooltip"]');
      if (!tooltip) {
        throw new Error('Tooltip not found. DOM:\n' + document.body.innerHTML);
      }
      return tooltip;
    });
  };
  

  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });
  

  it('renders children content', async () => {
    render(DelayedTooltip, {
      props: { text: 'Tooltip text', children }
    });

    await tick();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
    expect(screen.getByText('Mock Snippet')).toBeInTheDocument();
  });

  it('does not show tooltip before delay completes', async () => {
    render(DelayedTooltip, {
      props: { text: 'Tooltip text', delay: 1600, children }
    });

    const content = screen.getByTestId(testId);
    await fireEvent.mouseEnter(content);

    vi.advanceTimersByTime(400);
    await tick();
    await Promise.resolve();

    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('cancels pending tooltip if mouse leaves before delay', async () => {
    render(DelayedTooltip, {
      props: { text: 'Tooltip text', delay: 1600, children }
    });

    const content = screen.getByTestId(testId);
    await fireEvent.mouseEnter(content);
    vi.advanceTimersByTime(500);
    await fireEvent.mouseLeave(content);

    vi.advanceTimersByTime(1100);
    await tick();
    await Promise.resolve();

    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('renders without children', async () => {
    render(DelayedTooltip, {
      props: { text: 'Tooltip text' }
    });

    await tick();
    expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
  });
});
