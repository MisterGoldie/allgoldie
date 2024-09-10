/** @jsxImportSource frog/jsx */
import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'
import axios from 'axios'
import NodeCache from 'node-cache'

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

const SCARY_GARYS_ADDRESS = '0xd652Eeb3431f1113312E5c763CE1d0846Aa4d7BC'
const ALCHEMY_API_KEY = 'pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'
const BACKGROUND_IMAGE = 'https://bafybeichmmtimnjxzhtwedhxwgjyrusqes7zie4glvbdnx6r7clvvc77ne.ipfs.w3s.link/Thumbnail%20(28).png'
const ERROR_BACKGROUND_IMAGE = 'https://bafybeifa7k5ei2wu6vk464axt2xysxw75fos52w765favoho63fig23sja.ipfs.w3s.link/Group%2048087.png'
const CONFIRMATION_IMAGE = 'https://bafybeiazddyh4ewprsvau6atkrqfjrtwvwjsqiabl7zppi5jpfwqhtzceq.ipfs.w3s.link/Thumbnail%20(30).png'
const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql'
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'
const ETHERSCAN_API_KEY = 'ZUGFEPG5A713UMRZKQA9MQVNGRHPQIHMU7'

const metadataCache = new NodeCache({ stdTTL: 600 }) // Cache for 10 minutes
const ITEMS_PER_PAGE = 1 // Number of NFTs to fetch per page

interface NFTMetadata {
  tokenId: string;
  imageUrl: string;
}

async function getConnectedAddresses(fid: string): Promise<string[]> {
  console.log('Attempting to fetch connected addresses for FID:', fid);
  try {
    const query = `
      query ConnectedWalletWithFID($fid: String!) {
        Socials(input: {filter: {userId: {_eq: $fid}}, blockchain: ethereum}) {
          Social {
            dappName
            profileName
            userAddress
            connectedAddresses {
              address
              blockchain
            }
          }
        }
      }
    `;

    const variables = { fid };

    const response = await axios.post(AIRSTACK_API_URL, 
      { query, variables },
      { headers: { 'Authorization': AIRSTACK_API_KEY }, timeout: 10000 }
    );

    const data = response.data;
    console.log('Full Airstack API response:', JSON.stringify(data, null, 2));

    if (!data.data || !data.data.Socials || !data.data.Socials.Social) {
      console.error('Unexpected response structure from Airstack API');
      return [];
    }

    const addresses = data.data.Socials.Social.flatMap((social: any) =>
      social.connectedAddresses.map((addr: any) => addr.address)
    );

    console.log('Connected addresses:', addresses);
    return addresses;
  } catch (error) {
    console.error('Error in getConnectedAddresses:', error);
    return [];
  }
}

async function getOwnedScaryGarys(address: string): Promise<number> {
  const url = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}/getNFTs/`
  const params = {
    owner: address,
    contractAddresses: [SCARY_GARYS_ADDRESS],
    withMetadata: true,
  }

  try {
    const response = await axios.get(url, { params, timeout: 10000 })
    return response.data.totalCount
  } catch (error) {
    console.error('Error fetching Scary Garys:', error)
    return 0
  }
}

async function getScaryGarysImages(address: string, page: number = 0): Promise<{ nfts: NFTMetadata[], totalCount: number }> {
  try {
    const url = `https://api.etherscan.io/api`
    const params = {
      module: 'account',
      action: 'tokennfttx',
      contractaddress: SCARY_GARYS_ADDRESS,
      address: address,
      sort: 'asc',
      apikey: ETHERSCAN_API_KEY
    }

    console.log('Fetching token transactions from Etherscan...');
    const response = await axios.get(url, { params, timeout: 10000 })

    if (response.data.status !== '1') {
      console.error('Error response from Etherscan:', response.data.message)
      return { nfts: [], totalCount: 0 }
    }

    interface EtherscanTx {
      to: string;
      tokenID: string;
    }

    const ownedTokens = (response.data.result as EtherscanTx[])
      .filter(tx => tx.to.toLowerCase() === address.toLowerCase())
      .map(tx => tx.tokenID)

    const uniqueTokenIds: string[] = [...new Set(ownedTokens)]
    const totalCount = uniqueTokenIds.length

    console.log(`Total unique tokens found: ${totalCount}`);

    const startIndex = page * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const tokenIdsToFetch: string[] = uniqueTokenIds.slice(startIndex, endIndex)

    console.log(`Fetching metadata for tokens: ${tokenIdsToFetch.join(', ')}`);

    const metadataPromises = tokenIdsToFetch.map(async (tokenId: string) => {
      // Check cache first
      const cachedMetadata = metadataCache.get<NFTMetadata>(tokenId)
      if (cachedMetadata) {
        console.log(`Using cached metadata for token ${tokenId}`);
        return cachedMetadata
      }

      const metadataUrl = `https://ipfs.imnotart.com/ipfs/QmbmAW6t7SSQ6q8YCnFgbWHwWBjt3q1TwMQbgmjCJCPLaH/${tokenId}`
      try {
        console.log(`Fetching metadata for token ${tokenId} from ${metadataUrl}`);
        const metadataResponse = await axios.get(metadataUrl, { timeout: 10000 })
        const metadata: NFTMetadata = {
          tokenId: tokenId,
          imageUrl: metadataResponse.data.image
        }
        console.log(`Successfully fetched metadata for token ${tokenId}: ${JSON.stringify(metadata)}`);
        metadataCache.set(tokenId, metadata)
        return metadata
      } catch (error) {
        console.error(`Error fetching metadata for token ${tokenId}:`, error)
        // Fallback to a default image URL if IPFS fails
        return {
          tokenId: tokenId,
          imageUrl: `https://etherscan.io/nft/${SCARY_GARYS_ADDRESS}/${tokenId}`
        }
      }
    })

    const metadataResults = await Promise.all(metadataPromises)
    const nfts = metadataResults.filter((result): result is NFTMetadata => result !== null)

    console.log(`Successfully fetched ${nfts.length} NFT metadata`);

    return { nfts, totalCount }
  } catch (error) {
    console.error('Error in getScaryGarysImages:', error)
    return { nfts: [], totalCount: 0 }
  }
}

