import { Frog } from 'frog'
import { ethers } from 'ethers'

const app = new Frog({
  basePath: '/api',
  title: 'Scary Garys NFT Checker',
})

const SCARY_GARYS_ADDRESS = '0xd652Eeb3431f1113312E5c763CE1d0846Aa4d7BC' // Ethereum
const IPFS_IMAGE_URL = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmVxD55EV753EqPwgsaLWq4635sT6UR1M1ft2vhL3GZpeV'

const ETHEREUM_RPC_URL = 'https://eth-mainnet.g.alchemy.com/v2/pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'

const ethereumProvider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL)

const ERC721_ABI = ['function balanceOf(address owner) view returns (uint256)']

async function getScaryGarysAmount(address: string): Promise<string> {
  const contract = new ethers.Contract(SCARY_GARYS_ADDRESS, ERC721_ABI, ethereumProvider)
  const balance = await contract.balanceOf(address)
  return balance.toString()
}

app.frame('/', async (c) => {
  let nftAmount = '0'
  const userAddress = c.frameData?.address

  if (userAddress) {
    try {
      nftAmount = await getScaryGarysAmount(userAddress)
    } catch (error) {
      console.error('Error fetching Scary Garys amount:', error)
    }
  }

  return c.res({
    image: IPFS_IMAGE_URL,
    intents: [
      <button onClick={() => console.log('Button clicked')}>
        You own {nftAmount} Scary Garys 
      </button>
    ],
  })
})

export const GET = app.fetch
export const POST = app.fetch