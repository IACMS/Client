
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WriteRichAttachmentModal from '../WriteRichAttachmentModal';

vi.mock('../LetterRichTextEditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="rich-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock('@/lib/filesApi', () => ({
  FMS_CASE_SERVICE: 'case-service',
  FMS_MODULE_ATTACHMENT: 'attachment',
  fmsFilePath: (id: string) => `/files/${id}`,
  uploadAndWaitAvailable: vi.fn().mockResolvedValue({ id: 'file-123', size: 1024 }),
}));

vi.mock('@/lib/api', () => ({
  apiPost: vi.fn().mockResolvedValue({ id: 'att-1' }),
  ApiError: class ApiError extends Error {},
}));

describe('WriteRichAttachmentModal', () => {
  it('does not render when open is false', () => {
    const { container } = render(
      <WriteRichAttachmentModal
        open={false}
        onClose={vi.fn()}
        caseId="case-1"
        onSaved={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal title, document title input, and save buttons when open', () => {
    const onClose = vi.fn();
    render(
      <WriteRichAttachmentModal
        open={true}
        onClose={onClose}
        caseId="case-1"
        onSaved={vi.fn()}
      />
    );

    expect(screen.getByText(/Write Rich Text Note \/ Document/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Field Assessment Note/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
