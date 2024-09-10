/** @jsxImportSource frog/jsx */
import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'

const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: 'Troubleshooting Frame',
})

// Using a public placeholder image
const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/png?text=Troubleshooting+Frame'

app.frame('/', (c) => {
  console.log('Root frame accessed');
  return c.res({
    image: PLACEHOLDER_IMAGE,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/test">Test Button</Button>
    ],
  })
})

app.frame('/test', (c) => {
  console.log('Test frame accessed');
  return c.res({
    image: PLACEHOLDER_IMAGE,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/">Back to Home</Button>
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)