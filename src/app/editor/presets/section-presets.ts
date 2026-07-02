import { Row } from '../../models/email-doc.model';
import { uid } from '../../utils/id.utils';

export interface SectionPreset {
  type: string;
  icon: string;
  label: string;
  build: () => Row;
}

export const SECTION_PRESETS: SectionPreset[] = [
  {
    type: 'header',
    icon: '🔝',
    label: 'Header',
    build: (): Row => ({
      id: uid(),
      backgroundColor: '#ffffff',
      padding: '10px 25px',
      columns: [
        {
          id: uid(),
          blocks: [
            { id: uid(), type: 'image', props: { src: 'https://placehold.co/160x50', alt: 'Logo', width: 160, align: 'left', href: '', padding: '5px' } },
          ],
        },
        {
          id: uid(),
          blocks: [
            { id: uid(), type: 'navbar', props: { links: [
              { label: 'Home', href: '#' },
              { label: 'Shop', href: '#' },
              { label: 'Contact', href: '#' },
            ], align: 'right', backgroundColor: '#ffffff', color: '#333333', fontSize: 14, padding: '5px' } },
          ],
        },
      ],
    }),
  },
  {
    type: 'footer',
    icon: '⬇',
    label: 'Footer',
    build: (): Row => ({
      id: uid(),
      backgroundColor: '#f4f4f4',
      padding: '20px 25px',
      columns: [
        {
          id: uid(),
          blocks: [
            { id: uid(), type: 'divider', props: { borderColor: '#dddddd', borderWidth: 1, padding: '10px 25px' } },
            { id: uid(), type: 'social', props: {
              links: [
                { platform: 'facebook', href: 'https://facebook.com' },
                { platform: 'instagram', href: 'https://instagram.com' },
                { platform: 'twitter', href: 'https://twitter.com' },
              ],
              align: 'center',
              iconSize: 24,
              padding: '10px 25px',
            } },
            { id: uid(), type: 'text', props: {
              html: '<p style="margin:0;text-align:center;font-size:11px;color:#999999">&copy; 2026 Your Company. All rights reserved.<br/>Don\'t want these emails? <a href="#" style="color:#999999">Unsubscribe</a>.</p>',
              align: 'center',
              fontSize: 11,
              color: '#999999',
              padding: '5px 25px',
            } },
          ],
        },
      ],
    }),
  },
  {
    type: 'feature-list',
    icon: '▦',
    label: 'Feature list',
    build: (): Row => ({
      id: uid(),
      backgroundColor: null,
      padding: '20px 10px',
      columns: [0, 1, 2].map(() => ({
        id: uid(),
        blocks: [
          { id: uid(), type: 'image', props: { src: 'https://placehold.co/80x80', alt: 'Feature icon', width: 80, align: 'center', href: '', padding: '10px 15px' } },
          { id: uid(), type: 'heading', props: { text: 'Feature title', level: 3, align: 'center', color: '#222222', padding: '10px 15px 5px' } },
          { id: uid(), type: 'text', props: { html: '<p>Short description of this feature goes here.</p>', align: 'center', fontSize: 13, color: '#666666', padding: '0 15px 10px' } },
        ],
      })),
    }),
  },
  {
    type: 'testimonial',
    icon: '💬',
    label: 'Testimonial',
    build: (): Row => ({
      id: uid(),
      backgroundColor: null,
      padding: '30px 25px',
      columns: [
        {
          id: uid(),
          blocks: [
            { id: uid(), type: 'image', props: { src: 'https://placehold.co/80x80', alt: 'Customer photo', width: 80, align: 'center', href: '', padding: '0 25px 15px' } },
            { id: uid(), type: 'text', props: { html: '<p style="font-style:italic">&ldquo;This product completely changed the way we work. Couldn&rsquo;t be happier with the results.&rdquo;</p>', align: 'center', fontSize: 16, color: '#333333', padding: '0 25px 10px' } },
            { id: uid(), type: 'text', props: { html: '<p style="font-weight:700">Jane Doe <span style="font-weight:400;color:#999999">&mdash; CEO, Acme Inc.</span></p>', align: 'center', fontSize: 13, color: '#333333', padding: '0 25px' } },
          ],
        },
      ],
    }),
  },
  {
    type: 'image-text',
    icon: '⬛',
    label: 'Image + text',
    build: (): Row => ({
      id: uid(),
      backgroundColor: null,
      padding: '20px 10px',
      columns: [
        {
          id: uid(),
          blocks: [
            { id: uid(), type: 'image', props: { src: 'https://placehold.co/280x280', alt: 'Image', width: 280, align: 'center', href: '', padding: '10px 15px' } },
          ],
        },
        {
          id: uid(),
          blocks: [
            { id: uid(), type: 'heading', props: { text: 'Tell your story', level: 2, align: 'left', color: '#222222', padding: '10px 15px 5px' } },
            { id: uid(), type: 'text', props: { html: '<p>Describe your product or offer here. Explain the benefits and why your reader should care.</p>', align: 'left', fontSize: 14, color: '#666666', padding: '0 15px 10px' } },
            { id: uid(), type: 'button', props: { label: 'Learn more', href: '#', bg: '#1a73e8', color: '#ffffff', align: 'left', borderRadius: 3, padding: '0 15px' } },
          ],
        },
      ],
    }),
  },
];
