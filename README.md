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
  inbox: URL 'http://localhost:8000/users/dktsudgg/inbox',
  endpoints: Endpoints { sharedInbox: URL 'http://localhost:8000/inbox' }
}
```

## expose to public

```sh
fedify tunnel 8000
```

