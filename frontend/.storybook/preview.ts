import '../src/core/styles/global.css'
import '../src/core/styles/tailwind.css'
import './preview.css'

import type { Preview } from '@storybook/react-vite'

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: {
      expanded: true,
    },
    docs: {
      source: {
        type: 'dynamic',
      },
    },
  },
}

export default preview
