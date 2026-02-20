// @ts-nocheck
import * as __fd_glob_6 from "../content/docs/state-machine.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/security-model.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/quickstart.mdx?collection=docs"
import * as __fd_glob_3 from "../content/docs/index.mdx?collection=docs"
import * as __fd_glob_2 from "../content/docs/heartbeat.mdx?collection=docs"
import * as __fd_glob_1 from "../content/docs/cli-reference.mdx?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, }, {"cli-reference.mdx": __fd_glob_1, "heartbeat.mdx": __fd_glob_2, "index.mdx": __fd_glob_3, "quickstart.mdx": __fd_glob_4, "security-model.mdx": __fd_glob_5, "state-machine.mdx": __fd_glob_6, });