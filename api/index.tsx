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
const ALCHEMY_API_KEY = 'pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'
const BACKGROUND_IMAGE = 'https://bafybeichmmtimnjxzhtwedhxwgjyrusqes7zie4glvbdnx6r7clvvc77ne.ipfs.w3s.link/Thumbnail%20(28).png'
const ERROR_BACKGROUND_IMAGE = 'https://bafybeifa7k5ei2wu6vk464axt2xysxw75fos52w765favoho63fig23sja.ipfs.w3s.link/Group%2048087.png'
const CONFIRMATION_IMAGE = 'https://bafybeiazddyh4ewprsvau6atkrqfjrtwvwjsqiabl7zppi5jpfwqhtzceq.ipfs.w3s.link/Thumbnail%20(30).png'
const NO_NFTS_IMAGE = 'https://bafybeifeh7oveq4o6g4vyxb4lvuf36xa3xtr4623rv5vmezyxpc4yjjwvi.ipfs.w3s.link/Group%2048087%20(2).png'
const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql'
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'

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

app.frame('/', (c) => {
  return c.res({
    image: BACKGROUND_IMAGE,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">Check Scary Garys</Button>
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
  let ownedNFTs: NFTMetadata[] = [];

  if (fid) {
    try {
      const connectedAddresses = await getConnectedAddresses(fid.toString());
      if (connectedAddresses.length > 0) {
        const address = connectedAddresses[0]; // Use the first connected address
        console.log('Using Ethereum address:', address);
        ownedNFTs = await getOwnedScaryGarys(address);
        nftAmount = ownedNFTs.length;
        if (nftAmount > 0) {
          backgroundImage = CONFIRMATION_IMAGE; // Use the confirmation image if user owns Scary Garys
        } else {
          backgroundImage = NO_NFTS_IMAGE; // Use the new image for users with 0 Scary Garys
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

  const buttonText = errorMessage || `You own ${nftAmount} Scary Garys!`;

  return c.res({
    image: backgroundImage,
    imageAspectRatio: '1.91:1',
    intents: [
      <Button action="/check">{buttonText}</Button>,
      ...(nftAmount > 0 ? [<Button action="/view-nfts" value="0">View Scary Garys</Button>] : []),
    ],
  })
})

app.frame('/view-nfts', async (c) => {
  const { fid } = c.frameData || {};
  const page = parseInt(c.buttonValue || '0');
  let ownedNFTs: NFTMetadata[] = [];
  let errorMessage = '';

  if (fid) {
    try {
      const connectedAddresses = await getConnectedAddresses(fid.toString());
      if (connectedAddresses.length > 0) {
        const address = connectedAddresses[0];
        ownedNFTs = await getOwnedScaryGarys(address);
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

  const totalNFTs = ownedNFTs.length;
  const nftToShow = ownedNFTs[page] || null;
  const nextPage = (page + 1) % totalNFTs;
  const prevPage = (page - 1 + totalNFTs) % totalNFTs;

  let displayImage = nftToShow ? nftToShow.imageUrl : ERROR_BACKGROUND_IMAGE;
  let displayText = errorMessage || `Showing NFT ${page + 1} of ${totalNFTs}`;

  return c.res({
    image: (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #D6271C 0%, #A22219 50%, #871B14 51%, #6D1510 100%)',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(30, 30, 30, 0.8)',
            padding: '20px',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '90%',
            maxWidth: '800px',
          }}
        >
          <img
            src={displayImage}
            alt="NFT"
            style={{
              width: '400px',
              height: '400px',
              objectFit: 'contain',
              borderRadius: '5px',
            }}
          />
          <p style={{ color: 'white', fontSize: '24px', marginTop: '20px', textAlign: 'center' }}>
            {displayText}
          </p>
        </div>
      </div>
    ),
    imageAspectRatio: '1:1',
    intents: [
      <Button action="/check">Back to check</Button>,
      <Button action="/view-nfts" value={prevPage.toString()}>Previous</Button>,
      <Button action="/view-nfts" value={nextPage.toString()}>Next</Button>,
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)