import { describe, expect, it } from 'vitest';
import { getSubmissionPreview } from './submission-utils';

describe('getSubmissionPreview', () => {
  it('lists all uploaded file names', () => {
    const dataJson = JSON.stringify({
      attachment: [
        { fileName: 'brief.pdf', fileUrl: '/api/files/one' },
        { fileName: 'image.png', fileUrl: '/api/files/two' },
      ],
    });

    expect(getSubmissionPreview(dataJson)).toBe('brief.pdf, image.png');
  });
});
