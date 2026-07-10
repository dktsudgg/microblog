# dktsudgg's microblog

## prerequisite

```sh
# install fedify cli
npm install -g @fedify/cli

# check whether the cli version is 1.0.0+ or not
fedify --version

# (this project was initialized using this command below)
fedify init microblog
```

## migration script

```sh
# create sqlite3 database
sqlite3 microblog.sqlite3 < src/schema.sql

...

# check users after user creation
echo "SELECT * FROM users;" | sqlite3 -table microblog.sqlite3
echo "SELECT * FROM actors;" | sqlite3 -table microblog.sqlite3
echo "SELECT * FROM keys;" | sqlite3 -table microblog.sqlite3
echo "SELECT * FROM follows;" | sqlite3 -table microblog.sqlite3
echo "SELECT * FROM posts;" | sqlite3 -table microblog.sqlite3
```

## actor dispatcher test

```sh
$ fedify lookup http://localhost:8000/users/dktsudgg
✔ Fetched object: http://localhost:8000/users/dktsudgg
Person {
  id: URL 'http://localhost:8000/users/dktsudgg',
  name: '임규진',
  url: URL 'http://localhost:8000/users/dktsudgg',
  preferredUsername: 'dktsudgg',
  publicKey: CryptographicKey {
    id: URL 'http://localhost:8000/users/dktsudgg#main-key',
    owner: URL 'http://localhost:8000/users/dktsudgg',
    publicKey: CryptoKey {
      type: 'public',
      extractable: true,
      algorithm: {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 4096,
        publicExponent: [Uint8Array],
        hash: [Object]
      },
      usages: [ 'verify' ]
    }
  },
  assertionMethods: [
    Multikey {
      id: URL 'http://localhost:8000/users/dktsudgg#multikey-1',
      controller: URL 'http://localhost:8000/users/dktsudgg',
      publicKey: CryptoKey {
        type: 'public',
        extractable: true,
        algorithm: {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: 4096,
          publicExponent: [Uint8Array],
          hash: [Object]
        },
        usages: [ 'verify' ]
      }
    },
    Multikey {
      id: URL 'http://localhost:8000/users/dktsudgg#multikey-2',
      controller: URL 'http://localhost:8000/users/dktsudgg',
      publicKey: CryptoKey {
        type: 'public',
        extractable: true,
        algorithm: { name: 'Ed25519' },
        usages: [ 'verify' ]
      }
    }
  ],
  inbox: URL 'http://localhost:8000/users/dktsudgg/inbox',
  followers: URL 'http://localhost:8000/users/dktsudgg/followers',
  endpoints: Endpoints { sharedInbox: URL 'http://localhost:8000/inbox' }
}
✔ Successfully fetched the object.

$ fedify lookup http://localhost:8000/users/dktsudgg/followers
✔ Fetched object: http://localhost:8000/users/dktsudgg/followers
OrderedCollection {
  id: URL 'http://localhost:8000/users/dktsudgg/followers',
  totalItems: 1,
  items: [ URL 'https://activitypub.academy/users/ebetia_ladazol' ]
}
✔ Successfully fetched the object.
```

## expose to public

```sh
fedify tunnel 8000
```

