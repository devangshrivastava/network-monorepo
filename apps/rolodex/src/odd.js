async function getProgram(odd) {
  const appInfo = { creator: "Shovel", name: "Rolod" }
  const program = await odd.program({ namespace: appInfo })
    .catch(error => {
      switch (error) {
        case odd.ProgramError.InsecureContext:
          // ODD requires HTTPS
          break;
        case odd.ProgramError.UnsupportedBrowser:
          // Browsers must support IndexedDB
          break;
      }
    })
  return program;
}
async function getSession(program) {
  let session
  if (program.session) {
    session = program.session
  }

  return session;
}

async function signup(odd, username) {
  var program = await getProgram(odd);
  var session = await getSession(program);
  const valid = await program.auth.isUsernameValid(username)
  const available = await program.auth.isUsernameAvailable(username)
  console.log("username available", available)

  if (valid && available) {
    console.log("registering ...", username)
    // Register the user
    const { success } = await program.auth.register({ username: username })
    console.log("success: ", success)
    // Create a session on success
    session = success ? program.auth.session() : null
  }
  console.log("session", await session)

  //create fs
  const fs = await session.fs
  console.log(fs)
  const profileData = JSON.stringify({ "handle": username })
  const contactData = JSON.stringify({ contactList: {} })

  const { RootBranch } = odd.path
  const profileFilePath = odd.path.file(RootBranch.Private, "profile.json")
  const contactFilePath = odd.path.file(RootBranch.Private, "contacts.json")

  await fs.write(profileFilePath, new TextEncoder().encode(profileData))
  await fs.write(contactFilePath, new TextEncoder().encode(contactData))
  await fs.publish()

  const content = new TextDecoder().decode(await fs.read(profileFilePath))
  console.log("profile data :", content)
}

async function getProfile(odd) {
  var program = await getProgram(odd);
  var session = await getSession(program);

  const fs = session.fs;
  const { RootBranch } = odd.path
  const privateFilePath = odd.path.file(RootBranch.Private, "profile.json")

  const content = new TextDecoder().decode(await fs.read(privateFilePath))
  return JSON.parse(content)
}

async function getContacts(odd) {
  var program = await getProgram(odd);
  var session = await getSession(program);
  const fs = session.fs;
  const { RootBranch } = odd.path
  const privateFilePath = odd.path.file(RootBranch.Private, "contacts.json")

  const content = new TextDecoder().decode(await fs.read(privateFilePath))
  return JSON.parse(content)
}

async function updateProfile(odd, name) {
  await updateFile(odd, "profile.json", (content) => {
    content.name = name
    return content
  })
}
async function addContact(odd, newContact) {
  await updateFile(odd, "contacts.json", (content) => {
    var id = crypto.randomUUID()
    content.contactList[id] = newContact
    return content
  })
}

async function editContact(odd, contact) {
  await updateFile(odd, "contacts.json", (content) => {
    var contactList = content.contactList
    var index = contactList.findIndex(c => c.id === contact.id)
    contactList[index] = contact
    return content
  })
}

async function updateFile(odd, file, mutationFunction) {
  var program = await getProgram(odd);
  var session = await getSession(program);

  const fs = session.fs;
  const { RootBranch } = odd.path
  const contactFilePath = odd.path.file(RootBranch.Private, file)

  const content = new TextDecoder().decode(await fs.read(contactFilePath))
  const newContent = mutationFunction(JSON.parse(content))

  await fs.write(contactFilePath, new TextEncoder().encode(JSON.stringify(newContent)))
  await fs.publish()

  const readContent = new TextDecoder().decode(await fs.read(contactFilePath))
  console.log("contacts :", readContent)
  return readContent;
}

async function signout(odd) {
  var program = await getProgram(odd);
  var session = await getSession(program);
  await session.destroy()
}

export { signup, getProfile, updateProfile, getContacts, addContact, editContact, signout};
