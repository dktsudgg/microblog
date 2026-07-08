// @ts-nocheck this file is just a template
import { Hono } from "hono";
import { federation } from "@fedify/hono";
import fedi from "./federation.ts";
import { Layout, SetupForm, Profile, FollowerList, } from "./views.tsx";
import db from "./db.ts";
import type { User, Actor } from "./schema.ts";

const app = new Hono();
app.use(federation(fedi, () => undefined));

app.get("/", (c) => c.text("Hello, Fedify!"));
app.get("/setup", (c) => {
  // 계정이 이미 있는지 검사
  const user = db.prepare<unknown[], User>(
    `
    select * from users
    join actors on (users.id = actors.user_id)
    limit 1
    `
  ).get();
  if (user != null) return c.redirect("/");

  return c.html(
    <Layout>
      <SetupForm />
    </Layout>,
  );
});
app.post("/setup", async (c) => {
  // 계정이 이미 있는지 검사
  const user = db.prepare<unknown[], User>(
    `
    select * from users
    join actors on (users.id = actors.user_id)
    limit 1
    `,
  ).get();
  if (user != null) return c.redirect("/");

  const form = await c.req.formData();
  const username = form.get("username");
  if (typeof username !== "string" || !username.match(/^[a-z0-9_-]{1,50}$/)) {
    return c.redirect("/setup");
  }

  const name = form.get("name");
  if (typeof name !== "string" || name.trim() === "") {
    return c.redirect("/setup");
  }
  const url = new URL(c.req.url);
  const handle = `@${username}@${url.host}`;
  const ctx = fedi.createContext(c.req.raw, undefined);
  db.transaction(() => {
    db.prepare("insert or replace into users (id, username) values (1, ?)").run(
      username,
    );
    db.prepare(
      `
      insert or replace into actors (user_id, uri, handle, name, inbox_url, shared_inbox_url, url)
      values (1, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      ctx.getActorUri(username).href,
      handle,
      name,
      ctx.getInboxUri(username).href,
      ctx.getInboxUri().href,
      ctx.getActorUri(username).href,
    );
  })();

  return c.redirect("/");
});

app.get("/users/:username", async (c) => {
  const user = db.prepare<unknown[], User>(
    `
    select * from users
    join actors on (users.id = actors.user_id)
    where username = ?
    `
  ).get(c.req.param("username"));
  
  if (user == null) return c.notFound();

  // biome-ignore lint/style/noNonNullAssertion: 언제나 하나의 레코드를 반환
  const { followers } = db.prepare<unknown[], { followers: number }>(
    `
    select count(*) as followers
    from follows
    join actors on follows.following_id = actors.id
    where actors.user_id = ?
    `,
  ).get(user.id)!;

  const url = new URL(c.req.url);
  const handle = `@${user.username}@${url.host}`;
  return c.html(
    <Layout>
      <Profile
        name={user.name ?? user.username}
        username={user.username}
        handle={handle}
        followers={followers}
      />
    </Layout>,
  );
});

app.get("/users/:username/followers", async (c) => {
  const followers = db.prepare<unknown[], Actor>(
    `
    select followers.*
    from follows
    join actors as followers on follows.follower_id = followers.id
    join actors as following on follows.following_id = following.id
    join users on users.id = following.user_id
    where users.username = ?
    order by follows.created desc
    `,
  ).all(c.req.param("username"));
  
  return c.html(
    <Layout>
      <FollowerList followers={followers} />
    </Layout>,
  );
});

export default app;
