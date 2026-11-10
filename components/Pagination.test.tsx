import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Pagination from './Pagination';

const href = (page: number) => `/items?page=${page}`;

describe('Pagination', () => {
  it('links to the previous and next pages', () => {
    render(<Pagination page={2} lastPage={3} href={href} />);

    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/items?page=1');
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/items?page=3');
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('has no previous link on the first page and no next link on the last', () => {
    const { rerender } = render(<Pagination page={1} lastPage={3} href={href} />);

    expect(screen.queryByRole('link', { name: 'Previous' })).toBeNull();

    rerender(<Pagination page={3} lastPage={3} href={href} />);

    expect(screen.queryByRole('link', { name: 'Next' })).toBeNull();
  });

  it('renders nothing when everything fits on one page', () => {
    const { container } = render(<Pagination page={1} lastPage={1} href={href} />);

    expect(container).toBeEmptyDOMElement();
  });
});
