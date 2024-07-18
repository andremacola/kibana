/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useState } from 'react';

import type { Space } from '../../../common';
import { CustomizeSpace } from '../edit_space/customize_space';
import { SpaceValidator } from '../lib';

interface Props {
  space: Space;
  isReadOnly: boolean;
}

export const ViewSpaceSettings: React.FC<Props> = ({ space }) => {
  const [spaceSettings, setSpaceSettings] = useState<Partial<Space>>(space);
  const [isDirty, setIsDirty] = useState(false); // track if unsaved changes have been made

  const validator = new SpaceValidator();

  const onChangeSpaceSettings = (updatedSpace: Partial<Space>) => {
    setSpaceSettings(updatedSpace);
    setIsDirty(true);
    console.log('value', updatedSpace);
  };

  const onUpdateSpace = () => {
    window.alert('not yet implemented');
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
      {isDirty && (
        <>
          <EuiSpacer />
          <p>
            <EuiText>
              Changes will impact all users in the Space. The page will be reloaded.
            </EuiText>
          </p>
          <p>
            <EuiButton color="primary" fill onClick={onUpdateSpace}>
              Update Space
            </EuiButton>
            <EuiButtonEmpty onClick={onCancel}>Cancel</EuiButtonEmpty>
          </p>
        </>
      )}
    </>
  );
};
