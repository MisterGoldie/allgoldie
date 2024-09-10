/** @jsxImportSource frog/jsx */
import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'
import axios from 'axios'

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
const BACKGROUND_IMAGE = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmX7Py8TGVGdp3ffXb4XGfd83WwmLZ8FyQV2PEquhAFZ2P'
const ERROR_BACKGROUND_IMAGE = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/Qma1Evr6rzzXoCDG5kzWgD7vekUpdj5VYCdKu8VcgSjxdD'
const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql'
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'
const OPENSEA_API_KEY = 'eb90d151ee88429eac31c3b6cac0aa2e'

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
      { headers: { 'Authorization': AIRSTACK_API_KEY } }
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

async function getOwnedScaryGarys(address: string): Promise<NFTMetadata[]> {
  try {
    const response = await axios.get(`https://api.opensea.io/api/v1/assets`, {
      params: {
        owner: address,
        asset_contract_address: SCARY_GARYS_ADDRESS,
        limit: 50, // Adjust as needed
      },
      headers: {
        'X-API-KEY': OPENSEA_API_KEY
      }
    });

    return response.data.assets.map((asset: any) => ({
      tokenId: asset.token_id,
      imageUrl: asset.image_url || `https://etherscan.io/token/${SCARY_GARYS_ADDRESS}?a=${asset.token_id}#inventory`,
    }));
  } catch (error) {
    console.error('Error fetching Scary Garys from OpenSea:', error)
    return []
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

  let ownedNFTs: NFTMetadata[] = [];
  let errorMessage = '';
  let backgroundImage = BACKGROUND_IMAGE;

  if (fid) {
    try {
      const connectedAddresses = await getConnectedAddresses(fid.toString());
      if (connectedAddresses.length > 0) {
        const address = connectedAddresses[0]; // Use the first connected address
        console.log('Using Ethereum address:', address);
        ownedNFTs = await getOwnedScaryGarys(address);
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

  const nftAmount = ownedNFTs.length;
  const buttonText = errorMessage || `Ayee you own ${nftAmount} Scary Garys!`;

  return c.res({
    image: backgroundImage,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">{buttonText}</Button>,
      ...(nftAmount > 0 ? [<Button action={`/view-nfts?nfts=${encodeURIComponent(JSON.stringify(ownedNFTs))}`}>View Your Scary Garys</Button>] : []),
    ],
  })
})

// ... (previous code remains the same)

app.frame('/view-nfts', async (c) => {
  const urlParams = new URLSearchParams(c.frameData?.url?.split('?')[1] || '');
  const nftsParam = urlParams.get('nfts');
  const nfts: NFTMetadata[] = nftsParam ? JSON.parse(decodeURIComponent(nftsParam)) : [];
  const page = parseInt(urlParams.get('page') || '0');
  const nftsPerPage = 4;
  const startIndex = page * nftsPerPage;
  const endIndex = startIndex + nftsPerPage;
  const currentNFTs = nfts.slice(startIndex, endIndex);

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E' }}>
        <h1 style={{ color: 'white', fontSize: '40px', marginBottom: '20px' }}>Your Scary Garys</h1>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {currentNFTs.map((nft, index) => (
            <img key={index} src={nft.imageUrl} alt={`Scary Gary #${nft.tokenId}`} style={{ width: '200px', height: '200px', objectFit: 'cover' }} />
          ))}
        </div>
        <p style={{ color: 'white', fontSize: '20px', marginTop: '20px' }}>
          Showing {startIndex + 1}-{Math.min(endIndex, nfts.length)} of {nfts.length}
        </p>
      </div>
    ),
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">Back to Check</Button>,
      ...(page > 0 ? [<Button action={`/view-nfts?nfts=${encodeURIComponent(JSON.stringify(nfts))}&page=${page - 1}`}>Previous</Button>] : []),
      ...(endIndex < nfts.length ? [<Button action={`/view-nfts?nfts=${encodeURIComponent(JSON.stringify(nfts))}&page=${page + 1}`}>Next</Button>] : []),
    ],
  })
})

// ... (rest of the code remains the same)

export const GET = handle(app)
export const POST = handle(app)