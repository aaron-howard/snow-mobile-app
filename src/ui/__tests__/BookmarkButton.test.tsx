import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BookmarkButton } from '../BookmarkButton';

describe('BookmarkButton', () => {
  test('reflects the inactive state in its accessibility label', () => {
    const { getByLabelText } = render(
      <BookmarkButton active={false} onToggle={jest.fn()} itemLabel="question" />,
    );
    expect(getByLabelText('Bookmark this question')).toBeTruthy();
  });

  test('reflects the active state in its accessibility label', () => {
    const { getByLabelText } = render(
      <BookmarkButton active onToggle={jest.fn()} itemLabel="question" />,
    );
    const button = getByLabelText('Remove bookmark for this question');
    expect(button.props.accessibilityState).toMatchObject({ selected: true });
  });

  test('invokes onToggle when pressed', () => {
    const onToggle = jest.fn();
    const { getByLabelText } = render(<BookmarkButton active={false} onToggle={onToggle} />);
    fireEvent.press(getByLabelText('Bookmark this item'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('does not toggle when disabled', () => {
    const onToggle = jest.fn();
    const { getByLabelText } = render(
      <BookmarkButton active={false} onToggle={onToggle} disabled />,
    );
    fireEvent.press(getByLabelText('Bookmark this item'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
