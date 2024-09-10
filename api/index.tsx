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
const BACKGROUND_IMAGE = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmQDfE5kgzdyRLSMgnH33jeU37LtHTsePxL7fE23RELnTs'
const ERROR_BACKGROUND_IMAGE = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/Qma1Evr6rzzXoCDG5kzWgD7vekUpdj5VYCdKu8VcgSjxdD'
const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql'
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'

interface NFTMetadata {
  tokenId: string;
  imageUrl: string;
}

const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);
const scaryGarysABI = ['function tokenURI(uint256 tokenId) view returns (string)'];
const scaryGarysContract = new ethers.Contract(SCARY_GARYS_ADDRESS, scaryGarysABI, provider);

async function getBaseURI(): Promise<string> {
  try {
    const tokenURI = await scaryGarysContract.tokenURI(1); // Fetch tokenURI for token ID 1
    return tokenURI.split('/').slice(0, -1).join('/') + '/'; // Remove the token ID and add a trailing slash
  } catch (error) {
    console.error('Error fetching baseURI:', error);
    return '';
  }
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
  const url = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}/getNFTs/`
  const params = {
    owner: address,
    contractAddresses: [SCARY_GARYS_ADDRESS],
    withMetadata: true,
  }

  try {
    const response = await axios.get(url, { params })
    const baseURI = await getBaseURI();
    return response.data.ownedNfts.map((nft: any) => ({
      tokenId: nft.id.tokenId,
      imageUrl: `${baseURI}${nft.id.tokenId}`,
    }))
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
      ...(nftAmount > 0 ? [<Button action={`/view-nfts?tokenIds=${ownedNFTs.map(nft => nft.tokenId).join(',')}&imageUrls=${ownedNFTs.map(nft => encodeURIComponent(nft.imageUrl)).join(',')}`}>View Your Scary Garys</Button>] : []),
    ],
  })
})

app.frame('/view-nfts', async (c) => {
  const urlParams = new URLSearchParams(c.frameData?.url?.split('?')[1] || '');
  const tokenIds = urlParams.get('tokenIds')?.split(',') || [];
  const imageUrls = urlParams.get('imageUrls')?.split(',').map(decodeURIComponent) || [];
  const page = parseInt(urlParams.get('page') || '0');
  const nftsPerPage = 4;
  const startIndex = page * nftsPerPage;
  const endIndex = startIndex + nftsPerPage;
  const currentNFTs = tokenIds.slice(startIndex, endIndex).map((tokenId, index) => ({
    tokenId,
    imageUrl: imageUrls[startIndex + index],
  }));

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E' }}>
        <h1 style={{ color: 'white', fontSize: '40px', marginBottom: '20px' }}>Your Scary Garys</h1>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {currentNFTs.map((nft: NFTMetadata, index: number) => (
            <img key={index} src={nft.imageUrl} alt={`Scary Gary #${nft.tokenId}`} style={{ width: '200px', height: '200px', objectFit: 'cover' }} />
          ))}
        </div>
        <p style={{ color: 'white', fontSize: '20px', marginTop: '20px' }}>
          Showing {startIndex + 1}-{Math.min(endIndex, tokenIds.length)} of {tokenIds.length}
        </p>
      </div>
    ),
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">Back to Check</Button>,
      ...(page > 0 ? [<Button action={`/view-nfts?tokenIds=${tokenIds.join(',')}&imageUrls=${imageUrls.map(encodeURIComponent).join(',')}&page=${page - 1}`}>Previous</Button>] : []),
      ...(endIndex < tokenIds.length ? [<Button action={`/view-nfts?tokenIds=${tokenIds.join(',')}&imageUrls=${imageUrls.map(encodeURIComponent).join(',')}&page=${page + 1}`}>Next</Button>] : []),
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)