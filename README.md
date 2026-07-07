# dktsudgg's microblog

## migration script

```sh
# create sqlite3 database
sqlite3 microblog.sqlite3 < src/schema.sql

...

# check users
echo "SELECT * FROM users;" | sqlite3 -table microblog.sqlite3
```
