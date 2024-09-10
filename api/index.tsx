import { Frog } from 'frog'
import { ethers } from 'ethers'
import axios from 'axios'

const app = new Frog({
  basePath: '/api',
  title: 'Scary Garys NFT Checker',
})

const SCARY_GARYS_ADDRESS = '0xd652Eeb3431f1113312E5c763CE1d0846Aa4d7BC' // Ethereum
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

function generateHtmlImage(nftAmount: number, tokenIds: string): string {
  return `
    <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="400" fill="#4a5568"/>
      <text x="300" y="100" font-family="Arial" font-size="36" fill="white" text-anchor="middle">
        Scary Garys NFT Checker
      </text>
      <text x="300" y="200" font-family="Arial" font-size="24" fill="white" text-anchor="middle">
        You own ${nftAmount} Scary Garys NFTs
      </text>
      <text x="300" y="250" font-family="Arial" font-size="18" fill="white" text-anchor="middle">
        ${nftAmount > 0 ? `Token IDs: ${tokenIds}` : ''}
      </text>
    </svg>
  `
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

  const svgImage = generateHtmlImage(nftAmount, tokenIds)
  const svgBase64 = Buffer.from(svgImage).toString('base64')

  return c.res({
    image: `data:image/svg+xml;base64,${svgBase64}`,
    intents: [
      <button>
        Refresh NFT Count
      </button>
    ],
  })
})

export const GET = app.fetch
export const POST = app.fetch