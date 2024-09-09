import { Frog } from 'frog'
import { neynar } from 'frog/hubs'
import { ethers } from 'ethers'

// Initialize ethers provider
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL)

const app = new Frog({
  basePath: '/api',
  hub: neynar({ apiKey: process.env.NEYNAR_API_KEY as string }),
  title: 'NFT Ownership Check',
})

const NFT_CONTRACT_ADDRESS = '0xd652Eeb3431f1113312E5c763CE1d0846Aa4d7BC'

const checkNFTOwnership = async (address: string): Promise<boolean> => {
  try {
    const abi = ['function balanceOf(address owner) view returns (uint256)']
    const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, abi, provider)
    const balance = await contract.balanceOf(address)
    return balance.gt(0)
  } catch (error) {
    console.error('Error checking NFT ownership:', error)
    return false
  }
}

app.frame('/', (c) => {
  const { buttonValue } = c

  let text = 'Welcome! Click to check your NFT ownership.'
  let buttonText = 'Check Ownership'

  if (buttonValue === 'check') {
    text = 'Checking ownership...'
    buttonText = 'Checking...'
  }

  return c.res({
    image: createImage(text),
    intents: [
      <button onClick={() => console.log('Check ownership clicked')}>
        {buttonText}
      </button>
    ],
  })
})

app.frame('/result', async (c) => {
  const userAddress = c.frameData?.fid 
    ? await getUserAddressFromFid(c.frameData.fid) 
    : null
  
  let text = 'Unable to check ownership.'
  let buttonText = 'Try Again'
  let buttonAction = () => console.log('Try again clicked')
  let buttonProps = {}

  if (userAddress) {
    const ownsNFT = await checkNFTOwnership(userAddress)
    if (ownsNFT) {
      text = 'Congratulations! You own the NFT.'
      buttonText = 'Share Ownership'
      buttonAction = () => console.log('Share ownership clicked')
    } else {
      text = 'Sorry, you don\'t own the NFT.'
      buttonText = 'Buy NFT'
      buttonAction = () => console.log('Buy NFT clicked')
      buttonProps = { href: `https://opensea.io/assets/ethereum/${NFT_CONTRACT_ADDRESS}` }
    }
  }

  return c.res({
    image: createImage(text),
    intents: [
      <button onClick={buttonAction} {...buttonProps}>
        {buttonText}
      </button>
    ],
  })
})

function createImage(text: string) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'blue',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontSize: '24px',
        textAlign: 'center',
        padding: '20px',
      }}
    >
      {text}
    </div>
  )
}

async function getUserAddressFromFid(fid: number): Promise<string | null> {
  // Implement this function to get the user's address from their FID
  // You might need to use the Neynar API or another method
  // For now, we'll return null
  console.log(`Getting address for FID: ${fid}`)
  return null
}

export const GET = app.fetch
export const POST = app.fetch