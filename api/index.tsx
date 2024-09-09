import { NextApiRequest, NextApiResponse } from 'next';

// Replace with your Airstack API key
const AIRSTACK_API_KEY = 'YOUR_AIRSTACK_API_KEY';

// The NFT contract address we're checking for
const NFT_CONTRACT_ADDRESS = '0xd652Eeb3431f1113312E5c763CE1d0846Aa4d7BC';

// Frame image URLs
const FRAME_IMAGE_URL_OWNER = 'https://example.com/nft-owner-frame.png';
const FRAME_IMAGE_URL_NON_OWNER = 'https://example.com/non-nft-owner-frame.png';

interface TokenBalance {
  formattedAmount: string;
}

interface AirstackResponse {
  data: {
    Wallet: Array<{
      tokenBalances: TokenBalance[];
    }> | null;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { fid } = req.query;

  if (!fid || Array.isArray(fid)) {
    return res.status(400).send('Missing or invalid FID');
  }

  const query = `
    query CheckNFTOwnership($identity: [Identity!]!, $tokenAddress: Address!) {
      Wallet(input: {identity: $identity, blockchain: ethereum}) {
        tokenBalances(input: {filter: {tokenAddress: {_eq: $tokenAddress}, tokenType: {_in: [ERC721, ERC1155]}}}) {
          formattedAmount
        }
      }
    }
  `;

  const variables = {
    identity: [`fc_fid:${fid}`],
    tokenAddress: NFT_CONTRACT_ADDRESS,
  };

  try {
    const response = await fetch('https://api.airstack.xyz/gql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY,
      },
      body: JSON.stringify({ query, variables }),
    });

    const data: AirstackResponse = await response.json();
    const hasNFT = data.data.Wallet?.[0]?.tokenBalances.some(balance => parseFloat(balance.formattedAmount) > 0) ?? false;

    const frameImageUrl = hasNFT ? FRAME_IMAGE_URL_OWNER : FRAME_IMAGE_URL_NON_OWNER;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>NFT Ownership Check</title>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${frameImageUrl}" />
          <meta property="fc:frame:button:1" content="Check Again" />
        </head>
        <body>
          <h1>NFT Ownership Check</h1>
          <p>${hasNFT ? 'You own the NFT!' : 'You do not own the NFT.'}</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error checking NFT ownership:', error);
    res.status(500).send('Error checking NFT ownership');
  }
}