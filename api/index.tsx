/** @jsxImportSource frog/jsx */
import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'
import axios from 'axios'

// Add a simple logging function
const log = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

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

log('Frog app initialized', { basePath: '/api', title: 'Scary Garys NFT Checker' });

const SCARY_GARYS_ADDRESS = '0xd652Eeb3431f1113312E5c763CE1d0846Aa4d7BC'
const ALCHEMY_API_KEY = 'pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'
const BACKGROUND_IMAGE = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmX7Py8TGVGdp3ffXb4XGfd83WwmLZ8FyQV2PEquhAFZ2P'
const ERROR_BACKGROUND_IMAGE = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/Qma1Evr6rzzXoCDG5kzWgD7vekUpdj5VYCdKu8VcgSjxdD'
const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql'
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'

log('Constants initialized', { SCARY_GARYS_ADDRESS, BACKGROUND_IMAGE, ERROR_BACKGROUND_IMAGE, AIRSTACK_API_URL });

interface NFTMetadata {
  tokenId: string;
  imageUrl: string;
}

async function getConnectedAddresses(fid: string): Promise<string[]> {
  log('Fetching connected addresses for FID', { fid });
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

    log('Sending request to Airstack API', { query, variables });
    const response = await axios.post(AIRSTACK_API_URL, 
      { query, variables },
      { headers: { 'Authorization': AIRSTACK_API_KEY } }
    );

    const data = response.data;
    log('Received response from Airstack API', data);

    if (!data.data || !data.data.Socials || !data.data.Socials.Social) {
      log('Unexpected response structure from Airstack API', data);
      return [];
    }

    const addresses = data.data.Socials.Social.flatMap((social: any) =>
      social.connectedAddresses.map((addr: any) => addr.address)
    );

    log('Extracted connected addresses', { addresses });
    return addresses;
  } catch (error) {
    log('Error in getConnectedAddresses', error);
    return [];
  }
}

async function getOwnedScaryGarys(address: string): Promise<NFTMetadata[]> {
  log('Fetching owned Scary Garys for address', { address });
  const url = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}/getNFTs/`
  const params = {
    owner: address,
    contractAddresses: [SCARY_GARYS_ADDRESS],
    withMetadata: true,
  }

  try {
    log('Sending request to Alchemy API', { url, params });
    const response = await axios.get(url, { params })
    log('Received response from Alchemy API', response.data);
    
    const ownedNfts = response.data.ownedNfts.map((nft: any) => ({
      tokenId: nft.id.tokenId,
      imageUrl: nft.metadata.image,
    }));
    log('Extracted owned NFTs', { ownedNfts });
    return ownedNfts;
  } catch (error) {
    log('Error fetching Scary Garys', error);
    return []
  }
}

app.frame('/', (c) => {
  log('Rendering initial frame');
  return c.res({
    image: BACKGROUND_IMAGE,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">Check Scary Garys NFTs</Button>
    ],
  })
})

app.frame('/check', async (c) => {
  log('Processing /check frame', { frameData: c.frameData });
  const { fid } = c.frameData || {};
  const { displayName, pfpUrl } = c.var.interactor || {};

  log('Extracted user data', { fid, displayName, pfpUrl });

  let nftAmount = 0;
  let errorMessage = '';

  if (fid) {
    try {
      log('Fetching connected addresses');
      const connectedAddresses = await getConnectedAddresses(fid.toString());
      if (connectedAddresses.length > 0) {
        const address = connectedAddresses[0];
        log('Using Ethereum address', { address });
        const ownedNFTs = await getOwnedScaryGarys(address);
        nftAmount = ownedNFTs.length;
        log('Fetched owned NFTs', { nftAmount });
      } else {
        errorMessage = 'No connected Ethereum addresses found';
        log('No connected addresses found');
      }
    } catch (error) {
      log('Error checking NFTs', error);
      errorMessage = 'Error checking NFTs';
    }
  } else {
    errorMessage = 'No FID found for the user';
    log('No FID found for the user');
  }

  const buttonText = errorMessage || `You own ${nftAmount} Scary Garys NFTs. Check again?`;
  const imageToUse = errorMessage ? ERROR_BACKGROUND_IMAGE : BACKGROUND_IMAGE;
  log('Rendering response frame', { imageToUse, buttonText });

  return c.res({
    image: imageToUse,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">{buttonText}</Button>
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)