/** @jsxImportSource frog/jsx */
import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'
import axios from 'axios'

const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: 'Frame Interaction Checker',
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
)

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql'
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'

interface CastInfo {
  castedAtTimestamp: string;
  text: string;
  numberOfRecasts: number;
  numberOfLikes: number;
  hasRecasted: boolean;
}

async function checkRecastStatus(castHash: string, fid: string): Promise<CastInfo | null> {
  const query = `
    query CheckRecast {
      FarcasterReactions(
        input: {
          filter: {
            criteria: recasted,
            castHash: {_eq: "${castHash}"},
            reactedBy: {_eq: "fc_fid:${fid}"}
          },
          blockchain: ALL
        }
      ) {
        Reaction {
          cast {
            castedAtTimestamp
            text
            numberOfRecasts
            numberOfLikes
          }
        }
      }
    }
  `

  try {
    const response = await axios.post(
      AIRSTACK_API_URL,
      { query },
      { headers: { 'Authorization': AIRSTACK_API_KEY } }
    )

    const reactions = response.data.data.FarcasterReactions.Reaction
    if (reactions.length > 0) {
      const cast = reactions[0].cast
      return {
        castedAtTimestamp: cast.castedAtTimestamp,
        text: cast.text,
        numberOfRecasts: cast.numberOfRecasts,
        numberOfLikes: cast.numberOfLikes,
        hasRecasted: true
      }
    } else {
      // If no reaction found, we need to fetch the cast info separately
      const castInfoQuery = `
        query GetCastInfo {
          FarcasterCasts(
            input: {filter: {castHash: {_eq: "${castHash}"}}, blockchain: ALL}
          ) {
            Cast {
              castedAtTimestamp
              text
              numberOfRecasts
              numberOfLikes
            }
          }
        }
      `
      const castInfoResponse = await axios.post(
        AIRSTACK_API_URL,
        { query: castInfoQuery },
        { headers: { 'Authorization': AIRSTACK_API_KEY } }
      )
      const castInfo = castInfoResponse.data.data.FarcasterCasts.Cast[0]
      return castInfo ? {
        ...castInfo,
        hasRecasted: false
      } : null
    }
  } catch (error) {
    console.error('Error checking recast status:', error)
    return null
  }
}

app.frame('/', (c) => {
  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ fontSize: '48px', color: '#333', marginBottom: '20px' }}>Frame Interaction Checker</h1>
        <p style={{ fontSize: '24px', color: '#666' }}>Check your interaction with a specific cast</p>
      </div>
    ),
    intents: [
      <Button action="/check-interaction">Check Interaction</Button>
    ],
  })
})

app.frame('/check-interaction', async (c) => {
  const { fid } = c.frameData ?? {}
  const castHash = '0x4d5f904518bb9e8368eb560d1b93c762f7267cb4' // Example cast hash

  if (!fid) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '48px', color: '#333', marginBottom: '20px' }}>Error</h1>
          <p style={{ fontSize: '24px', color: '#666' }}>Unable to retrieve user information</p>
        </div>
      ),
      intents: [
        <Button action="/">Back to Home</Button>
      ],
    })
  }

  const castInfo = await checkRecastStatus(castHash, fid.toString())

  if (!castInfo) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '48px', color: '#333', marginBottom: '20px' }}>Cast Not Found</h1>
          <p style={{ fontSize: '24px', color: '#666' }}>Unable to find information for this cast</p>
        </div>
      ),
      intents: [
        <Button action="/">Back to Home</Button>
      ],
    })
  }

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ fontSize: '36px', color: '#333', marginBottom: '20px' }}>Cast Interaction Status</h1>
        <p style={{ fontSize: '24px', color: '#666', marginBottom: '10px' }}>Recasts: {castInfo.numberOfRecasts}</p>
        <p style={{ fontSize: '24px', color: '#666', marginBottom: '10px' }}>Likes: {castInfo.numberOfLikes}</p>
        <p style={{ fontSize: '24px', color: '#666', marginBottom: '20px' }}>
          You have {castInfo.hasRecasted ? 'recasted' : 'not recasted'} this cast
        </p>
        <p style={{ fontSize: '18px', color: '#999', textAlign: 'center', maxWidth: '80%' }}>{castInfo.text}</p>
      </div>
    ),
    intents: [
      ...(!castInfo.hasRecasted ? [<Button action="/recast">Recast</Button>] : []),
      <Button action="/like">Like</Button>,
      <Button action="/">Back to Home</Button>
    ],
  })
})

app.frame('/recast', (c) => {
  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ fontSize: '48px', color: '#333', marginBottom: '20px' }}>Recasted!</h1>
        <p style={{ fontSize: '24px', color: '#666' }}>You recasted the frame. This action would be recorded on Farcaster.</p>
      </div>
    ),
    intents: [
      <Button action="/check-interaction">Check Again</Button>,
      <Button action="/">Back to Home</Button>
    ],
  })
})

app.frame('/like', (c) => {
  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ fontSize: '48px', color: '#333', marginBottom: '20px' }}>Liked!</h1>
        <p style={{ fontSize: '24px', color: '#666' }}>You liked the frame. This action would be recorded on Farcaster.</p>
      </div>
    ),
    intents: [
      <Button action="/check-interaction">Check Again</Button>,
      <Button action="/">Back to Home</Button>
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)