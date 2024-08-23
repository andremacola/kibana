/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import {
  httpServiceMock,
  notificationServiceMock,
  overlayServiceMock,
  scopedHistoryMock,
} from '@kbn/core/public/mocks';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { ViewSpaceContextProvider } from './hooks/view_space_context_provider';
import { ViewSpaceSettings } from './view_space_general_tab';
import type { SolutionView } from '../../../common';
import { spacesManagerMock } from '../../spaces_manager/spaces_manager.mock';
import { getRolesAPIClientMock } from '../roles_api_client.mock';

const space = { id: 'default', name: 'Default', disabledFeatures: [], _reserved: true };
const history = scopedHistoryMock.create();
const getUrlForApp = (appId: string) => appId;
const navigateToUrl = jest.fn();
const spacesManager = spacesManagerMock.create();
const getRolesAPIClient = getRolesAPIClientMock();
const reloadWindow = jest.fn();

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const overlays = overlayServiceMock.createStartContract();

const navigateSpy = jest.spyOn(history, 'push').mockImplementation(() => {});
const updateSpaceSpy = jest
  .spyOn(spacesManager, 'updateSpace')
  .mockImplementation(() => Promise.resolve());
const deleteSpaceSpy = jest
  .spyOn(spacesManager, 'deleteSpace')
  .mockImplementation(() => Promise.resolve());

