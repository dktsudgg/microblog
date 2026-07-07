import { createFederation } from "@fedify/fedify";
import { Person, Endpoints } from "@fedify/vocab";
import { getLogger } from "@logtape/logtape";
import { InProcessMessageQueue, MemoryKvStore } from "@fedify/fedify";
import db from "./db.ts";
import type { Actor, User } from "./schema.ts";

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
  
  return new Person({
    id: ctx.getActorUri(identifier),
    preferredUsername: identifier,
    name: user.name,
    inbox: ctx.getInboxUri(identifier),
    endpoints: new Endpoints({
      sharedInbox: ctx.getInboxUri(),
    }),
    url: ctx.getActorUri(identifier),
  });
});

federation.setInboxListeners("/users/{identifier}/inbox", "/inbox");

export default federation;
