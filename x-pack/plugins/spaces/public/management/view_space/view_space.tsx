/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import type { FC } from 'react';

import type { Capabilities, ScopedHistory } from '@kbn/core/public';
import type { FeaturesPluginStart, KibanaFeature } from '@kbn/features-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { Role } from '@kbn/security-plugin-types-common';

import { TAB_ID_CONTENT, TAB_ID_GENERAL, TAB_ID_ROLES } from './constants';
import { useTabs } from './hooks/use_tabs';
import {
  ViewSpaceContextProvider,
  type ViewSpaceServices,
} from './hooks/view_space_context_provider';
import { addSpaceIdToPath, ENTER_SPACE_PATH, type Space } from '../../../common';
import { getSpaceAvatarComponent } from '../../space_avatar';
import { SpaceSolutionBadge } from '../../space_solution_badge';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

const getSelectedTabId = (canUserViewRoles: boolean, selectedTabId?: string) => {
  // Validation of the selectedTabId routing parameter, default to the Content tab
  return selectedTabId &&
    [TAB_ID_CONTENT, canUserViewRoles ? TAB_ID_ROLES : null].filter(Boolean).includes(selectedTabId)
    ? selectedTabId
    : TAB_ID_GENERAL;
};

interface PageProps extends ViewSpaceServices {
  spaceId?: string;
  history: ScopedHistory;
  selectedTabId?: string;
  capabilities: Capabilities;
  allowFeatureVisibility: boolean;
  solutionNavExperiment?: Promise<boolean>;
  getFeatures: FeaturesPluginStart['getFeatures'];
  onLoadSpace: (space: Space) => void;
}

const handleApiError = (error: Error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  throw error;
};

// FIXME: add eventTracker
export const ViewSpacePage: FC<PageProps> = (props) => {
  const {
    spaceId,
    getFeatures,
    spacesManager,
    history,
    onLoadSpace,
    solutionNavExperiment,
    selectedTabId: _selectedTabId,
    capabilities,
    allowFeatureVisibility,
    getUrlForApp,
    navigateToUrl,
    ...viewSpaceServices
  } = props;

  const [space, setSpace] = useState<Space | null>(null);
  const [userActiveSpace, setUserActiveSpace] = useState<Space | null>(null);
  const [features, setFeatures] = useState<KibanaFeature[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingSpace, setIsLoadingSpace] = useState(true);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSolutionNavEnabled, setIsSolutionNavEnabled] = useState(false);
  const selectedTabId = getSelectedTabId(Boolean(capabilities?.roles?.view), _selectedTabId);
  const [tabs, selectedTabContent] = useTabs({
    space,
    features,
    roles,
    capabilities,
    history,
    currentSelectedTabId: selectedTabId,
    isSolutionNavEnabled,
    allowFeatureVisibility,
  });

  useEffect(() => {
    if (!spaceId) {
      return;
    }

    const getSpaceInfo = async () => {
      const [activeSpace, currentSpace] = await Promise.all([
        spacesManager.getActiveSpace(),
        spacesManager.getSpace(spaceId),
      ]);

      setSpace(currentSpace);
      setUserActiveSpace(activeSpace);
      setIsLoadingSpace(false);
    };

    getSpaceInfo().catch(handleApiError);
  }, [spaceId, spacesManager]);

  useEffect(() => {
    if (!spaceId) {
      return;
    }

    const getRoles = async () => {
      const result = await spacesManager.getRolesForSpace(spaceId);
      setRoles(result);
      setIsLoadingRoles(false);
    };

    // maybe we do not make this call if user can't view roles? 🤔
    getRoles().catch(handleApiError);
  }, [spaceId, spacesManager]);

  useEffect(() => {
    const _getFeatures = async () => {
      const result = await getFeatures();
      setFeatures(result);
      setIsLoadingFeatures(false);
    };
    _getFeatures().catch(handleApiError);
  }, [getFeatures]);

  useEffect(() => {
    if (space) {
      onLoadSpace?.(space);
    }
  }, [onLoadSpace, space]);

  useEffect(() => {
    solutionNavExperiment?.then((isEnabled) => {
      setIsSolutionNavEnabled(isEnabled);
    });
  }, [solutionNavExperiment]);

  if (!space) {
    return null;
  }

  if (isLoadingSpace || isLoadingFeatures || isLoadingRoles) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xxl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const HeaderAvatar = () => {
    return (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazySpaceAvatar space={space} size="xl" />
      </Suspense>
    );
  };

  const { id, solution: spaceSolution } = space;
  const solution = spaceSolution ?? 'classic';
  const shouldShowSolutionBadge = isSolutionNavEnabled || solution !== 'classic';

  return (
    <div data-test-subj="spaces-view-page">
      <ViewSpaceContextProvider
        capabilities={capabilities}
        spacesManager={spacesManager}
        navigateToUrl={navigateToUrl}
        getUrlForApp={getUrlForApp}
        {...viewSpaceServices}
      >
        <EuiText>
          <EuiFlexGroup data-test-subj="spaceDetailsHeader" alignItems="flexStart">
            <EuiFlexItem grow={false}>
              <HeaderAvatar />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiTitle size="l">
                <h1 data-test-subj="spaceTitle">
                  {space.name}
                  {shouldShowSolutionBadge ? (
                    <>
                      {' '}
                      <SpaceSolutionBadge
                        solution={solution}
                        data-test-subj={`space-solution-badge-${solution}`}
                      />
                    </>
                  ) : null}
                  {userActiveSpace?.id === id ? (
                    <>
                      {' '}
                      <EuiBadge color="primary">
                        <FormattedMessage
                          id="xpack.spaces.management.spaceDetails.space.badge.isCurrent"
                          description="Text for a badge shown in the Space details page when the particular Space currently active."
                          defaultMessage="Current"
                        />
                      </EuiBadge>
                    </>
                  ) : null}
                </h1>
              </EuiTitle>

              <EuiText size="s">
                <p>
                  {space.description ?? (
                    <FormattedMessage
                      id="xpack.spaces.management.spaceDetails.space.description"
                      defaultMessage="Organize your saved objects and show related features for creating new content."
                    />
                  )}
                </p>
              </EuiText>
            </EuiFlexItem>
            {userActiveSpace?.id !== id ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="merge"
                  href={addSpaceIdToPath(
                    props.serverBasePath,
                    id,
                    `${ENTER_SPACE_PATH}?next=/app/management/kibana/spaces/edit/${id}`
                  )}
                  data-test-subj="spaceSwitcherButton"
                >
                  <FormattedMessage
                    id="xpack.spaces.management.spaceDetails.space.switchToSpaceButton.label"
                    defaultMessage="Switch to this space"
                  />
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>

          <EuiSpacer />

          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiTabs>
                {tabs.map((tab, index) => (
                  <EuiTab
                    key={index}
                    isSelected={tab.id === selectedTabId}
                    append={tab.append}
                    {...reactRouterNavigate(history, `/edit/${encodeURIComponent(id)}/${tab.id}`)}
                  >
                    {tab.name}
                  </EuiTab>
                ))}
              </EuiTabs>
            </EuiFlexItem>
            <EuiFlexItem>{selectedTabContent ?? null}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiText>
      </ViewSpaceContextProvider>
    </div>
  );
};
