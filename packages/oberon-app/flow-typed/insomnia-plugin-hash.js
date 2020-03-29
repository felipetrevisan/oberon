// @flow

import type { PluginTemplateTag } from '../app/templating/extensions/index';

declare module 'oberon-plugin-hash' {
  declare module.exports: {
    templateTags: Array<PluginTemplateTag>,
  };
}
