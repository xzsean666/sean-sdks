import { config } from "./config";
import { Web3Pay } from "../web3pay";

const web3pay = new Web3Pay(config);

async function main() {
  const results = await web3pay.collect();
  console.log(results);
}

main();
