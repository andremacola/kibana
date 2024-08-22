/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiNotificationBadge } from '@elastic/eui';
import React from 'react';

import type { Capabilities, ScopedHistory } from '@kbn/core/public';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import type { Role } from '@kbn/security-plugin-types-common';
import { withSuspense } from '@kbn/shared-ux-utility';

import { TAB_ID_CONTENT, TAB_ID_GENERAL, TAB_ID_ROLES } from './constants';
import type { Space } from '../../../common';

// FIXME: rename to EditSpaceTab
export interface ViewSpaceTab {
  id: string;
  name: string;
  content: JSX.Element;
  append?: JSX.Element;
  href?: string;
}

export interface GetTabsProps {
  space: Space;
  roles: Role[];
  features: KibanaFeature[];
  history: ScopedHistory;
  capabilities: Capabilities & {
    roles?: { view: boolean; save: boolean };
  };
  allowFeatureVisibility: boolean;
  allowSolutionVisibility: boolean;
}

const SuspenseViewSpaceSettings = withSuspense(
  React.lazy(() =>
    import('./view_space_general_tab').then(({ ViewSpaceSettings }) => ({
      default: ViewSpaceSettings,
    }))
  )
);

const SuspenseViewSpaceAssignedRoles = withSuspense(
  React.lazy(() =>
    import('./view_space_roles').then(({ ViewSpaceAssignedRoles }) => ({
      default: ViewSpaceAssignedRoles,
    }))
  )
);

const SuspenseViewSpaceContent = withSuspense(
  React.lazy(() =>
    import('./view_space_content_tab').then(({ ViewSpaceContent }) => ({
      default: ViewSpaceContent,
    }))
  )
);

export const getTabs = ({
  space,
  features,
  history,
  capabilities,
  roles,
  ...props
}: GetTabsProps): ViewSpaceTab[] => {
  const canUserViewRoles = Boolean(capabilities?.roles?.view);
  const canUserModifyRoles = Boolean(capabilities?.roles?.save);

  const tabsDefinition: ViewSpaceTab[] = [
    {
      id: TAB_ID_GENERAL,
      name: i18n.translate('xpack.spaces.management.spaceDetails.contentTabs.general.heading', {
        defaultMessage: 'General settings',
      }),
      content: (
        <SuspenseViewSpaceSettings space={space} features={features} history={history} {...props} />
      ),
    },
  ];

  if (canUserViewRoles) {
    tabsDefinition.push({
      id: TAB_ID_ROLES,
      name: i18n.translate('xpack.spaces.management.spaceDetails.contentTabs.roles.heading', {
        defaultMessage: 'Assigned roles',
      }),
      append: (
        <EuiNotificationBadge className="eui-alignCenter" color="subdued" size="m">
          {roles.length}
        </EuiNotificationBadge>
      ),
      content: (
        <SuspenseViewSpaceAssignedRoles
          space={space}
          roles={roles}
          features={features}
          isReadOnly={!canUserModifyRoles}
        />
      ),
    });
  }

  tabsDefinition.push({
    id: TAB_ID_CONTENT,
    name: i18n.translate('xpack.spaces.management.spaceDetails.contentTabs.content.heading', {
      defaultMessage: 'Content',
    }),
    content: <SuspenseViewSpaceContent space={space} />,
  });

  return tabsDefinition;
};
