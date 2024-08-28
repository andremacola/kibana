/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { KibanaFeature, KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type RawKibanaPrivileges } from '@kbn/security-authorization-core';
import type { Role } from '@kbn/security-plugin-types-common';
import { KibanaPrivileges } from '@kbn/security-role-management-model';
import { KibanaPrivilegeTable, PrivilegeFormCalculator } from '@kbn/security-ui-components';

import type { Space } from '../../../../../common';
import type { ViewSpaceServices, ViewSpaceStore } from '../../provider';

type KibanaRolePrivilege = keyof NonNullable<KibanaFeatureConfig['privileges']> | 'custom';

interface PrivilegesRolesFormProps {
  space: Space;
  features: KibanaFeature[];
  closeFlyout: () => void;
  onSaveCompleted: () => void;
  defaultSelected?: Role[];
  storeDispatch: ViewSpaceStore['dispatch'];
  spacesClientsInvocator: ViewSpaceServices['invokeClient'];
}

const createRolesComboBoxOptions = (roles: Role[]): Array<EuiComboBoxOptionOption<Role>> =>
  roles.map((role) => ({
    label: role.name,
    value: role,
  }));

export const PrivilegesRolesForm: FC<PrivilegesRolesFormProps> = (props) => {
  const {
    space,
    onSaveCompleted,
    closeFlyout,
    features,
    defaultSelected = [],
    spacesClientsInvocator,
    storeDispatch,
  } = props;
  const [assigningToRole, setAssigningToRole] = useState(false);
  const [fetchingDataDeps, setFetchingDataDeps] = useState(false);
  const [kibanaPrivileges, setKibanaPrivileges] = useState<RawKibanaPrivileges | null>(null);
  const [spaceUnallocatedRoles, setSpaceUnallocatedRole] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<ReturnType<typeof createRolesComboBoxOptions>>(
    createRolesComboBoxOptions(defaultSelected)
  );
  const [roleCustomizationAnchor, setRoleCustomizationAnchor] = useState(() => {
    // support instance where the form is opened with roles already preselected
    const defaultAnchor = selectedRoles?.[0]?.value;
    const privilegeIndex = defaultAnchor?.kibana.findIndex(({ spaces }) =>
      spaces.includes(space.id!)
    );

    return {
      value: defaultAnchor,
      privilegeIndex: (privilegeIndex || -1) >= 0 ? privilegeIndex : 0,
    };
  });

  const selectedRolesCombinedPrivileges = useMemo(() => {
    const combinedPrivilege = new Set(
      selectedRoles.reduce((result, selectedRole) => {
        let match: KibanaRolePrivilege[] = [];
        for (let i = 0; i < selectedRole.value!.kibana.length; i++) {
          const { spaces, base } = selectedRole.value!.kibana[i];
          if (spaces.includes(space.id!)) {
            match = (base.length ? base : ['custom']) as [KibanaRolePrivilege];
            break;
          }
        }

        return result.concat(match);
      }, [] as KibanaRolePrivilege[])
    );

    return Array.from(combinedPrivilege);
  }, [selectedRoles, space.id]);

  const [roleSpacePrivilege, setRoleSpacePrivilege] = useState<KibanaRolePrivilege>(
    !selectedRoles.length || !selectedRolesCombinedPrivileges.length
      ? 'read'
      : selectedRolesCombinedPrivileges[0]
  );

  useEffect(() => {
    async function fetchRequiredData(spaceId: string) {
      setFetchingDataDeps(true);

      const [systemRoles, _kibanaPrivileges] = await spacesClientsInvocator((clients) =>
        Promise.all([
          clients.rolesClient.getRoles(),
          clients.privilegesClient.getAll({ includeActions: true, respectLicenseLevel: false }),
        ])
      );

      // exclude roles that are already assigned to this space
      setSpaceUnallocatedRole(
        systemRoles.filter(
          (role) =>
            !role.metadata?._reserved &&
            (!role.kibana.length ||
              role.kibana.every((rolePrivileges) => {
                return !(
                  rolePrivileges.spaces.includes(spaceId) || rolePrivileges.spaces.includes('*')
                );
              }))
        )
      );

      setKibanaPrivileges(_kibanaPrivileges);
    }

    fetchRequiredData(space.id!).finally(() => setFetchingDataDeps(false));
  }, [space.id, spacesClientsInvocator]);

  const computeRoleCustomizationAnchor = useCallback(
    (spaceId: string, _selectedRoles: ReturnType<typeof createRolesComboBoxOptions>) => {
      let anchor: typeof roleCustomizationAnchor | null = null;

      for (let i = 0; i < _selectedRoles.length; i++) {
        let role;

        if ((role = _selectedRoles[i].value)) {
          for (let j = 0; j < _selectedRoles[i].value!.kibana.length; j++) {
            let privilegeIterationIndexValue;

            if ((privilegeIterationIndexValue = role.kibana[j])) {
              const { spaces, base } = privilegeIterationIndexValue;
              /*
               * check to see if current role already has a custom privilege, if it does we use that as the starting point for all customizations
               * that will happen to all the other selected roles and exit
               */
              if (spaces.includes(spaceId) && !base.length) {
                anchor = {
                  value: structuredClone(role),
                  privilegeIndex: j,
                };

                break;
              }
            }
          }
        }

        if (anchor) break;

        // provide a fallback anchor if no suitable anchor was discovered, and we have reached the end of selected roles iteration
        if (!anchor && role && i === _selectedRoles.length - 1) {
          const fallbackRole = structuredClone(role);

          const spacePrivilegeIndex = fallbackRole.kibana.findIndex(({ spaces }) =>
            spaces.includes(spaceId)
          );

          anchor = {
            value: fallbackRole,
            privilegeIndex:
              (spacePrivilegeIndex || -1) >= 0
                ? spacePrivilegeIndex
                : (fallbackRole?.kibana?.push?.({
                    spaces: [spaceId],
                    base: [],
                    feature: {},
                  }) || 0) - 1,
          };
        }
      }

      return anchor;
    },
    []
  );

  const onRoleSpacePrivilegeChange = useCallback(
    (spacePrivilege: KibanaRolePrivilege) => {
      if (spacePrivilege === 'custom') {
        const _roleCustomizationAnchor = computeRoleCustomizationAnchor(space.id, selectedRoles);
        if (_roleCustomizationAnchor) setRoleCustomizationAnchor(_roleCustomizationAnchor);
      }

      // persist selected privilege for UI
      setRoleSpacePrivilege(spacePrivilege);
    },
    [computeRoleCustomizationAnchor, selectedRoles, space.id]
  );

  const assignRolesToSpace = useCallback(async () => {
    try {
      setAssigningToRole(true);

      const newPrivileges = {
        base: roleSpacePrivilege === 'custom' ? [] : [roleSpacePrivilege],
        feature:
          roleSpacePrivilege === 'custom'
            ? roleCustomizationAnchor.value?.kibana[roleCustomizationAnchor.privilegeIndex!]
                .feature!
            : {},
      };

      const updatedRoles = structuredClone(selectedRoles).map((selectedRole) => {
        let found = false;

        for (let i = 0; i < selectedRole.value!.kibana.length; i++) {
          const { spaces } = selectedRole.value!.kibana[i];

          if (spaces.includes(space.id!)) {
            if (spaces.length > 1) {
              // space belongs to a collection of other spaces that share the same privileges,
              // so we have to assign the new privilege to apply only to the specific space
              // hence we remove the space from the shared privilege
              spaces.splice(i, 1);
            } else {
              Object.assign(selectedRole.value!.kibana[i], newPrivileges);
              found = true;
            }

            break;
          }
        }

        if (!found) {
          selectedRole.value?.kibana.push(Object.assign({ spaces: [space.id] }, newPrivileges));
        }

        return selectedRole.value!;
      });

      await spacesClientsInvocator((clients) =>
        clients.rolesClient
          .bulkUpdateRoles({ rolesUpdate: updatedRoles })
          .then(setAssigningToRole.bind(null, false))
      );

      storeDispatch({
        type: 'update_roles',
        payload: updatedRoles,
      });

      onSaveCompleted();
    } catch (err) {
      // Handle resulting error
    }
  }, [
    selectedRoles,
    spacesClientsInvocator,
    storeDispatch,
    onSaveCompleted,
    space.id,
    roleSpacePrivilege,
    roleCustomizationAnchor,
  ]);

  const getForm = () => {
    return (
      <EuiForm component="form" fullWidth>
        <EuiFormRow label="Select a role(s)">
          <EuiComboBox
            data-test-subj="roleSelectionComboBox"
            aria-label={i18n.translate('xpack.spaces.management.spaceDetails.roles.selectRoles', {
              defaultMessage: 'Select role to assign to the {spaceName} space',
              values: { spaceName: space.name },
            })}
            isLoading={fetchingDataDeps}
            placeholder={i18n.translate(
              'xpack.spaces.management.spaceDetails.roles.selectRolesPlaceholder',
              {
                defaultMessage: 'Select roles',
              }
            )}
            options={createRolesComboBoxOptions(spaceUnallocatedRoles)}
            selectedOptions={selectedRoles}
            onChange={(value) => setSelectedRoles(value)}
            fullWidth
          />
        </EuiFormRow>
        <>
          {selectedRolesCombinedPrivileges.length > 1 && (
            <EuiFormRow>
              <EuiCallOut
                color="warning"
                iconType="iInCircle"
                data-test-subj="privilege-conflict-callout"
                title={i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.assign.privilegeConflictMsg.title',
                  {
                    defaultMessage: 'Selected roles have different privileges granted',
                  }
                )}
              >
                {i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.assign.privilegeConflictMsg.description',
                  {
                    defaultMessage:
                      'Updating the settings here in a bulk will override current individual settings.',
                  }
                )}
              </EuiCallOut>
            </EuiFormRow>
          )}
        </>
        <EuiFormRow
          helpText={i18n.translate(
            'xpack.spaces.management.spaceDetails.roles.assign.privilegesHelpText',
            {
              defaultMessage:
                'Assign the privilege you wish to grant to all present and future features across this space',
            }
          )}
        >
          <EuiButtonGroup
            data-test-subj="privilegeSelectionSwitch"
            legend="select the privilege for the features enabled in this space"
            isDisabled={!Boolean(selectedRoles.length)}
            options={[
              {
                id: 'all',
                label: i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.assign.privileges.all',
                  {
                    defaultMessage: 'All',
                  }
                ),
              },
              {
                id: 'read',
                label: i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.assign.privileges.read',
                  { defaultMessage: 'Read' }
                ),
              },
              {
                id: 'custom',
                label: i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.assign.privileges.custom',
                  { defaultMessage: 'Customize' }
                ),
              },
            ].map((privilege) => ({
              ...privilege,
              'data-test-subj': `${privilege.id}-privilege-button`,
            }))}
            color="primary"
            idSelected={roleSpacePrivilege}
            onChange={(id) => onRoleSpacePrivilegeChange(id as KibanaRolePrivilege)}
            buttonSize="compressed"
            isFullWidth
          />
        </EuiFormRow>
        {roleSpacePrivilege === 'custom' && (
          <EuiFormRow
            data-test-subj="rolePrivilegeCustomizationForm"
            label={i18n.translate(
              'xpack.spaces.management.spaceDetails.roles.assign.privileges.customizeLabelText',
              { defaultMessage: 'Customize by feature' }
            )}
          >
            <>
              <EuiText size="xs">
                <p>
                  <FormattedMessage
                    id="xpack.spaces.management.spaceDetails.roles.assign.privileges.customizeDescriptionText"
                    defaultMessage="Increase privilege levels per feature basis. Some features might be hidden by the
                    space or affected by a global space privilege"
                  />
                </p>
              </EuiText>
              <EuiSpacer />
              <React.Fragment>
                {!kibanaPrivileges ? (
                  <EuiLoadingSpinner size="l" />
                ) : (
                  <KibanaPrivilegeTable
                    role={roleCustomizationAnchor.value!}
                    privilegeIndex={roleCustomizationAnchor.privilegeIndex}
                    onChange={(featureId, selectedPrivileges) => {
                      // apply selected changes only to customization anchor, this way we delay reconciling the intending privileges
                      // of the selected roles till we decide to commit the changes chosen
                      setRoleCustomizationAnchor(({ value, privilegeIndex }) => {
                        let privilege;

                        if ((privilege = value!.kibana?.[privilegeIndex!])) {
                          privilege.feature[featureId] = selectedPrivileges;
                        }

                        return { value, privilegeIndex };
                      });
                    }}
                    onChangeAll={(privilege) => {
                      // dummy function we wouldn't be using this
                    }}
                    kibanaPrivileges={new KibanaPrivileges(kibanaPrivileges, features)}
                    privilegeCalculator={
                      new PrivilegeFormCalculator(
                        new KibanaPrivileges(kibanaPrivileges, features),
                        roleCustomizationAnchor.value!
                      )
                    }
                    allSpacesSelected={false}
                    canCustomizeSubFeaturePrivileges={false}
                  />
                )}
              </React.Fragment>
            </>
          </EuiFormRow>
        )}
      </EuiForm>
    );
  };

  const getSaveButton = () => {
    return (
      <EuiButton
        fill
        isLoading={assigningToRole}
        onClick={() => assignRolesToSpace()}
        data-test-subj={'createRolesPrivilegeButton'}
      >
        {i18n.translate('xpack.spaces.management.spaceDetails.roles.assignRoleButton', {
          defaultMessage: 'Assign roles',
        })}
      </EuiButton>
    );
  };

  return (
    <React.Fragment>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.spaces.management.spaceDetails.roles.assign.privileges.custom', {
              defaultMessage: 'Assign role to {spaceName}',
              values: { spaceName: space.name },
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.spaces.management.spaceDetails.privilegeForm.heading"
              defaultMessage="Roles will be granted access to the current space according to their default privileges. Use the &lsquo;Customize&rsquo; option to override default privileges."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{getForm()}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              data-test-subj={'cancelRolesPrivilegeButton'}
            >
              {i18n.translate('xpack.spaces.management.spaceDetails.roles.cancelRoleButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{getSaveButton()}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </React.Fragment>
  );
};
