// @ts-nocheck this file is just a template
import { Hono } from "hono";
import { federation } from "@fedify/hono";
import fedi from "./federation.ts";
import { Layout, SetupForm } from "./views.tsx";

const app = new Hono();
app.use(federation(fedi, () => undefined));

app.get("/", (c) => c.text("Hello, Fedify!"));
app.get("/setup", (c) => 
  c.html(
    <Layout>
      <SetupForm />
    </Layout>
  ),
);

export default app;
