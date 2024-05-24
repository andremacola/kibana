/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableFieldDataColumnType } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { useState } from 'react';

import type { Role } from '@kbn/security-plugin-types-common';

import type { Space } from '../../../common';

interface Props {
  space: Space;
  roles: Role[];
}

export const ViewSpaceAssignedRoles: FC<Props> = ({ space, roles }) => {
  const [showRolesPrivilegeEditor, setShowRolesPrivilegeEditor] = useState(false);
  const getRowProps = (item: Role) => {
    const { name } = item;
    return {
      'data-test-subj': `space-role-row-${name}`,
      onClick: () => {},
    };
  };

  const getCellProps = (item: Role, column: EuiTableFieldDataColumnType<Role>) => {
    const { name } = item;
    const { field } = column;
    return {
      'data-test-subj': `space-role-cell-${name}-${String(field)}`,
      textOnly: true,
    };
  };

  const columns: Array<EuiBasicTableColumn<Role>> = [
    {
      field: 'name',
      name: 'Role',
    },
    {
      field: 'privileges',
      name: 'Privileges',
      render: (_value, record) => {
        return record.kibana.map((kibanaPrivilege) => {
          return kibanaPrivilege.base.join(', ');
        });
      },
    },
    {
      name: 'Actions',
      actions: [
        {
          name: 'Remove from space',
          description: 'Click this action to remove the role privileges from this space.',
          onClick: () => {
            window.alert('Not yet implemented.');
          },
        },
      ],
    },
  ];

  const rolesInUse = roles.filter((role) => {
    const privilegesSum = role.kibana.reduce((sum, privilege) => {
      return sum + privilege.base.length;
    }, 0);
    return privilegesSum > 0;
  });

  if (!rolesInUse) {
    return null;
  }

  return (
    <>
      {showRolesPrivilegeEditor && (
        <PrivilegesRolesForm
          space={space}
          roles={roles}
          closeFlyout={() => {
            setShowRolesPrivilegeEditor(false);
          }}
          onSaveClick={() => {
            window.alert('your wish is granted');
            setShowRolesPrivilegeEditor(false);
          }}
        />
      )}
      <EuiFlexGroup>
        <EuiFlexItem>
          <p>Roles that can access this space. Privileges are managed at the role level.</p>
        </EuiFlexItem>
        <EuiFlexItem grow={false} color="primary">
          <EuiButton
            onClick={() => {
              setShowRolesPrivilegeEditor(true);
            }}
          >
            Assign role
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiBasicTable
        tableCaption="Demo of EuiBasicTable"
        rowHeader="firstName"
        columns={columns}
        items={rolesInUse}
        rowProps={getRowProps}
        cellProps={getCellProps}
      />
    </>
  );
};

interface PrivilegesRolesFormProps {
  space: Space;
  roles: Role[];
  closeFlyout: () => void;
  onSaveClick: () => void;
}

export const PrivilegesRolesForm: FC<PrivilegesRolesFormProps> = (props) => {
  const { space, roles, onSaveClick, closeFlyout } = props;

  const getForm = () => {
    return <textarea>{JSON.stringify(roles)}</textarea>;
  };

  const getSaveButton = () => {
    return (
      <EuiButton onClick={onSaveClick} fill data-test-subj={'createRolesPrivilegeButton'}>
        Assign roles
      </EuiButton>
    );
  };

  return (
    <EuiFlyout onClose={closeFlyout}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Assign role to {space.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <p>
          Roles will be granted access to the current space according to their default privileges.
          Use the &lsquo;Customize&rsquo; option to override default privileges.
        </p>
        {getForm()}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              data-test-subj={'cancelRolesPrivilegeButton'}
            >
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{getSaveButton()}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
