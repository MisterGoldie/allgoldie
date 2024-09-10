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
const BACKGROUND_IMAGE = 'https://bafybeichmmtimnjxzhtwedhxwgjyrusqes7zie4glvbdnx6r7clvvc77ne.ipfs.w3s.link/Thumbnail%20(28).png'
const ERROR_BACKGROUND_IMAGE = 'https://bafybeifa7k5ei2wu6vk464axt2xysxw75fos52w765favoho63fig23sja.ipfs.w3s.link/Group%2048087.png'
const CONFIRMATION_IMAGE = 'https://bafybeiazddyh4ewprsvau6atkrqfjrtwvwjsqiabl7zppi5jpfwqhtzceq.ipfs.w3s.link/Thumbnail%20(30).png'
const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql'
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'

const cache = new NodeCache({ stdTTL: 300 }) // 5 minutes cache

interface NFTMetadata {
  tokenId: string;
  imageUrl: string;
}

async function getConnectedAddressAndNFTs(fid: string): Promise<{ address: string, nfts: NFTMetadata[] }> {
  const cacheKey = `fid_${fid}`
  const cachedData = cache.get(cacheKey)
  if (cachedData) {
    return cachedData as { address: string, nfts: NFTMetadata[] }
  }

  try {
    const query = `
      query($fid: String!, $contractAddress: String!) {
        Socials(input: {filter: {userId: {_eq: $fid}}, blockchain: ethereum}) {
          Social {
            userAddress
            connectedAddresses {
              address
            }
          }
        }
        TokenBalances(
          input: {
            filter: {
              owner: {_eq: $address},
              tokenAddress: {_eq: $contractAddress}
            },
            blockchain: ethereum
          }
        ) {
          TokenBalance {
            tokenId
            tokenAddress
          }
        }
      }
    `

    const variables = { fid, contractAddress: SCARY_GARYS_ADDRESS }

    const response = await axios.post(AIRSTACK_API_URL, 
      { query, variables },
      { headers: { 'Authorization': AIRSTACK_API_KEY }, timeout: 5000 }
    )

    const data = response.data.data
    if (!data || !data.Socials || !data.Socials.Social || !data.TokenBalances) {
      throw new Error('Unexpected response structure from Airstack API')
    }

    const address = data.Socials.Social[0]?.userAddress || data.Socials.Social[0]?.connectedAddresses[0]?.address
    if (!address) {
      throw new Error('No connected Ethereum address found')
    }

    const nfts = data.TokenBalances.TokenBalance.map((token: any) => ({
      tokenId: token.tokenId,
      imageUrl: `https://ipfs.imnotart.com/ipfs/QmRR17CPhVrNkHKQkDg7QBR3Kj1Kt3VHuZQaHUbEbG989i/${token.tokenId}.png`
    }))

    const result = { address, nfts }
    cache.set(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error in getConnectedAddressAndNFTs:', error)
    throw error
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
      const { nfts } = await getConnectedAddressAndNFTs(fid.toString());
      nftAmount = nfts.length;
      if (nftAmount > 0) {
        backgroundImage = CONFIRMATION_IMAGE;
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
  let errorMessage = '';

  if (fid) {
    try {
      const { nfts } = await getConnectedAddressAndNFTs(fid.toString());
      ownedNFTs = nfts;
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
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
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
          }}
        >
          <img
            src={displayImage}
            alt="NFT"
            style={{
              width: '300px',
              height: '300px',
              objectFit: 'contain',
              borderRadius: '5px',
            }}
          />
          <p style={{ color: 'white', fontSize: '24px', marginTop: '20px' }}>
            {displayText}
          </p>
        </div>
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