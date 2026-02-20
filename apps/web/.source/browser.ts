// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"cli-reference.mdx": () => import("../content/docs/cli-reference.mdx?collection=docs"), "heartbeat.mdx": () => import("../content/docs/heartbeat.mdx?collection=docs"), "index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "quickstart.mdx": () => import("../content/docs/quickstart.mdx?collection=docs"), "security-model.mdx": () => import("../content/docs/security-model.mdx?collection=docs"), "state-machine.mdx": () => import("../content/docs/state-machine.mdx?collection=docs"), }),
};
export default browserCollections;