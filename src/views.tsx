import type { FC } from 'hono/jsx';

export const Layout: FC = (props) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="light dark" />
      <title>dktsudgg's Microblog</title>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
      />
    </head>
    <body>
      <main class="container">{props.children}</main>
    </body>
  </html>
);

export const SetupForm: FC = (props) => (
  <>
    <form method="post" action="/setup">
      <fieldset>
        <label>
          Username{" "}
          <input
            type="text"
            name="username"
            required
            maxLength={50}
            pattern="^[a-z0-9_\-]+$"
          />
        </label>
      </fieldset>
      <input type="submit" value="Setup" />
    </form> 
  </>
);

export interface ProfileProps {
  name: string;
  handle: string;
}

export const Profile: FC<ProfileProps> = ({name, handle}) => (
  <>
    <hgroup>
      <h1>{name}</h1>
      <p style="user-select: all;">{handle}</p>
    </hgroup>
  </>
);