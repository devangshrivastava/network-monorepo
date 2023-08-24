import { createHelia } from 'helia';
import { dagCbor } from '@helia/dag-cbor';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const port = 4000;

const server = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.set('views', path.join(__dirname, 'views'));
server.set('view engine', 'ejs');
server.use(express.static(path.join(__dirname, 'public')));

const Heads = {}

server.get("/", async (req, res) => {
  const helia = await createHelia()
  const d = await dagCbor(helia)

  const object1 = { to: 'did:1', from: 'did:2', state:'absent' }
  const myImmutableAddress1 = await d.add(object1)

  const object2 = { to:'did:1', from:'did:2', state:'requested', link: myImmutableAddress1 }
  const myImmutableAddress2 = await d.add(object2)

  const object3 = { to:'did:1', from:'did:2', state:'present', link: myImmutableAddress2 }
  const myImmutableAddress3 = await d.add(object3)

  const retrievedObject3 = await d.get(myImmutableAddress3)
  console.log('Object3:',  retrievedObject3)

  const retrievedObject2 = await d.get(myImmutableAddress2)
  console.log(`Object2: ${retrievedObject2}`)

  const retrievedObject1 = await d.get(myImmutableAddress1)
  console.log(`Object1: ${retrievedObject1}`)
  // { link: CID(baguqeerasor...) }

  console.log(await d.get(retrievedObject3.link))
  console.log(await d.get(retrievedObject2.link))
  // { hello: 'world' }
  res.render('pages/index', {
    data: retrievedObject3,
  })
});

server.listen(port, (err) => {
  if (err) throw err;
  console.log(
    `> Ready`
  );
});

/*
server.post("/registry", (req, res) => {
  registryDID = createRegistry(req.body)
  res.status(200).json({})
})

async createRegistry (body) {
  var name = body.name
  var publickey = body.publickey
  var did = createDID(publicKey)

  return did
}

async addEvent (body) {
  var relID = (body.regID).(body.to).(body.from)
  var cid = findORcreateMerkle(event)
  if cid not found
    create node without link
    put newcid in Heads table with key ad relID
  else
    create node with link as cid
    put newcid in Heads table with key as relID
  end
}

async findORcreateMerkle(event){
  var head = Head[relID]
}

async createDID(key){
  did = generateDIDkey
  return did;
}
*/
