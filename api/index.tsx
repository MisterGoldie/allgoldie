/** @jsxImportSource frog/jsx */
import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'

const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: 'Scary Garys NFT Checker',
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
)

// Using a placeholder image from placekitten.com
const PLACEHOLDER_IMAGE = 'https://placekitten.com/1200/630'

app.frame('/', (c) => {
  console.log('Rendering initial frame');
  try {
    return c.res({
      image: PLACEHOLDER_IMAGE,
      imageAspectRatio: '1.91:1',
      intents: [
        <Button action="/check">Check Scary Garys NFTs</Button>
      ],
    })
  } catch (error) {
    console.error('Error in root frame:', error);
    return c.res({
      image: PLACEHOLDER_IMAGE,
      imageAspectRatio: '1.91:1',
      intents: [
        <Button action="/">Error occurred. Retry?</Button>
      ],
    })
  }
})

app.frame('/check', async (c) => {
  console.log('Check frame called');
  console.log('Full frameData:', JSON.stringify(c.frameData, null, 2));

  return c.res({
    image: PLACEHOLDER_IMAGE,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/">Back to Start</Button>
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)