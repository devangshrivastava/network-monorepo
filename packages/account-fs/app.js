import { AccountFS } from './fs/account_fs.js';
import { Account } from './agent/account.js'
import { Agent, Runtime, SERVER_RUNTIME, MessageCapability } from './agent/agent.js'
import { createNode, APP } from './fs/helia_node.js';
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
//import { prometheusMetrics } from '@libp2p/prometheus-metrics'

async function createAppNode() {
  const blockstore = new MemoryBlockstore()
  const datastore = new MemoryDatastore()

  // const config = {metrics: prometheusMetrics()}
  const config = {}
  return await createNode(APP, blockstore, datastore, config)
}

const connection = {
  //"LOCAL": {network: "LOCAL"},
  "DEVNET": {network: "DEVNET", sync_host: "http://localhost:3000", dial_prefix: "/ip4/127.0.0.1/tcp/3001/ws/p2p/"},
  "TESTNET": {network: "TESTNET", sync_host: "https://testnet.shovel.company:8001", dial_prefix: "/dns4/testnet.shovel.company/tcp/443/tls/ws/p2p/"}
}

export { Agent, Runtime,AccountFS, connection, createAppNode, SERVER_RUNTIME, MessageCapability }