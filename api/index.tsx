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
const BACKGROUND_IMAGE = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmVxD55EV753EqPwgsaLWq4635sT6UR1M1ft2vhL3GZpeV'

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
  const buttonText = `You own ${nftAmount} Scary Garys NFTs. Refresh?`

  return c.res({
    image: BACKGROUND_IMAGE,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/">{buttonText}</Button>
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)