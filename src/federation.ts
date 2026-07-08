import {
  createFederation,
  exportJwk,
  generateCryptoKeyPair,
  importJwk,
} from "@fedify/fedify";
import { Person, Endpoints } from "@fedify/vocab";
import { getLogger } from "@logtape/logtape";
import { InProcessMessageQueue, MemoryKvStore } from "@fedify/fedify";
import db from "./db.ts";
import type { Actor, User, Key, } from "./schema.ts";

const logger = getLogger("microblog");

const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
  const user = db.prepare<unknown[], User & Actor>(
    `
    select * from users
    join actors on (users.id = actors.user_id)
    where users.username = ?
    `,
  ).get(identifier);
  if (user == null) return null;

  logger.info("Dispatching actor {identifier}", { identifier });

  const keys = await ctx.getActorKeyPairs(identifier);
  return new Person({
    id: ctx.getActorUri(identifier),
    preferredUsername: identifier,
    name: user.name,
    inbox: ctx.getInboxUri(identifier),
    endpoints: new Endpoints({
      sharedInbox: ctx.getInboxUri(),
    }),
    url: ctx.getActorUri(identifier),
    publicKey: keys[0].cryptographicKey,
    assertionMethods: keys.map((k) => k.multikey),
  });
})
.setKeyPairsDispatcher(async (ctx, identifier) => {
  const user = db.prepare<unknown[], User>("select * from users where username = ?").get(identifier);
  if (user == null) return [];

  const rows = db.prepare<unknown[], Key>("select * from keys where keys.user_id = ?").all(user.id);
  const keys = Object.fromEntries(rows.map((row) => [row.type, row])) as Record<Key["type"], Key>;
  
  const pairs: CryptoKeyPair[] = [];
  // 사용자가 지원하는 두 키 형식 (RSASSA-PKCS1-v1_5 및 Ed25519) 각각에 대해
  // 키 쌍을 보유하고 있는지 확인하고, 없으면 생성 후 데이터베이스에 저장:
  for (const keyType of ["RSASSA-PKCS1-v1_5", "Ed25519"] as const) {
    if (keys[keyType] == null) {
      logger.debug(
        "The user {identifier} does not have an {keyType} key; creating one...",
        { identifier, keyType },
      );

      const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);
      db.prepare(
        `
        INSERT INTO keys (user_id, type, private_key, public_key)
        VALUES (?, ?, ?, ?)
        `,
      ).run(
        user.id,
        keyType,
        JSON.stringify(await exportJwk(privateKey)),
        JSON.stringify(await exportJwk(publicKey)),
      );
      pairs.push({ privateKey, publicKey });
    } else {
      pairs.push({
        privateKey: await importJwk(
          JSON.parse(keys[keyType].private_key),
          "private",
        ),
        publicKey: await importJwk(
          JSON.parse(keys[keyType].public_key),
          "public",
        ),
      });
    }
  }
  return pairs;
});

federation.setInboxListeners("/users/{identifier}/inbox", "/inbox");

export default federation;
