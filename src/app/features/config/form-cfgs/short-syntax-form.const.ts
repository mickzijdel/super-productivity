import { T } from '../../../t.const';
import { ConfigFormSection, ShortSyntaxConfig } from '../global-config.model';

export const SHORT_SYNTAX_FORM_CFG: ConfigFormSection<ShortSyntaxConfig> = {
  title: T.GCF.SHORT_SYNTAX.TITLE,
  key: 'shortSyntax',
  help: T.GCF.SHORT_SYNTAX.HELP,
  items: [
    {
      key: 'isEnableProject',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.SHORT_SYNTAX.IS_ENABLE_PROJECT,
      },
    },
    {
      key: 'isEnableTag',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.SHORT_SYNTAX.IS_ENABLE_TAG,
      },
    },
    {
      key: 'isEnableDue',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.SHORT_SYNTAX.IS_ENABLE_DUE,
      },
    },
    {
      key: 'urlBehavior',
      type: 'select',
      templateOptions: {
        label: 'URL Behavior',
        required: true,
        description:
          'Note: "Replace with page title" may not work for all external URLs due to browser security restrictions (CORS). It will fall back to the final part of the URL.',
        options: [
          { value: 'extract', label: 'Extract to attachments (remove from title)' },
          { value: 'keep-url', label: 'Keep URL in title (clickable)' },
          {
            value: 'keep-title',
            label: 'Replace with page title (clickable)',
          },
        ],
      },
    },
  ],
};
