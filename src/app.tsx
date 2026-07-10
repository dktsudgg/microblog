// @ts-nocheck this file is just a template
import { Hono } from "hono";
import { federation } from "@fedify/hono";
import { stringifyEntities } from "stringify-entities";
import fedi from "./federation.ts";
import { Layout, SetupForm, Profile, FollowerList, Home, PostPage, PostList, } from "./views.tsx";
import db from "./db.ts";
import type { User, Actor, Post, } from "./schema.ts";
import { Note, Create } from "@fedify/vocab";

const app = new Hono();
app.use(federation(fedi, () => undefined));

app.get("/", (c) => {
  const user = db.prepare<unknown[], User & Actor>(
    `
    select users.*, actors.*
    from users
    join actors on users.id = actors.user_id
    limit 1
    `,
  ).get();
  if (user == null) return c.redirect("/setup");

  return c.html(
    <Layout>
      <Home user={user} />
    </Layout>,
  );
});

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

  const posts = db.prepare<unknown[], Post & Actor>(
    `
    select actors.*, posts.*
    from posts
    join actors on posts.actor_id = actors.id
    where actors.user_id = ?
    order by posts.created desc
    `,
  ).all(user.user_id);

  return c.html(
    <Layout>
      <Profile
        name={user.name ?? user.username}
        username={user.username}
        handle={handle}
        followers={followers}
      />
      <PostList posts={posts} />
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

app.post("/users/:username/posts", async (c) => {
  const username = c.req.param("username");
  const actor = db.prepare<unknown[], Actor>(
    `
    select actors.*
    from actors
    join users on users.id = actors.user_id
    where users.username = ?
    `,
  ).get(username);
  if (actor == null) return c.redirect("/setup");

  const form = await c.req.formData();
  const content = form.get("content")?.toString();
  if (content == null || content.trim() === "") {
    return c.text("Content is required", 400);
  }

  const ctx = fedi.createContext(c.req.raw, undefined);
  const post: Post | null = db.transaction(() => {
    const post = db.prepare<unknown[], Post>(
      `
      INSERT INTO posts (uri, actor_id, content)
      VALUES ('https://localhost/', ?, ?)
      RETURNING *
      `,
    ).get(actor.id, stringifyEntities(content, { escapeOnly: true }));
    if (post == null) return null;

    const url = ctx.getObjectUri(Note, {
      identifier: username,
      id: post.id.toString(),
    }).href;
    db.prepare("UPDATE posts SET uri = ?, url = ? WHERE id = ?").run(
      url,
      url,
      post.id,
    );
    return post;
  })();
  
  if (post == null) return c.text("Failed to create post", 500);
  const noteArgs = { identifier: username, id: post.id.toString() };
  const note = await ctx.getObject(Note, noteArgs);
  await ctx.sendActivity(
    { identifier: username },
    "followers",
    new Create({
      id: new URL("#activity", note?.id ?? undefined),
      object: note,
      actors: note?.attributionIds,
      tos: note?.toIds,
      ccs: note?.ccIds,
    }),
  );
  return c.redirect(ctx.getObjectUri(Note, noteArgs).href);
});

app.get("/users/:username/posts/:id", (c) => {
  const post = db.prepare<unknown[], Post & Actor & User>(
    `
    select users.*, actors.*, posts.*
    from posts
    join actors on actors.id = posts.actor_id
    join users on users.id = actors.user_id
    where users.username = ? and posts.id = ?
    `,
  ).get(c.req.param("username"), c.req.param("id"));
  if (post == null) return c.notFound();

  // biome-ignore lint/style/noNonNullAssertion: 언제나 하나의 레코드를 반환
  const { followers } = db.prepare<unknown[], { followers: number }>(
    `
    SELECT count(*) AS followers
    FROM follows
    WHERE follows.following_id = ?
    `,
  ).get(post.actor_id)!;

  return c.html(
    <Layout>
      <PostPage
        name={post.name ?? post.username}
        username={post.username}
        handle={post.handle}
        followers={followers}
        post={post}
      />
    </Layout>,
  );
});

export default app;