describe('ViewSpaceSettings', () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    updateSpaceSpy.mockReset();
    deleteSpaceSpy.mockReset();
  });

  const TestComponent: React.FC = ({ children }) => {
    return (
      <IntlProvider locale="en">
        <ViewSpaceContextProvider
          capabilities={{
            navLinks: {},
            management: {},
            catalogue: {},
            spaces: { manage: true },
          }}
          getUrlForApp={getUrlForApp}
          navigateToUrl={navigateToUrl}
          serverBasePath=""
          spacesManager={spacesManager}
          getRolesAPIClient={getRolesAPIClient}
          http={http}
          notifications={notifications}
          overlays={overlays}
        >
          {children}
        </ViewSpaceContextProvider>
      </IntlProvider>
    );
  };

  it('should render controls for initial state of editing a space', () => {
    render(
      <TestComponent>
        <ViewSpaceSettings
          space={space}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    expect(screen.getByTestId('descriptionSpaceText')).toBeInTheDocument();
    expect(screen.getByTestId('spaceLetterInitial')).toBeInTheDocument();
    expect(screen.getByTestId('euiColorPickerAnchor')).toBeInTheDocument();

    expect(screen.queryByTestId('solutionViewSelect')).not.toBeInTheDocument(); // hides solution view when not not set to visible
    expect(screen.queryByTestId('enabled-features-panel')).not.toBeInTheDocument(); // hides navigation features table when not set to visible
  });

  it('shows solution view select when visible', async () => {
    render(
      <TestComponent>
        <ViewSpaceSettings
          space={space}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={true}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    expect(screen.getByTestId('solutionViewSelect')).toBeInTheDocument();
    expect(screen.queryByTestId('enabled-features-panel')).not.toBeInTheDocument(); // hides navigation features table when not set to visible
  });

  it('shows feature visibility controls when allowed', async () => {
    const features = [
      new KibanaFeature({
        id: 'feature-1',
        name: 'feature 1',
        app: [],
        category: DEFAULT_APP_CATEGORIES.kibana,
        privileges: null,
      }),
    ];

    render(
      <TestComponent>
        <ViewSpaceSettings
          space={space}
          history={history}
          features={features}
          allowFeatureVisibility={true}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    expect(screen.getByTestId('enabled-features-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('solutionViewSelect')).not.toBeInTheDocument(); // hides solution view when not not set to visible
  });

  it('allows a space to be updated', async () => {
    const spaceToUpdate = {
      id: 'existing-space',
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      solution: 'es' as SolutionView,
    };

    render(
      <TestComponent>
        <ViewSpaceSettings
          space={spaceToUpdate}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    await act(async () => {
      // update the space name
      const nameInput = screen.getByTestId('addSpaceName');
      fireEvent.change(nameInput, { target: { value: 'Updated Name Of Space' } });

      expect(screen.queryByTestId('userImpactWarning')).not.toBeInTheDocument();
      expect(screen.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();

      const updateButton = await screen.findByTestId('save-space-button'); // appears via re-render
      fireEvent.click(updateButton);

      expect(updateSpaceSpy).toHaveBeenCalledWith({
        ...spaceToUpdate,
        name: 'Updated Name Of Space',
        initials: 'UN',
        color: '#D6BF57',
      });
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('allows space to be deleted', async () => {
    const spaceToDelete = {
      id: 'delete-me-space',
      name: 'Delete Me Space',
      description: 'This is a very nice space... for me to DELETE!',
      color: '#aabbcc',
      initials: 'XX',
      disabledFeatures: [],
    };

    render(
      <TestComponent>
        <ViewSpaceSettings
          space={spaceToDelete}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    await act(async () => {
      const deleteButton = screen.getByTestId('delete-space-button');
      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByTestId('confirmModalConfirmButton'); // click delete confirm
      fireEvent.click(confirmButton);

      expect(deleteSpaceSpy).toHaveBeenCalledWith(spaceToDelete);
    });
  });

  it('sets calculated fields for existing spaces', async () => {
    // The Spaces plugin provides functions to calculate the initials and color of a space if they have not been customized. The new space
    // management page explicitly sets these fields when a new space is created, but it should also handle existing "legacy" spaces that do
    // not already have these fields set.
    const spaceToUpdate = {
      id: 'existing-space',
      name: 'Existing Space',
      description: 'hey an existing space',
      color: undefined,
      initials: undefined,
      imageUrl: undefined,
      disabledFeatures: [],
    };

    render(
      <TestComponent>
        <ViewSpaceSettings
          space={spaceToUpdate}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    await act(async () => {
      // update the space name
      const nameInput = screen.getByTestId('addSpaceName');
      fireEvent.change(nameInput, { target: { value: 'Updated Existing Space' } });

      const updateButton = await screen.findByTestId('save-space-button'); // appears via re-render
      fireEvent.click(updateButton);

      expect(updateSpaceSpy).toHaveBeenCalledWith({
        ...spaceToUpdate,
        name: 'Updated Existing Space',
        color: '#D6BF57',
        initials: 'UE',
      });
    });
  });

  it('warns when updating solution view', async () => {
    const spaceToUpdate = {
      id: 'existing-space',
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      solution: undefined,
    };

    render(
      <TestComponent>
        <ViewSpaceSettings
          space={spaceToUpdate}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={true}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    // update the space solution view
    await act(async () => {
      const solutionViewPicker = screen.getByTestId('solutionViewSelect');
      fireEvent.click(solutionViewPicker);

      const esSolutionOption = await screen.findByTestId('solutionViewEsOption'); // appears via re-render
      fireEvent.click(esSolutionOption);

      expect(screen.getByTestId('userImpactWarning')).toBeInTheDocument();
      expect(screen.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();

      const updateButton = screen.getByTestId('save-space-button');
      fireEvent.click(updateButton);

      expect(screen.getByTestId('confirmModalTitleText')).toBeInTheDocument();

      const confirmButton = screen.getByTestId('confirmModalConfirmButton');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(updateSpaceSpy).toHaveBeenCalledWith({
          ...spaceToUpdate,
          solution: 'es',
        });
      });
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('warns when updating features in the active space', async () => {
    const features = [
      new KibanaFeature({
        id: 'feature-1',
        name: 'feature 1',
        app: [],
        category: DEFAULT_APP_CATEGORIES.kibana,
        privileges: null,
      }),
    ];

    const spaceToUpdate = {
      id: 'existing-space',
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      solution: 'classic' as SolutionView,
    };

    render(
      <TestComponent>
        <ViewSpaceSettings
          space={spaceToUpdate}
          history={history}
          features={features}
          allowFeatureVisibility={true}
          allowSolutionVisibility={true}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    // update the space visible features
    await act(async () => {
      const feature1Checkbox = screen.getByTestId('featureCheckbox_feature-1');
      expect(feature1Checkbox).toBeChecked();

      fireEvent.click(feature1Checkbox);
      await waitFor(() => {
        expect(feature1Checkbox).not.toBeChecked();
      });

      expect(screen.getByTestId('userImpactWarning')).toBeInTheDocument();
      expect(screen.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();

      const updateButton = screen.getByTestId('save-space-button');
      fireEvent.click(updateButton);

      expect(screen.getByTestId('confirmModalTitleText')).toBeInTheDocument();

      const confirmButton = screen.getByTestId('confirmModalConfirmButton');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(updateSpaceSpy).toHaveBeenCalledWith({
          ...spaceToUpdate,
          disabledFeatures: ['feature-1'],
        });
      });
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });
});
