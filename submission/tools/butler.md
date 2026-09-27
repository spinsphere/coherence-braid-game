# butler (itch.io CLI)

Installed at `~/.local/bin/butler` (v15.31.0, from https://broth.itch.zone/butler/linux-amd64/LATEST/archive/default).

butler cannot create a project page or set the "played in the browser" flag; the page must exist first
(web form). After that, uploads can be scripted:

```sh
butler login                       # opens the browser once; or export BUTLER_API_KEY=... from itch.io/user/settings/api-keys
cd coherence-braid-game && npm run build:itch
butler push out wanderingconsciousness/coherence-braid:html --userversion "$(git rev-parse --short HEAD)"
butler status wanderingconsciousness/coherence-braid
```

The first push creates the `html` channel; on the Edit game page, mark that channel "This file will be
played in the browser" once. Later pushes only upload what changed.
