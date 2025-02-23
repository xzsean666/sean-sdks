import { config } from "./config";
import { Web3Pay } from "../web3pay";

const web3pay = new Web3Pay(config);

async function main() {
  const orderId = new Date().getTime().toString();
  const address = await web3pay.createOrder(orderId, 2e18);
  console.log(address);
}

main();
