import { Frog } from 'frog'
import { ethers } from 'ethers'
import axios from 'axios'

const app = new Frog({
  basePath: '/api',
  title: 'Scary Garys NFT Checker',
})

const SCARY_GARYS_ADDRESS = '0xd652Eeb3431f1113312E5c763CE1d0846Aa4d7BC' // Ethereum
const IPFS_IMAGE_URL = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmVxD55EV753EqPwgsaLWq4635sT6UR1M1ft2vhL3GZpeV'
const CONTRACT_URI = 'https://ipfs.imnotart.com/ipfs/QmTZ3PyPH3Nnby2R58uVpaDcm5ahSnqmo2h4QoMm39NybX'

const ETHEREUM_RPC_URL = 'https://eth-mainnet.g.alchemy.com/v2/pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'
const ALCHEMY_API_KEY = 'pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'

const ethereumProvider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL)

interface NFTMetadata {
  tokenId: string;
  imageUrl: string;
}

const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
]

async function getOwnedScaryGarys(address: string): Promise<NFTMetadata[]> {
  try {
    const url = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}/getNFTs/`
    const params = {
      owner: address,
      contractAddresses: [SCARY_GARYS_ADDRESS],
      withMetadata: true,
    }

    const response = await axios.get(url, { params })
    return response.data.ownedNfts.map((nft: any) => ({
      tokenId: nft.id.tokenId,
      imageUrl: nft.metadata.image,
    }))
  } catch (error) {
    console.error('Error fetching from Alchemy API, falling back to contract calls:', error)
    return getOwnedScaryGarysFallback(address)
  }
}

async function getOwnedScaryGarysFallback(address: string): Promise<NFTMetadata[]> {
  const contract = new ethers.Contract(SCARY_GARYS_ADDRESS, ERC721_ABI, ethereumProvider)
  const balance = await contract.balanceOf(address)
  const ownedNFTs: NFTMetadata[] = []

  for (let i = 0; i < balance; i++) {
    const tokenId = await contract.tokenOfOwnerByIndex(address, i)
    const metadata = await fetchIPFSMetadata(tokenId.toString())
    ownedNFTs.push({
      tokenId: tokenId.toString(),
      imageUrl: metadata.image,
    })
  }

  return ownedNFTs
}

async function fetchIPFSMetadata(tokenId: string): Promise<any> {
  const metadataUrl = `${CONTRACT_URI}/${tokenId}`
  const response = await axios.get(metadataUrl)
  return response.data
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

  // Create a string of token IDs
  const tokenIds = ownedNFTs.map(nft => nft.tokenId).join(', ')

  return c.res({
    image: IPFS_IMAGE_URL,
    intents: [
      <button>
        You own {nftAmount} Scary Garys NFTs
        {nftAmount > 0 ? ` (Token IDs: ${tokenIds})` : ''}
      </button>
    ],
  })
})

export const GET = app.fetch
export const POST = app.fetch