app.frame('/', (c) => {
  return c.res({
    image: BACKGROUND_IMAGE,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">Check Scary Garys balance</Button>
    ],
  })
})

app.frame('/check', async (c) => {
  console.log('Full frameData:', JSON.stringify(c.frameData, null, 2));
  const { fid } = c.frameData || {};
  const { displayName, pfpUrl } = c.var.interactor || {};

  console.log('FID:', fid);
  console.log('Display Name:', displayName);
  console.log('Profile Picture URL:', pfpUrl);

  let nftAmount = 0;
  let errorMessage = '';
  let backgroundImage = BACKGROUND_IMAGE;

  if (fid) {
    try {
      const connectedAddresses = await getConnectedAddresses(fid.toString());
      if (connectedAddresses.length > 0) {
        const address = connectedAddresses[0];
        console.log('Using Ethereum address:', address);
        nftAmount = await getOwnedScaryGarys(address);
        if (nftAmount > 0) {
          backgroundImage = CONFIRMATION_IMAGE;
        }
      } else {
        errorMessage = 'No connected Ethereum addresses found';
        backgroundImage = ERROR_BACKGROUND_IMAGE;
      }
    } catch (error) {
      console.error('Error checking NFTs:', error);
      errorMessage = 'Error checking NFTs';
      backgroundImage = ERROR_BACKGROUND_IMAGE;
    }
  } else {
    errorMessage = 'No FID found for the user';
    backgroundImage = ERROR_BACKGROUND_IMAGE;
  }

  const buttonText = errorMessage || `Ayeee you own ${nftAmount} Scary Garys!`;

  return c.res({
    image: backgroundImage,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">{buttonText}</Button>,
      ...(nftAmount > 0 ? [<Button action="/view-nfts" value="0">View Your Scary Garys</Button>] : []),
    ],
  })
})

app.frame('/view-nfts', async (c) => {
  const { fid } = c.frameData || {};
  const page = parseInt(c.buttonValue || '0');
  let ownedNFTs: NFTMetadata[] = [];
  let totalNFTs = 0;
  let errorMessage = '';

  if (fid) {
    try {
      const connectedAddresses = await getConnectedAddresses(fid.toString());
      if (connectedAddresses.length > 0) {
        const address = connectedAddresses[0];
        console.log(`Fetching Scary Garys for address: ${address}`);
        const result = await getScaryGarysImages(address, page);
        ownedNFTs = result.nfts;
        totalNFTs = result.totalCount;
        console.log(`Fetched ${ownedNFTs.length} NFTs out of ${totalNFTs} total`);
      } else {
        errorMessage = 'No connected Ethereum addresses found';
      }
    } catch (error) {
      console.error('Error in /view-nfts:', error);
      errorMessage = 'Error fetching NFT data';
    }
  } else {
    errorMessage = 'No FID found for the user';
  }

  const nftToShow = ownedNFTs[0] || null;
  const nextPage = (page + 1) * ITEMS_PER_PAGE < totalNFTs ? page + 1 : 0;
  const prevPage = page > 0 ? page - 1 : Math.floor((totalNFTs - 1) / ITEMS_PER_PAGE);

  let displayImage = nftToShow ? nftToShow.imageUrl : ERROR_BACKGROUND_IMAGE;
  let displayText = errorMessage || `Showing NFT ${page * ITEMS_PER_PAGE + 1} of ${totalNFTs}`;

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E' }}>
        <img src={displayImage} alt="NFT" style={{ maxWidth: '80%', maxHeight: '70%', objectFit: 'contain' }} />
        <p style={{ color: 'white', fontSize: '24px', marginTop: '20px' }}>{displayText}</p>
      </div>
    ),
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">Back to Check</Button>,
      <Button action="/view-nfts" value={prevPage.toString()}>Previous</Button>,
      <Button action="/view-nfts" value={nextPage.toString()}>Next</Button>,
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)