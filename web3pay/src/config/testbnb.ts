import { rpcs } from "./rpcs";
import { ERC20_ABI } from "./abis/ERC20";
import { batchCallAddress } from "./batchCallAddress";
import { testbnbTOKENS } from "./TOKENS";
import dotenv from "dotenv";

dotenv.config();

export const config = {
  rpcUrl: rpcs.testbnb,
  contracts: {
    batchCallAddress: batchCallAddress.testbnb,
  },
  abis: {
    ERC20_ABI: ERC20_ABI,
  },
  TOKENS: {
    ...testbnbTOKENS,
  },
  privateKey: process.env.PRIVATE_KEY,
  db: { prefix: "testbnb_USDT", url: process.env.DB_URL },
};
