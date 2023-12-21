import { WnfsBlockstore, Rng } from './helia_wnfs_blockstore_adaptor.js'
import { PrivateDirectory, PrivateForest, PrivateNode, AccessKey } from "wnfs";

export class PrivateFS {
  constructor(node) {
    this.store = new WnfsBlockstore(node)
    this.path = ["private"]
  }

  async initalise() {
    const rng = new Rng()
    const initialForest = new PrivateForest(rng)
    const privateDir = new PrivateDirectory(initialForest.emptyName(), new Date(), rng)
  
    var { rootDir, forest } = await privateDir.mkdir(this.path, true, new Date(), initialForest, this.store, rng);

    this.rng = rng
    this.rootDir = rootDir
    this.forest = forest
  }

  async loadForest(accessKey, forestCID) {
    const key = AccessKey.fromBytes(accessKey)
    const forest = await PrivateForest.load(forestCID, this.store)
    console.log("loaded forest:", forest)

    //load private node from PrivateForest using Access key
    var node = await PrivateNode.load(key, forest, this.store)
    console.log("loaded node:", node)

    //load the node as_dir to get the rootDir 
    var rootDir = await node.asDir(forest, this.store)

    this.rng = new Rng()
    this.forest = forest
    this.rootDir = rootDir
  }

  async write(filename, content) {
    let file = this.path.concat(filename)

    if (this.rootDir == null) {
      await this.initalise()
    }

    var { rootDir, forest } = await this.rootDir.write(
      file,
      true,
      new TextEncoder().encode(content),
      new Date(),
      this.forest,
      this.store,
      this.rng
    );
    console.log("root after write", rootDir)
    
    this.rootDir = rootDir
    this.forest = forest

    var [ accessKey, forest ]  = await this.rootDir.store(this.forest, this.store, this.rng)

    this.accessKey = accessKey
    this.forest = forest

    var forestCID = await forest.store(this.store)
    return [this.accessKey.toBytes(), forestCID]
  }

  async read(filename) {
    let file = this.path.concat(filename)

    if (this.rootDir == null) {
      await this.initalise()
    }

    var content = await this.rootDir.read(file, true, this.forest, this.store)
    console.log("Files Content:", content);

    return new TextDecoder().decode(content.result)
  }
}