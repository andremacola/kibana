/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useState } from 'react';

import type { ScopedHistory } from '@kbn/core-application-browser';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';

import { ViewSpaceTabFooter } from './footer';
import { useViewSpaceServices } from './hooks/view_space_context_provider';
import { ViewSpaceEnabledFeatures } from './view_space_features_tab';
import type { Space } from '../../../common';
import { CustomizeSpace } from '../edit_space/customize_space';
import { SolutionView } from '../edit_space/solution_view';
import { SpaceValidator } from '../lib';

interface Props {
  space: Space;
  history: ScopedHistory;
  features: KibanaFeature[];
}

export const ViewSpaceSettings: React.FC<Props> = ({ space, features, history }) => {
  const [spaceSettings, setSpaceSettings] = useState<Partial<Space>>(space);
  const [isDirty, setIsDirty] = useState(false); // track if unsaved changes have been made
  const [isLoading, setIsLoading] = useState(false); // track if user has just clicked the Update button

  const { http, overlays, navigateToUrl, spacesManager } = useViewSpaceServices();

  const { solution } = space;
  const shouldShowFeaturesVisibility = !solution || solution === 'classic';

  const validator = new SpaceValidator();

  useUnsavedChangesPrompt({
    hasUnsavedChanges: isDirty,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl,
    history,
  });

  const onChangeSpaceSettings = (updatedSpace: Partial<Space>) => {
    setSpaceSettings(updatedSpace);
    setIsDirty(true);
  };

  const onUpdateSpace = async () => {
    const { id, name, disabledFeatures } = spaceSettings;
    if (!id) {
      throw new Error(`Can not update space without id field!`);
    }
    if (!name) {
      throw new Error(`Can not update space without name field!`);
    }

    // TODO cancel previous request, if there is one pending
    await spacesManager.updateSpace({
      id,
      name,
      disabledFeatures: disabledFeatures ?? [],
      ...spaceSettings,
    });

    // TODO error handling
    setIsDirty(false);
  };

  const onCancel = () => {
    setSpaceSettings(space);
    setIsDirty(false);
  };

  return (
    <>
      <CustomizeSpace
        space={spaceSettings}
        onChange={onChangeSpaceSettings}
        editingExistingSpace={true}
        validator={validator}
      />

      <EuiSpacer />
      <SolutionView space={spaceSettings} onChange={onChangeSpaceSettings} />

      {shouldShowFeaturesVisibility ? (
        <>
          <EuiSpacer />
          <ViewSpaceEnabledFeatures features={features} history={history} space={space} />
        </>
      ) : null}

      <EuiSpacer />
      <ViewSpaceTabFooter
        isDirty={isDirty}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onCancel={onCancel}
        onUpdateSpace={onUpdateSpace}
      />
    </>
  );
};
