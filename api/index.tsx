import { Button, Frog, TextInput } from 'frog'
import { handle } from 'frog/vercel'

const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e' // Replace with your actual Airstack API key
const NFT_CONTRACT_ADDRESS = '0xd652Eeb3431f1113312E5c763CE1d0846Aa4d7BC' // The NFT contract address we're checking for

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: 'NFT Ownership Checker', // Added title property
})

async function checkNFTOwnership(identity: string): Promise<boolean> {
  const query = `
    query CheckNFTOwnership($identity: [Identity!]!, $tokenAddress: Address!) {
      Wallet(input: {identity: $identity, blockchain: ethereum}) {
        tokenBalances(input: {filter: {tokenAddress: {_eq: $tokenAddress}, tokenType: {_in: [ERC721, ERC1155]}}}) {
          formattedAmount
        }
      }
    }
  `

  const variables = {
    identity: [identity],
    tokenAddress: NFT_CONTRACT_ADDRESS,
  }

  try {
    const response = await fetch('https://api.airstack.xyz/gql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY,
      },
      body: JSON.stringify({ query, variables }),
    })

    const data = await response.json()
    const tokenBalances = data.data?.Wallet?.[0]?.tokenBalances || []
    return tokenBalances.some((balance: { formattedAmount: string }) => parseFloat(balance.formattedAmount) > 0)
  } catch (error) {
    console.error('Error checking NFT ownership:', error)
    return false
  }
}

app.frame('/', (c) => {
  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', padding: '20px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>NFT Ownership Checker</h1>
        <p style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>Enter your address, ENS name, or Farcaster name to check ownership</p>
      </div>
    ),
    intents: [
      <TextInput placeholder="Enter address, ENS, or Farcaster name" />,
      <Button action="/check">Check Ownership</Button>,
    ]
  })
})

app.frame('/check', async (c) => {
  const identity = c.frameData?.inputText

  if (!identity) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', padding: '20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Error</h1>
          <p style={{ fontSize: '24px', textAlign: 'center' }}>Please enter a valid identity.</p>
        </div>
      ),
      intents: [<Button action="/">Back</Button>]
    })
  }

  const ownsNFT = await checkNFTOwnership(identity)

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', padding: '20px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Ownership Result</h1>
        <p style={{ fontSize: '24px', textAlign: 'center' }}>
          {ownsNFT ? `${identity} owns the NFT!` : `${identity} does not own the NFT.`}
        </p>
      </div>
    ),
    intents: [
      <Button action="/">Check Another</Button>
    ]
  })
})

export const GET = handle(app)
export const POST = handle(app)