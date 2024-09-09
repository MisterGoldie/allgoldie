import { Button, Frog, TextInput } from 'frog'
import { handle } from 'frog/vercel'

const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'
const NFT_CONTRACT_ADDRESS = '0xd652Eeb3431f1113312E5c763CE1d0846Aa4d7BC'

const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
  title: 'Goldie NFT Checker',
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
    image: "https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmQu3WSN8JE1cgjpUY7fVy3nRtfzWRyPU5TLvusdf92PT4",
    intents: [
      <TextInput placeholder="Enter address, ENS, or Farcaster name" />,
      <Button action="/check">Check Ownership</Button>,
    ],
  })
})

app.frame('/check', async (c) => {
  const identity = c.frameData?.inputText

  if (!identity) {
    return c.res({
      image: "https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmQu3WSN8JE1cgjpUY7fVy3nRtfzWRyPU5TLvusdf92PT4",
      intents: [<Button action="/">Back</Button>]
    })
  }

  const ownsNFT = await checkNFTOwnership(identity)

  return c.res({
    image: ownsNFT 
      ? "https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmQu3WSN8JE1cgjpUY7fVy3nRtfzWRyPU5TLvusdf92PT4"
      : "https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmQu3WSN8JE1cgjpUY7fVy3nRtfzWRyPU5TLvusdf92PT4",
    intents: [
      <Button action="/">Check Another</Button>
    ]
  })
})

export const GET = handle(app)
export const POST = handle(app)