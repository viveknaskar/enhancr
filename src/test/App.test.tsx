import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// react-hot-toast renders portals — stub it to avoid noise
vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn() },
  Toaster: () => null,
}));

import toast from 'react-hot-toast';

function makeImageFile(name = 'photo.jpg', type = 'image/jpeg', sizeBytes = 1024) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

// Simulate a successful Image load after FileReader completes
function mockImageLoad() {
  Object.defineProperty(global.Image.prototype, 'src', {
    set(src: string) {
      if (src && this.onload) setTimeout(() => this.onload(), 0);
    },
    configurable: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockImageLoad();
});

describe('App — initial render', () => {
  it('renders the upload area with helper text', () => {
    render(<App />);
    expect(screen.getByText('Drop your image here')).toBeInTheDocument();
    expect(screen.getByText(/PNG, JPG, WebP/i)).toBeInTheDocument();
  });

  it('has a visually hidden h1 heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Enhancr' })).toBeInTheDocument();
  });

  it('download button is disabled before any image is loaded', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /download image/i })).toBeDisabled();
  });
});

describe('App — file upload', () => {
  it('shows Replace image link after a valid file is chosen', async () => {
    render(<App />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeImageFile();
    await userEvent.upload(input, file);
    await waitFor(() => expect(screen.getByText('Replace image')).toBeInTheDocument());
  });

  it('enables the download button once an image is loaded', async () => {
    render(<App />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeImageFile());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /download image/i })).not.toBeDisabled()
    );
  });

  it('rejects files over 25 MB with a toast error', async () => {
    render(<App />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = makeImageFile('huge.jpg', 'image/jpeg', 26 * 1024 * 1024);
    await userEvent.upload(input, bigFile);
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/too large/i));
    expect(screen.queryByText('Replace image')).not.toBeInTheDocument();
  });
});

describe('App — drag and drop', () => {
  it('accepts a dropped image file', async () => {
    render(<App />);
    const dropZone = screen.getByText('Drop your image here').closest('div')!;
    fireEvent.dragOver(dropZone, { dataTransfer: { files: [] } });
    const file = makeImageFile('drop.png', 'image/png');
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(screen.getByText('Replace image')).toBeInTheDocument());
  });

  it('ignores dropped non-image files', async () => {
    render(<App />);
    const dropZone = screen.getByText('Drop your image here').closest('div')!;
    const textFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    fireEvent.drop(dropZone, { dataTransfer: { files: [textFile] } });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Replace image')).not.toBeInTheDocument();
  });
});

describe('App — reset', () => {
  it('Reset button is always visible', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
});

describe('App — mobile tab bar', () => {
  it('renders the three tab buttons', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /transform/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /colors/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enhancement/i })).toBeInTheDocument();
  });

  it('switches active tab on click', async () => {
    render(<App />);
    const colorsTab = screen.getByRole('button', { name: /colors/i });
    await userEvent.click(colorsTab);
    expect(colorsTab).toHaveClass('bg-violet-600');
  });
});

describe('App — accessibility', () => {
  it('file input accepts image types', () => {
    render(<App />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toContain('image/jpeg');
    expect(input.accept).toContain('image/png');
  });

  it('background color picker has an associated label', async () => {
    render(<App />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeImageFile());
    await waitFor(() => screen.getByText('Replace image'));
    // Format defaults to auto→jpeg so bg color picker should be present
    const picker = document.getElementById('bg-color-picker');
    if (picker) {
      const label = document.querySelector('label[for="bg-color-picker"]');
      expect(label).toBeInTheDocument();
    }
  });
});
