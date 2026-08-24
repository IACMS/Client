import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SidebarProvider, useSidebar } from '../SidebarContext';

function TestConsumer() {
  const { open, toggle, close } = useSidebar();
  return (
    <div>
      <span data-testid="status">{open ? 'open' : 'closed'}</span>
      <button onClick={toggle}>Toggle</button>
      <button onClick={close}>Close</button>
    </div>
  );
}

describe('SidebarContext', () => {
  it('provides default closed state and allows toggling and closing', () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId('status').textContent).toBe('closed');

    act(() => {
      screen.getByText('Toggle').click();
    });
    expect(screen.getByTestId('status').textContent).toBe('open');

    act(() => {
      screen.getByText('Close').click();
    });
    expect(screen.getByTestId('status').textContent).toBe('closed');
  });
});
