import { createHelia } from 'helia';
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { createLibp2p } from 'libp2p'
import { ping } from '@libp2p/ping'
import { multiaddr } from 'multiaddr'
import * as filters from '@libp2p/websockets/filters'
import { WnfsBlockstore } from './helia_wnfs_blockstore_adaptor.js';
import { PublicDirectory } from "wnfs";
import { CID } from 'multiformats/cid'

var rootDirCID

async function dial(node, peer) {
  const connection = await node.libp2p.dial(multiaddr(peer));
  const latency = await node.libp2p.services.ping.ping(multiaddr(peer))
  console.log("latency:", latency)
};

async function write_data(node, data) {
  const wnfsBlockstore = new WnfsBlockstore(node)
  const dir = new PublicDirectory(new Date());
  var { rootDir } = await dir.mkdir(["pictures", "cats"], new Date(), wnfsBlockstore);

  var content = new TextEncoder().encode(data)

  var { rootDir } = await rootDir.write(
    ["pictures", "cats", "tabby.txt"],
    content,
    new Date(),
    wnfsBlockstore
  );
  console.log("root after write", rootDir)

  rootDirCID = await rootDir.store(wnfsBlockstore)
  window.rootDirCID = rootDirCID
  console.log("rootDirCID:", CID.decode(rootDirCID))
}

async function readFile(node, cid) {
  const wnfsBlockstore = new WnfsBlockstore(node)
  console.log("passed cid: ",CID.parse(cid).bytes)
  console.log("rootDirCID: ",rootDirCID)
  await node.pins.add(CID.parse(cid))
  var rootDir = await PublicDirectory.load(CID.parse(cid).bytes ,wnfsBlockstore)
  console.log("loaded root:", rootDir)
  var fileContent = await rootDir.read(["pictures", "cats", "tabby.txt"], wnfsBlockstore)
  console.log("Files Content:", fileContent);
  return new TextDecoder().decode(fileContent)
}

async function createHeliaNode() {
  // the blockstore is where we store the blocks that make up files
  const blockstore = new MemoryBlockstore()

  // application-specific data lives in the datastore
  const datastore = new MemoryDatastore()

  // libp2p is the networking layer that underpins Helia
  const libp2p = await createLibp2p({
    datastore,
    transports: [webSockets({ filter: filters.all })],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
      denyDialMultiaddr: async (multiAddr) => {
        const str = multiAddr.toString()
        return !str.includes("/ws/") && !str.includes("/wss/") && !str.includes("/webtransport/")
      },
    },
    services: {
      ping: ping({
        maxInboundStreams: 100,
        maxOutboundStreams: 100,
        runOnTransientConnection: false,
      }),
    },
  })

  return await createHelia({
    datastore,
    blockstore,
    libp2p
  })
}

export { createHeliaNode, dial, write_data, readFile, CID }