/** @jsxImportSource frog/jsx */
import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'
import axios from 'axios'
import { ethers } from 'ethers'

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
const OPENSEA_API_KEY = 'eb90d151ee88429eac31c3b6cac0aa2e'
const BACKGROUND_IMAGE = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmVxD55EV753EqPwgsaLWq4635sT6UR1M1ft2vhL3GZpeV'
const ERROR_BACKGROUND_IMAGE = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/Qma1Evr6rzzXoCDG5kzWgD7vekUpdj5VYCdKu8VcgSjxdD'
const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql'
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'

interface NFTMetadata {
  tokenId: string;
  imageUrl: string;
  name: string;
  description: string;
}

const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);
const scaryGarysABI = ['function tokenURI(uint256 tokenId) view returns (string)'];
const scaryGarysContract = new ethers.Contract(SCARY_GARYS_ADDRESS, scaryGarysABI, provider);

async function getScaryGarysFromOpenSea(tokenIds: string[]): Promise<NFTMetadata[]> {
  const nfts: NFTMetadata[] = [];
  
  for (const tokenId of tokenIds) {
    try {
      const response = await axios.get(
        `https://api.opensea.io/api/v2/chain/ethereum/contract/${SCARY_GARYS_ADDRESS}/nfts/${tokenId}`,
        {
          headers: {
            'accept': 'application/json',
            'x-api-key': OPENSEA_API_KEY
          }
        }
      );
      
      console.log(`OpenSea API response for token ${tokenId}:`, JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.nft) {
        nfts.push({
          tokenId: tokenId,
          imageUrl: response.data.nft.image_url,
          name: response.data.nft.name,
          description: response.data.nft.description
        });
      }
    } catch (error) {
      console.error(`Error fetching data for token ${tokenId} from OpenSea:`, error);
    }
  }
  
  return nfts;
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
  console.log('Fetching owned Scary Garys for address:', address);
  const url = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}/getNFTs/`
  const params = {
    owner: address,
    contractAddresses: [SCARY_GARYS_ADDRESS],
    withMetadata: true,
  }

  try {
    const response = await axios.get(url, { params })
    console.log('Alchemy API response:', JSON.stringify(response.data, null, 2));
    
    const tokenIds = response.data.ownedNfts.map((nft: any) => nft.id.tokenId);
    console.log('Token IDs owned:', tokenIds);
    
    // Fetch detailed NFT data from OpenSea
    const nfts = await getScaryGarysFromOpenSea(tokenIds);
    console.log('NFT data from OpenSea:', JSON.stringify(nfts, null, 2));
    
    return nfts;
  } catch (error) {
    console.error('Error fetching Scary Garys:', error)
    return []
  }
}

app.frame('/', (c) => {
  return c.res({
    image: BACKGROUND_IMAGE,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">Check Scary Garys NFTs</Button>
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
  const resultText = errorMessage || `You own ${nftAmount} Scary Garys NFTs.`;

  console.log('Result text:', resultText);
  console.log('Number of owned NFTs:', nftAmount);

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E' }}>
        <h1 style={{ color: 'white', fontSize: '40px', marginBottom: '20px' }}>Scary Garys NFT Check</h1>
        <p style={{ color: 'white', fontSize: '24px', textAlign: 'center' }}>{resultText}</p>
      </div>
    ),
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">Check Again</Button>,
      ...(nftAmount > 0 ? [<Button action={`/view-nfts?tokenIds=${ownedNFTs.map(nft => nft.tokenId).join(',')}`}>View Your Scary Garys</Button>] : []),
    ],
  })
})

app.frame('/view-nfts', async (c) => {
  console.log('Entering /view-nfts frame');
  const urlParams = new URLSearchParams(c.frameData?.url?.split('?')[1] || '');
  const tokenIds = urlParams.get('tokenIds')?.split(',') || [];
  console.log('Received tokenIds:', tokenIds);
  
  const nfts = await getScaryGarysFromOpenSea(tokenIds);
  console.log('NFT data for display:', JSON.stringify(nfts, null, 2));

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
          {currentNFTs.map((nft: NFTMetadata, index: number) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <img src={nft.imageUrl} alt={nft.name} style={{ width: '200px', height: '200px', objectFit: 'cover' }} />
              <p style={{ color: 'white', fontSize: '16px', marginTop: '5px' }}>{nft.name}</p>
            </div>
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
      ...(page > 0 ? [<Button action={`/view-nfts?tokenIds=${tokenIds.join(',')}&page=${page - 1}`}>Previous</Button>] : []),
      ...(endIndex < nfts.length ? [<Button action={`/view-nfts?tokenIds=${tokenIds.join(',')}&page=${page + 1}`}>Next</Button>] : []),
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)