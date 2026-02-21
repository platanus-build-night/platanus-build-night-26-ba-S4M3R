// @ts-nocheck
import * as __fd_glob_26 from "../content/docs/cli/whatsapp-status.mdx?collection=docs"
import * as __fd_glob_25 from "../content/docs/cli/whatsapp-logout.mdx?collection=docs"
import * as __fd_glob_24 from "../content/docs/cli/whatsapp-login.mdx?collection=docs"
import * as __fd_glob_23 from "../content/docs/cli/transcript.mdx?collection=docs"
import * as __fd_glob_22 from "../content/docs/cli/telegram-status.mdx?collection=docs"
import * as __fd_glob_21 from "../content/docs/cli/telegram-logout.mdx?collection=docs"
import * as __fd_glob_20 from "../content/docs/cli/telegram-login.mdx?collection=docs"
import * as __fd_glob_19 from "../content/docs/cli/stop.mdx?collection=docs"
import * as __fd_glob_18 from "../content/docs/cli/status.mdx?collection=docs"
import * as __fd_glob_17 from "../content/docs/cli/start.mdx?collection=docs"
import * as __fd_glob_16 from "../content/docs/cli/send.mdx?collection=docs"
import * as __fd_glob_15 from "../content/docs/cli/resume.mdx?collection=docs"
import * as __fd_glob_14 from "../content/docs/cli/pause.mdx?collection=docs"
import * as __fd_glob_13 from "../content/docs/cli/list.mdx?collection=docs"
import * as __fd_glob_12 from "../content/docs/cli/init.mdx?collection=docs"
import * as __fd_glob_11 from "../content/docs/cli/index.mdx?collection=docs"
import * as __fd_glob_10 from "../content/docs/cli/get.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/cli/create.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/cli/cancel.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/cli/call.mdx?collection=docs"
import * as __fd_glob_6 from "../content/docs/state-machine.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/security-model.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/quickstart.mdx?collection=docs"
import * as __fd_glob_3 from "../content/docs/index.mdx?collection=docs"
import * as __fd_glob_2 from "../content/docs/heartbeat.mdx?collection=docs"
import { default as __fd_glob_1 } from "../content/docs/cli/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, "cli/meta.json": __fd_glob_1, }, {"heartbeat.mdx": __fd_glob_2, "index.mdx": __fd_glob_3, "quickstart.mdx": __fd_glob_4, "security-model.mdx": __fd_glob_5, "state-machine.mdx": __fd_glob_6, "cli/call.mdx": __fd_glob_7, "cli/cancel.mdx": __fd_glob_8, "cli/create.mdx": __fd_glob_9, "cli/get.mdx": __fd_glob_10, "cli/index.mdx": __fd_glob_11, "cli/init.mdx": __fd_glob_12, "cli/list.mdx": __fd_glob_13, "cli/pause.mdx": __fd_glob_14, "cli/resume.mdx": __fd_glob_15, "cli/send.mdx": __fd_glob_16, "cli/start.mdx": __fd_glob_17, "cli/status.mdx": __fd_glob_18, "cli/stop.mdx": __fd_glob_19, "cli/telegram-login.mdx": __fd_glob_20, "cli/telegram-logout.mdx": __fd_glob_21, "cli/telegram-status.mdx": __fd_glob_22, "cli/transcript.mdx": __fd_glob_23, "cli/whatsapp-login.mdx": __fd_glob_24, "cli/whatsapp-logout.mdx": __fd_glob_25, "cli/whatsapp-status.mdx": __fd_glob_26, });