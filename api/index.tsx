/** @jsxImportSource frog/jsx */
import { Button, Frog } from 'frog'
import { handle } from 'frog/next'
import axios from 'axios'

const app = new Frog({
  basePath: '/api',
  title: 'Scary Garys NFT Checker',
})

const SCARY_GARYS_ADDRESS = '0xd652Eeb3431f1113312E5c763CE1d0846Aa4d7BC'
const ALCHEMY_API_KEY = 'pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'

interface NFTMetadata {
  tokenId: string;
  imageUrl: string;
}

async function getOwnedScaryGarys(address: string): Promise<NFTMetadata[]> {
  const url = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}/getNFTs/`
  const params = {
    owner: address,
    contractAddresses: [SCARY_GARYS_ADDRESS],
    withMetadata: true,
  }

  try {
    const response = await axios.get(url, { params })
    return response.data.ownedNfts.map((nft: any) => ({
      tokenId: nft.id.tokenId,
      imageUrl: nft.metadata.image,
    }))
  } catch (error) {
    console.error('Error fetching Scary Garys:', error)
    return []
  }
}

app.frame('/', async (c) => {
  const userAddress = c.frameData?.address

  let ownedNFTs: NFTMetadata[] = []
  if (userAddress) {
    try {
      ownedNFTs = await getOwnedScaryGarys(userAddress)
    } catch (error) {
      console.error('Error fetching Scary Garys:', error)
    }
  }

  const nftAmount = ownedNFTs.length
  const tokenIds = ownedNFTs.map(nft => nft.tokenId).join(', ')

  return c.res({
    image: (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          backgroundColor: '#4a5568',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: '36px',
              fontWeight: 'bold',
              fontFamily: 'Arial, Helvetica, sans-serif',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            Scary Garys NFT Checker
          </div>
          <div
            style={{
              color: 'white',
              fontSize: '24px',
              fontFamily: 'Arial, Helvetica, sans-serif',
              textAlign: 'center',
              marginBottom: '10px',
            }}
          >
            You own {nftAmount} Scary Garys NFTs
          </div>
          {nftAmount > 0 && (
            <div
              style={{
                color: 'white',
                fontSize: '18px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                textAlign: 'center',
                maxWidth: '90%',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              Token IDs: {tokenIds}
            </div>
          )}
        </div>
      </div>
    ),
    imageAspectRatio: '1:1',
    intents: [
      <Button action="/">Refresh NFT Count</Button>
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)